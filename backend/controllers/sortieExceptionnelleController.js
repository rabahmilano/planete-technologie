import { PrismaClient } from "@prisma/client";
import { body, validationResult } from "express-validator";
import { getMaxValue } from "../config/utils.js";

const prisma = new PrismaClient();

// ==========================================
// 1. DÉCLARER UNE SORTIE EXCEPTIONNELLE
// ==========================================
export const declarerSortie = [
  body("prd_id").isInt().withMessage("Le produit est obligatoire"),
  body("colis_id").isInt().withMessage("Le colis est obligatoire"),
  body("qte").isInt({ gt: 0 }).withMessage("La quantité doit être > 0"),
  body("date_sortie").isISO8601().withMessage("Date invalide"),
  body("motif").isString().notEmpty().withMessage("Le motif est obligatoire"),
  body("mnt_attendu").optional().isDecimal(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      prd_id,
      colis_id,
      qte,
      date_sortie,
      motif,
      mnt_attendu,
      observation,
    } = req.body;

    try {
      const nouvelleSortie = await prisma.$transaction(async (tx) => {
        // 1. Vérifier si le produit et le colis existent
        const produit = await tx.produit.findUnique({
          where: { id_prd: parseInt(prd_id) },
        });
        const colis = await tx.colis.findUnique({
          where: { id_colis: parseInt(colis_id) },
        });

        if (!produit || !colis) {
          throw new Error("Produit ou Colis introuvable");
        }
        if (
          produit.qte_dispo < parseInt(qte) ||
          colis.qte_stock < parseInt(qte)
        ) {
          throw new Error("Quantité en stock insuffisante pour cette sortie");
        }

        // 2. Définir le statut par défaut en fonction du motif
        let statut = "NON_APPLICABLE";
        if (
          motif === "PERTE_LIVRAISON" ||
          motif === "CASSE_DEFECTUEUX" ||
          motif === "VENTE_A_CREDIT"
        ) {
          statut = "EN_ATTENTE";
        }

        // 3. Créer la ligne de sortie (id_sortie est en autoincrement dans le schéma)
        const sortie = await tx.sortie_exceptionnelle.create({
          data: {
            prd_id: parseInt(prd_id),
            colis_id: parseInt(colis_id),
            qte: parseInt(qte),
            date_sortie: new Date(date_sortie),
            motif: motif,
            statut_remb: statut,
            mnt_attendu: mnt_attendu ? parseFloat(mnt_attendu) : null,
            observation: observation || null,
          },
        });

        // 4. Décrémenter les stocks (Logique FIFO stricte respectée)
        await tx.produit.update({
          where: { id_prd: parseInt(prd_id) },
          data: { qte_dispo: { decrement: parseInt(qte) } },
        });

        await tx.colis.update({
          where: { id_colis: parseInt(colis_id) },
          data: { qte_stock: { decrement: parseInt(qte) } },
        });

        return sortie;
      });

      res.status(201).json(nouvelleSortie);
    } catch (error) {
      res.status(500).json({ error: { message: error.message } });
    }
  },
];

// ==========================================
// 2. MARQUER COMME REMBOURSÉ (Encaissement)
// ==========================================
export const rembourserSortie = [
  body("cpt_id")
    .isInt()
    .withMessage("Le compte de destination est obligatoire"),
  body("date_remb").isISO8601().withMessage("Date de remboursement invalide"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const id_sortie = parseInt(req.params.id);
    const { cpt_id, date_remb } = req.body;

    try {
      const resultat = await prisma.$transaction(async (tx) => {
        // 1. Récupérer la sortie
        const sortie = await tx.sortie_exceptionnelle.findUnique({
          where: { id_sortie: id_sortie },
        });

        if (!sortie) throw new Error("Sortie introuvable");
        if (sortie.statut_remb === "REMBOURSE")
          throw new Error("Cette sortie a déjà été remboursée");
        if (!sortie.mnt_attendu)
          throw new Error("Aucun montant n'est attendu pour cette sortie");

        const montant = parseFloat(sortie.mnt_attendu);

        // 2. Générer l'ID manuel pour la table crediter (car pas d'autoincrement dans ton schéma)
        const op_crd_id = await getMaxValue("crediter", "id_op_crd", null);

        // 3. Récupérer le compte pour le taux de change
        const compte = await tx.compte.findUnique({
          where: { id_cpt: parseInt(cpt_id) },
        });
        if (!compte) throw new Error("Compte introuvable");

        // 4. Créer l'opération de crédit (Entrée d'argent)
        const operation = await tx.crediter.create({
          data: {
            id_op_crd: op_crd_id,
            cpt_id: parseInt(cpt_id),
            date_op: new Date(date_remb),
            montant_op: montant,
            taux_change: compte.taux_change_actuel,
          },
        });

        // 5. Augmenter le solde du compte
        await tx.compte.update({
          where: { id_cpt: parseInt(cpt_id) },
          data: { solde_actuel: { increment: montant } },
        });

        // 6. Mettre à jour la sortie (Liaison avec le crédit)
        const sortieMaj = await tx.sortie_exceptionnelle.update({
          where: { id_sortie: id_sortie },
          data: {
            statut_remb: "REMBOURSE",
            op_crd_id: op_crd_id, // L'ID généré à l'étape 2
          },
        });

        return { sortie: sortieMaj, operation };
      });

      res.status(200).json(resultat);
    } catch (error) {
      res.status(500).json({ error: { message: error.message } });
    }
  },
];

// ==========================================
// 3. RÉCUPÉRER LA LISTE DES SORTIES
// ==========================================
export const getSorties = async (req, res) => {
  try {
    const sorties = await prisma.sortie_exceptionnelle.findMany({
      orderBy: { date_sortie: "desc" },
      include: {
        produit: {
          select: { designation_prd: true },
        },
        colis: {
          select: { mnt_tot_dzd: true, pu_dzd: true },
        },
        operation_credit: {
          select: {
            date_op: true,
            montant_op: true,
            compte: { select: { designation_cpt: true } },
          },
        },
      },
    });

    res.status(200).json(sorties);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};
