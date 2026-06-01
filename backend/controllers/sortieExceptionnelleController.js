import { PrismaClient } from "@prisma/client";
import { body, validationResult } from "express-validator";
import { getMaxValue, arrondir } from "../config/utils.js";

const prisma = new PrismaClient();

export const declarerSortie = [
  body("prd_id")
    .isInt()
    .notEmpty()
    .withMessage("L'ID du produit est obligatoire"),
  body("qte")
    .isInt({ gt: 0 })
    .notEmpty()
    .withMessage("La quantité doit être supérieure à 0"),
  body("date_sortie")
    .isISO8601()
    .notEmpty()
    .withMessage("La date de sortie est obligatoire et doit être valide"),
  body("motif")
    .isString()
    .notEmpty()
    .isIn([
      "UTILISATION_PERSONNELLE",
      "PERTE_LIVRAISON",
      "CASSE_DEFECTUEUX",
      "VENTE_A_CREDIT",
      "SAISIE_DOUANE",
    ])
    .withMessage("Le motif est invalide ou manquant"),
  body("mnt_attendu")
    .optional({ checkFalsy: true })
    .isFloat({ gt: 0 })
    .withMessage("Le montant attendu doit être valide"),
  body("observation").optional({ checkFalsy: true }).isString(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { prd_id, qte, date_sortie, motif, mnt_attendu, observation } =
      req.body;

    try {
      const nouvelleSortie = await prisma.$transaction(async (tx) => {
        const updatedProduit = await tx.produit.update({
          where: { id_prd: parseInt(prd_id) },
          data: { qte_dispo: { decrement: parseInt(qte) } },
        });

        if (updatedProduit.qte_dispo < 0) {
          throw new Error(
            `Stock global insuffisant pour le produit ID: ${prd_id}.`,
          );
        }

        let quantityToDeduct = parseInt(qte);
        const lignesSortieData = [];

        const colisDisponibles = await tx.colis.findMany({
          where: {
            prd_id: parseInt(prd_id),
            qte_stock: { gt: 0 },
            date_stock: { not: null },
          },
          orderBy: [{ date_achat: "asc" }, { date_stock: "asc" }],
        });

        for (const colis of colisDisponibles) {
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

          lignesSortieData.push({
            colis_id: colis.id_colis,
            qte: deduction,
          });

          quantityToDeduct -= deduction;
        }

        if (quantityToDeduct > 0) {
          throw new Error(
            `Incohérence des stocks pour le produit ID: ${prd_id}. Les lots détaillés ne suffisent pas.`,
          );
        }

        let statutFinal = "NON_APPLICABLE";
        let montantFinal = mnt_attendu ? parseFloat(mnt_attendu) : null;

        if (motif === "UTILISATION_PERSONNELLE") {
          montantFinal = null;
        } else if (montantFinal > 0) {
          statutFinal = "EN_ATTENTE";
        }

        const sortie = await tx.sortie_exceptionnelle.create({
          data: {
            prd_id: parseInt(prd_id),
            qte_totale: parseInt(qte),
            date_sortie: new Date(date_sortie),
            motif: motif,
            statut_remb: statutFinal,
            mnt_attendu: montantFinal,
            observation: observation || null,
            lignes_colis: {
              create: lignesSortieData,
            },
          },
          include: {
            lignes_colis: true,
          },
        });

        return sortie;
      });

      res.status(201).json(nouvelleSortie);
    } catch (error) {
      if (
        error.message.includes("insuffisant") ||
        error.message.includes("Conflit") ||
        error.message.includes("Incohérence")
      ) {
        return res.status(409).json({ message: error.message });
      }
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const rembourserSortie = [
  body("cpt_id")
    .isInt()
    .notEmpty()
    .withMessage("Le compte de destination est obligatoire"),
  body("date_remb")
    .isISO8601()
    .notEmpty()
    .withMessage("La date de remboursement doit être valide"),
  body("montant_encaisse")
    .isFloat({ gt: 0 })
    .notEmpty()
    .withMessage("Le montant encaissé est obligatoire et doit être > 0"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const id_sortie = parseInt(req.params.id);
    const { cpt_id, date_remb, montant_encaisse } = req.body;

    try {
      const resultat = await prisma.$transaction(async (tx) => {
        const sortie = await tx.sortie_exceptionnelle.findUnique({
          where: { id_sortie: id_sortie },
        });

        if (!sortie) throw new Error("Sortie introuvable");
        if (sortie.statut_remb === "REMBOURSE")
          throw new Error("Cette sortie a déjà été remboursée");
        if (sortie.statut_remb === "NON_APPLICABLE")
          throw new Error("Cette sortie n'est pas éligible à un remboursement");

        const montantReel = arrondir(parseFloat(montant_encaisse));

        const compte = await tx.compte.findUnique({
          where: { id_cpt: parseInt(cpt_id) },
        });
        if (!compte) throw new Error("Compte introuvable");

        const id_op_crd = await getMaxValue("crediter", "id_op_crd", null);

        const operation = await tx.crediter.create({
          data: {
            id_op_crd: id_op_crd,
            cpt_id: parseInt(cpt_id),
            date_op: new Date(date_remb),
            montant_op: montantReel,
            taux_change: compte.taux_change_actuel,
          },
        });

        await tx.compte.update({
          where: { id_cpt: parseInt(cpt_id) },
          data: { solde_actuel: { increment: montantReel } },
        });

        const sortieMaj = await tx.sortie_exceptionnelle.update({
          where: { id_sortie: id_sortie },
          data: {
            statut_remb: "REMBOURSE",
            op_crd_id: id_op_crd,
          },
        });

        return { sortie: sortieMaj, operation };
      });

      res.status(200).json(resultat);
    } catch (error) {
      if (
        error.message.includes("déjà") ||
        error.message.includes("éligible")
      ) {
        return res.status(409).json({ message: error.message });
      }
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const getSorties = async (req, res) => {
  try {
    const { page, limit, motif, statut, startDate, endDate } = req.query;

    const where = {};

    if (motif) where.motif = motif;
    if (statut) where.statut_remb = statut;
    if (startDate || endDate) {
      where.date_sortie = {};
      if (startDate) where.date_sortie.gte = new Date(startDate);
      if (endDate) where.date_sortie.lte = new Date(endDate);
    }

    const queryOptions = {
      where,
      orderBy: { date_sortie: "desc" },
      include: {
        produit: { select: { designation_prd: true } },
        lignes_colis: {
          include: { colis: { select: { pu_dzd: true, mnt_tot_dzd: true } } },
        },
        operation_credit: {
          select: {
            date_op: true,
            montant_op: true,
            compte: { select: { designation_cpt: true } },
          },
        },
      },
    };

    if (limit) {
      queryOptions.take = parseInt(limit);
      if (page) {
        queryOptions.skip = (parseInt(page) - 1) * parseInt(limit);
      }
    }

    const [sorties, totalCount] = await prisma.$transaction([
      prisma.sortie_exceptionnelle.findMany(queryOptions),
      prisma.sortie_exceptionnelle.count({ where }),
    ]);

    res.status(200).json({
      data: sorties,
      meta: {
        total: totalCount,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : totalCount,
      },
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};
