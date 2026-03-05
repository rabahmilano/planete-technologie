import prisma from "../config/dbConfig.js";
import { getMaxValue, arrondir } from "../config/utils.js";
import dayjs from "dayjs";

import { body, validationResult } from "express-validator";

export const addCommande = [
  body("dateVente").notEmpty().withMessage("La date est obligatoire"),
  body("produits")
    .isArray({ min: 1 })
    .withMessage("Les produits sont obligatoires"),
  body("produits.*.id_prd")
    .notEmpty()
    .withMessage("L'ID du produit est obligatoire"),
  body("produits.*.quantity")
    .isInt({ gt: 0 })
    .withMessage("La quantité doit être supérieure à 0"),
  body("produits.*.unitPrice")
    .isFloat({ gt: 0 })
    .withMessage("Le prix unitaire doit être supérieur à 0"),
  body("produits.*.totalPrice")
    .isFloat({ gt: 0 })
    .withMessage("Le prix total doit être supérieur à 0"),
  body("totalAmount")
    .isFloat({ gt: 0 })
    .withMessage("Le montant total doit être supérieur à 0"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { dateVente, produits, totalAmount } = req.body;
    try {
      await prisma.$transaction(async (tx) => {
        const id_cde = await getMaxValue("commande", "id_cde", null);

        let totalRefund = 0;

        const commande = await tx.commande.create({
          data: {
            id_cde,
            date_cde: dateVente,
            mnt_cde: totalAmount,
            ligne_commande: {
              createMany: {
                data: produits.map((produit) => ({
                  prd_id: produit.id_prd,
                  qte_cde: produit.quantity,
                  pu_vente: produit.unitPrice,
                })),
              },
            },
          },
        });

        for (const produit of produits) {
          // Décrémentation atomique du Produit global avec vérification
          const updatedProduit = await tx.produit.update({
            where: { id_prd: produit.id_prd },
            data: { qte_dispo: { decrement: produit.quantity } },
          });

          // Blocage immédiat si le stock tombe en négatif
          if (updatedProduit.qte_dispo < 0) {
            throw new Error(`Stock insuffisant pour le produit ID: ${produit.id_prd}. Un autre utilisateur vient peut-être de l'acheter.`);
          }

          let quantityToDeduct = produit.quantity;
          const achats = await tx.colis.findMany({
            where: {
              prd_id: produit.id_prd,
              qte_stock: { gt: 0 },
              date_stock: { not: null },
            },
            orderBy: {
              date_achat: "asc",
            },
          });

          for (const colis of achats) {
            if (quantityToDeduct <= 0) break;

            const availableStock = colis.qte_stock;
            const deduction = Math.min(quantityToDeduct, availableStock);

            const infoColis = await tx.colis.findFirst({
              where: {
                id_colis: colis.id_colis,
              },
              select: {
                compte: {
                  select: {
                    type_cpt: true,
                  },
                },
              },
            });

            // Décrémentation atomique du Colis spécifique (FIFO)
            const updatedColis =await tx.colis.update({
              where: { id_colis: colis.id_colis },
              data: {
                qte_stock: { decrement: deduction },
              },
            });

            // Sécurité anti-conflit sur le colis
            if (updatedColis.qte_stock < 0) {
              throw new Error(`Conflit d'inventaire sur le lot/colis ${colis.id_colis}. Veuillez réessayer la vente.`);
            }

            await tx.ligne_commande_colis.create({
              data: {
                cde_id: commande.id_cde,
                prd_id: produit.id_prd,
                colis_id: colis.id_colis,
                qte: deduction,
              },
            });

            // Gestion des remboursements si le compte de paiement n'est pas de type "COMMUN"
            if (infoColis.compte.type_cpt !== "COMMUN") {
              // 1. On sécurise la multiplication (Quantité * Prix)
              const refundAmount = arrondir(deduction * colis.pu_dzd); // <--- CORRIGÉ
              
              // 2. On sécurise l'addition au total
              totalRefund = arrondir(totalRefund + refundAmount);      // <--- CORRIGÉ
            }

            quantityToDeduct -= deduction;
          }
        }

        // Mettre à jour le compte "Caisse" pour le montant non remboursé
        const cptCaisse = await tx.compte.findFirst({
          where: {
            designation_cpt: "Caisse",
            dev_code: "DZD",
          },
        });

        // 3. On sécurise le calcul final du solde (Total - Remboursements)
        const montantFinalCaisse = arrondir(totalAmount - totalRefund); // <--- CORRIGÉ

        await tx.compte.update({
          where: {
            id_cpt: cptCaisse.id_cpt,
          },
          data: {
            solde_actuel: {
              increment: montantFinalCaisse,
            },
          },
        });

        res.status(200).json({
          message:
            totalRefund > 0
              ? `Commande ajoutée avec succès! Montant à rembourser: ${totalRefund.toFixed(
                  2
                )} DZD pour les comptes non Wise.`
              : "Commande ajoutée avec succès!",
        });
      });
    } catch (error) {
      console.error("Erreur lors de la création de la commande:", error);

      // Si c'est une erreur de stock, on renvoie un code 409 (Conflit)
      if (error.message.includes("Stock insuffisant") || error.message.includes("Conflit d'inventaire")) {
        return res.status(409).json({ message: error.message });
      }

      res.status(500).json({ 
        message: "Une erreur interne est survenue", 
        error: { code: error.code, message: error.message } 
      });
    }
  },
];

