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
          // Décrémentation atomique pour empêcher les conflits si plusieurs clients achètent simultanément
          const updatedProduit = await tx.produit.update({
            where: { id_prd: produit.id_prd },
            data: { qte_dispo: { decrement: produit.quantity } },
          });

          if (updatedProduit.qte_dispo < 0) {
            throw new Error(
              `Stock global insuffisant pour le produit ID: ${produit.id_prd}.`,
            );
          }

          let quantityToDeduct = produit.quantity;

          // Stratégie FIFO (First In, First Out) avec départage par date d'entrée physique en stock
          const achats = await tx.colis.findMany({
            where: {
              prd_id: produit.id_prd,
              qte_stock: { gt: 0 },
              date_stock: { not: null }, // Règle métier : interdiction de vendre un colis en transit
            },
            orderBy: [{ date_achat: "asc" }, { date_stock: "asc" }],
            include: {
              compte: { select: { type_cpt: true } },
            },
          });

          for (const colis of achats) {
            if (quantityToDeduct <= 0) break;

            const deduction = Math.min(quantityToDeduct, colis.qte_stock);

            const updatedColis = await tx.colis.update({
              where: { id_colis: colis.id_colis },
              data: { qte_stock: { decrement: deduction } },
            });

            if (updatedColis.qte_stock < 0) {
              throw new Error(
                `Conflit d'inventaire détecté sur le lot ${colis.id_colis}.`,
              );
            }

            await tx.ligne_commande_colis.create({
              data: {
                cde_id: commande.id_cde,
                prd_id: produit.id_prd,
                colis_id: colis.id_colis,
                qte: deduction,
              },
            });

            // Isoler les fonds à rembourser pour les achats effectués avec des comptes personnels (ex: Wise)
            if (colis.compte.type_cpt !== "COMMUN") {
              const refundAmount = arrondir(deduction * colis.pu_dzd);
              totalRefund = arrondir(totalRefund + refundAmount);
            }

            quantityToDeduct -= deduction;
          }

          // Règle de sécurité : Vérifier la cohérence entre le stock global théorique et les lots réels
          if (quantityToDeduct > 0) {
            throw new Error(
              `Incohérence des stocks pour le produit ID: ${produit.id_prd}. Les lots détaillés ne suffisent pas.`,
            );
          }
        }

        const cptCaisse = await tx.compte.findFirst({
          where: {
            designation_cpt: "Caisse",
            dev_code: "DZD",
          },
        });

        if (!cptCaisse) {
          throw new Error(
            "Opération annulée : Le compte 'Caisse' (DZD) est introuvable.",
          );
        }

        // Encaissement de la marge brute (Montant client - Fonds à restituer aux comptes personnels)
        const montantFinalCaisse = arrondir(totalAmount - totalRefund);

        await tx.compte.update({
          where: { id_cpt: cptCaisse.id_cpt },
          data: {
            solde_actuel: { increment: montantFinalCaisse },
          },
        });

        res.status(200).json({
          message:
            totalRefund > 0
              ? `Commande ajoutée avec succès! Montant à rembourser: ${totalRefund.toFixed(2)} DZD pour les comptes non Wise.`
              : "Commande ajoutée avec succès!",
        });
      });
    } catch (error) {
      console.error("Erreur lors de la création de la commande:", error);

      if (
        error.message.includes("insuffisant") ||
        error.message.includes("Conflit") ||
        error.message.includes("Incohérence")
      ) {
        return res.status(409).json({ message: error.message });
      }

      res.status(500).json({
        message: "Une erreur interne est survenue",
        error: { code: error.code, message: error.message },
      });
    }
  },
];

const buildWhereClause = (query) => {
  const { periode, produit } = query;
  let dateWhereClause = {};

  if (periode && periode !== "all") {
    if (["1m", "3m", "6m"].includes(periode)) {
      const months = parseInt(periode.replace("m", ""));
      dateWhereClause = { gte: dayjs().subtract(months, "month").toDate() };
    } else if (!isNaN(parseInt(periode, 10))) {
      dateWhereClause = {
        gte: dayjs(periode).startOf("year").toDate(),
        lte: dayjs(periode).endOf("year").toDate(),
      };
    }
  }

  return {
    ...(Object.keys(dateWhereClause).length > 0 && {
      date_cde: dateWhereClause,
    }),
    ...(produit &&
      produit !== "all" && {
        ligne_commande: {
          some: { prd_id: parseInt(produit) },
        },
      }),
  };
};

