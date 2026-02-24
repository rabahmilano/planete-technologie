import prisma from "../config/dbConfig.js";
import { getMaxValue, arrondir } from "../config/utils.js";

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