// ==========================================
// STATISTIQUES GLOBALES
// ==========================================
export const getCommandesStats = async (req, res) => {
  try {
    const aggregate = await prisma.commande.aggregate({
      _sum: { mnt_cde: true },
      _count: { id_cde: true }
    });

    const totalCA = parseFloat(aggregate._sum.mnt_cde || 0);
    const totalCommandes = aggregate._count.id_cde || 0;
    const panierMoyen = totalCommandes > 0 ? totalCA / totalCommandes : 0;

    res.status(200).json({ totalCA, totalCommandes, panierMoyen });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des statistiques.", details: error.message });
  }
};

// ==========================================
// LISTE AVEC FILTRES ET PAGINATION
// ==========================================
export const getAllCommandes = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const { periode, produit } = req.query;

  // 1. Construction du filtre de Date
  let dateWhereClause = {};
  if (periode && periode !== "all") {
    let startDate;
    if (["1m", "3m", "6m"].includes(periode)) {
      const months = parseInt(periode.replace("m", ""));
      startDate = dayjs().subtract(months, "month").toDate();
    } else if (!isNaN(parseInt(periode, 10))) {
      startDate = dayjs(periode).startOf("year").toDate();
      const endDate = dayjs(periode).endOf("year").toDate();
      dateWhereClause = { gte: startDate, lte: endDate };
    }
    if (startDate && !dateWhereClause.gte) {
      dateWhereClause = { gte: startDate };
    }
  }

  // 2. Construction de la clause WHERE globale
  const whereClause = {
    ...(Object.keys(dateWhereClause).length > 0 && { date_cde: dateWhereClause }),
    ...(produit && produit !== "all" && {
      ligne_commande: {
        some: { prd_id: parseInt(produit) }
      }
    })
  };

  try {
    const [total, commandes] = await Promise.all([
      prisma.commande.count({ where: whereClause }),
      prisma.commande.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [
          { date_cde: "desc" }, // 1er Tri : Date la plus récente
          { id_cde: "desc" }    // 2ème Tri : ID le plus grand pour le même jour
        ],
        include: {
          ligne_commande: {
            include: {
              produit: { select: { designation_prd: true } }
            }
          }
        }
      })
    ]);

    const data = commandes.map(c => {
      // Calcul du nombre total d'unités physiques dans cette commande
      const totalUnites = c.ligne_commande.reduce((acc, l) => acc + parseInt(l.qte_cde || 0), 0);

      return {
        id_cde: c.id_cde,
        date_cde: c.date_cde,
        mnt_cde: c.mnt_cde,
        lignes: c.ligne_commande.map(l => ({
          prd_id: l.prd_id,
          designation: l.produit.designation_prd,
          qte: l.qte_cde,
          pu_vente: l.pu_vente,
          total_ligne: parseFloat(l.qte_cde) * parseFloat(l.pu_vente)
        })),
        totalProduits: c.ligne_commande.length, // Nombre d'articles distincts
        totalUnites: totalUnites // Quantité physique totale
      };
    });

    res.status(200).json({ total, data, page, limit });
  } catch (error) {
    res.status(500).json({ error: { message: "Erreur lors de la récupération des commandes.", details: error.message } });
  }
};

export const deleteCommande = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Vérification
      const commande = await tx.commande.findUnique({
        where: { id_cde: parseInt(id) },
        include: { ligne_commande: true }
      });
      if (!commande) throw new Error("NOT_FOUND");

      // 2. Récupération de la traçabilité des colis
      const lcc = await tx.ligne_commande_colis.findMany({
        where: { cde_id: parseInt(id) },
        include: { colis: { include: { compte: true } } }
      });

      let totalRefund = 0;

      // 3. Restauration des Colis et calcul de la part Caisse (Inversion de addCommande)
      for (const ligne of lcc) {
        await tx.colis.update({
          where: { id_colis: ligne.colis_id },
          data: { qte_stock: { increment: ligne.qte } }
        });

        if (ligne.colis.compte.type_cpt !== "COMMUN") {
          const refundAmount = arrondir(ligne.qte * ligne.colis.pu_dzd);
          totalRefund = arrondir(totalRefund + refundAmount);
        }
      }

      // 4. Restauration du Stock Global Produit
      for (const ligne of commande.ligne_commande) {
        await tx.produit.update({
          where: { id_prd: ligne.prd_id },
          data: { qte_dispo: { increment: ligne.qte_cde } }
        });
      }

      // 5. Déduction de la Caisse
      const cptCaisse = await tx.compte.findFirst({
        where: { designation_cpt: "Caisse", dev_code: "DZD" }
      });
      
      if (cptCaisse) {
        const montantFinalCaisse = arrondir(parseFloat(commande.mnt_cde) - totalRefund);
        await tx.compte.update({
          where: { id_cpt: cptCaisse.id_cpt },
          data: { solde_actuel: { decrement: montantFinalCaisse } }
        });
      }

      // 6. Suppression en cascade (Enfants vers Parent)
      await tx.ligne_commande_colis.deleteMany({ where: { cde_id: parseInt(id) } });
      await tx.ligne_commande.deleteMany({ where: { cde_id: parseInt(id) } });
      await tx.commande.delete({ where: { id_cde: parseInt(id) } });
    });

    res.status(200).json({ message: "Commande annulée. Stock restauré et Caisse mise à jour." });
  } catch (error) {
    if (error.message === "NOT_FOUND") return res.status(404).json({ error: { message: "Commande introuvable." } });
    res.status(500).json({ error: { message: "Erreur lors de l'annulation.", details: error.message } });
  }
};