export const getCommandesStats = async (req, res) => {
  try {
    const whereClause = buildWhereClause(req.query);

    const [filteredAggregate, globalAggregate, filteredLignes, globalLignes] =
      await Promise.all([
        prisma.commande.aggregate({
          where: whereClause,
          _sum: { mnt_cde: true },
          _count: { id_cde: true },
        }),
        prisma.commande.aggregate({
          _sum: { mnt_cde: true },
          _count: { id_cde: true },
        }),
        prisma.ligne_commande.aggregate({
          where: { commande: whereClause },
          _sum: { qte_cde: true },
        }),
        prisma.ligne_commande.aggregate({
          _sum: { qte_cde: true },
        }),
      ]);

    const totalCA = parseFloat(filteredAggregate._sum.mnt_cde || 0);
    const totalCommandes = filteredAggregate._count.id_cde || 0;
    const panierMoyen = totalCommandes > 0 ? totalCA / totalCommandes : 0;
    const totalArticles = filteredLignes._sum.qte_cde || 0;

    const globalCA = parseFloat(globalAggregate._sum.mnt_cde || 0);
    const globalCommandes = globalAggregate._count.id_cde || 0;
    const globalArticles = globalLignes._sum.qte_cde || 0;

    res.status(200).json({
      totalCA,
      totalCommandes,
      panierMoyen,
      totalArticles,
      globalCA,
      globalCommandes,
      globalArticles,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération des statistiques.",
      details: error.message,
    });
  }
};

export const getAllCommandes = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const whereClause = buildWhereClause(req.query);

  try {
    const [total, commandes] = await Promise.all([
      prisma.commande.count({ where: whereClause }),
      prisma.commande.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [{ date_cde: "desc" }, { id_cde: "desc" }],
        include: {
          ligne_commande: {
            include: {
              produit: { select: { designation_prd: true } },
            },
          },
        },
      }),
    ]);

    const data = commandes.map((c) => {
      const totalUnites = c.ligne_commande.reduce(
        (acc, l) => acc + parseInt(l.qte_cde || 0),
        0,
      );

      return {
        id_cde: c.id_cde,
        date_cde: c.date_cde,
        mnt_cde: c.mnt_cde,
        lignes: c.ligne_commande.map((l) => ({
          prd_id: l.prd_id,
          designation: l.produit?.designation_prd || "Produit supprimé",
          qte: l.qte_cde,
          pu_vente: l.pu_vente,
          total_ligne: parseFloat(l.qte_cde) * parseFloat(l.pu_vente),
        })),
        totalProduits: c.ligne_commande.length,
        totalUnites: totalUnites,
      };
    });

    res.status(200).json({ total, data, page, limit });
  } catch (error) {
    res.status(500).json({
      error: {
        message: "Erreur lors de la récupération des commandes.",
        details: error.message,
      },
    });
  }
};

export const deleteCommande = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.$transaction(async (tx) => {
      const commande = await tx.commande.findUnique({
        where: { id_cde: parseInt(id) },
        include: { ligne_commande: true },
      });

      if (!commande) {
        throw new Error("NOT_FOUND");
      }

      const cptCaisse = await tx.compte.findFirst({
        where: { designation_cpt: "Caisse", dev_code: "DZD" },
      });

      if (!cptCaisse) {
        throw new Error("CAISSE_NOT_FOUND");
      }

      const lcc = await tx.ligne_commande_colis.findMany({
        where: { cde_id: parseInt(id) },
        include: { colis: { include: { compte: true } } },
      });

      let totalRefund = 0;

      for (const ligne of lcc) {
        await tx.colis.update({
          where: { id_colis: ligne.colis_id },
          data: { qte_stock: { increment: ligne.qte } },
        });

        if (ligne.colis.compte.type_cpt !== "COMMUN") {
          const refundAmount = arrondir(ligne.qte * ligne.colis.pu_dzd);
          totalRefund = arrondir(totalRefund + refundAmount);
        }
      }

      for (const ligne of commande.ligne_commande) {
        await tx.produit.update({
          where: { id_prd: ligne.prd_id },
          data: { qte_dispo: { increment: ligne.qte_cde } },
        });
      }

      const montantFinalCaisse = arrondir(
        parseFloat(commande.mnt_cde) - totalRefund,
      );

      await tx.compte.update({
        where: { id_cpt: cptCaisse.id_cpt },
        data: { solde_actuel: { decrement: montantFinalCaisse } },
      });

      await tx.ligne_commande_colis.deleteMany({
        where: { cde_id: parseInt(id) },
      });
      await tx.ligne_commande.deleteMany({
        where: { cde_id: parseInt(id) },
      });
      await tx.commande.delete({
        where: { id_cde: parseInt(id) },
      });
    });

    res.status(200).json({
      message: "Commande annulée. Stock restauré et Caisse mise à jour.",
    });
  } catch (error) {
    if (error.message === "NOT_FOUND") {
      return res
        .status(404)
        .json({ error: { message: "Commande introuvable." } });
    }

    if (error.message === "CAISSE_NOT_FOUND") {
      return res.status(409).json({
        error: {
          message:
            "Annulation impossible : Le compte 'Caisse' est introuvable.",
        },
      });
    }

    res.status(500).json({
      error: {
        message: "Erreur lors de l'annulation.",
        details: error.message,
      },
    });
  }
};
