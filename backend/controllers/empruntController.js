import prisma from "../config/dbConfig.js";
import { body, param, validationResult } from "express-validator";
import { getMaxValue, arrondir } from "../config/utils.js";

// ==========================================
// LECTURE
// ==========================================
export const getAllEmprunts = async (req, res) => {
  try {
    const emprunts = await prisma.emprunt.findMany({
      include: {
        compte: {
          select: { designation_cpt: true, dev_code: true },
        },
        remboursements: true,
      },
      orderBy: { date_emprunt: "desc" },
    });

    res.status(200).json(emprunts);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

// ==========================================
// CRÉATION (Ajout d'un emprunt)
// ==========================================
export const addEmprunt = [
  body("desEmprunt")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("La désignation de l'emprunt est obligatoire"),
  body("montant")
    .isDecimal()
    .notEmpty()
    .withMessage("Le montant est obligatoire"),
  body("cpt").isNumeric().notEmpty().withMessage("Le compte est obligatoire"),
  body("dateEmprunt").notEmpty().withMessage("La date est obligatoire"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { desEmprunt, montant, cpt, dateEmprunt } = req.body;

    try {
      const newEmprunt = await prisma.$transaction(async (tx) => {
        const infoCompte = await tx.compte.findUnique({
          where: { id_cpt: parseInt(cpt) },
          select: { id_cpt: true },
        });

        if (!infoCompte) {
          throw new Error("Compte introuvable.");
        }

        const idEmprunt = await getMaxValue("emprunt", "id_emprunt", null);
        const dateOperation = new Date(dateEmprunt);
        const montantOperation = parseFloat(montant);

        const empruntCree = await tx.emprunt.create({
          data: {
            id_emprunt: idEmprunt,
            des_emprunt: desEmprunt,
            mnt_emprunt: montantOperation,
            date_emprunt: dateOperation,
            cpt_id: parseInt(cpt),
          },
        });

        await tx.compte.update({
          where: { id_cpt: parseInt(cpt) },
          data: {
            solde_actuel: { increment: montantOperation },
          },
        });

        return empruntCree;
      });

      res.status(201).json(newEmprunt);
    } catch (error) {
      res.status(error.message === "Compte introuvable." ? 404 : 500).json({
        error: { code: error.code || "CUSTOM", message: error.message },
      });
    }
  },
];

// ==========================================
// REMBOURSEMENT (Sortie de trésorerie)
// ==========================================
export const addRemboursement = [
  body("idEmpruntCible")
    .isNumeric()
    .notEmpty()
    .withMessage("L'identifiant de l'emprunt est obligatoire"),
  body("mntRembourse")
    .isDecimal()
    .notEmpty()
    .withMessage("Le montant du remboursement est obligatoire"),
  body("cptCible")
    .isNumeric()
    .notEmpty()
    .withMessage("Le compte de prélèvement est obligatoire"),
  body("dateRembourse").notEmpty().withMessage("La date est obligatoire"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { idEmpruntCible, mntRembourse, cptCible, dateRembourse } = req.body;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const empruntActuel = await tx.emprunt.findUnique({
          where: { id_emprunt: parseInt(idEmpruntCible) },
          include: { remboursements: true },
        });

        if (!empruntActuel) {
          const err = new Error("Emprunt introuvable.");
          err.statusCode = 404;
          throw err;
        }

        if (empruntActuel.statut_emprunt === "SOLDE") {
          const err = new Error("Cet emprunt est déjà totalement soldé.");
          err.statusCode = 403;
          throw err;
        }

        const totalDejaRembourse = empruntActuel.remboursements.reduce(
          (sum, remb) => sum + parseFloat(remb.mnt_remb),
          0,
        );

        const montantInitial = parseFloat(empruntActuel.mnt_emprunt);
        const resteAPayer = arrondir(montantInitial - totalDejaRembourse);
        const montantSaisi = arrondir(parseFloat(mntRembourse));

        if (montantSaisi > resteAPayer) {
          const err = new Error(
            `Le montant saisi dépasse le reste à payer (${resteAPayer} DZD).`,
          );
          err.statusCode = 403;
          throw err;
        }

        const infoCompte = await tx.compte.findUnique({
          where: { id_cpt: parseInt(cptCible) },
          select: { solde_actuel: true },
        });

        if (!infoCompte) {
          const err = new Error("Compte de prélèvement introuvable.");
          err.statusCode = 404;
          throw err;
        }

        if (parseFloat(infoCompte.solde_actuel) < montantSaisi) {
          const err = new Error(
            "Fonds insuffisants sur le compte sélectionné.",
          );
          err.statusCode = 403;
          throw err;
        }

        const idRemboursement = await getMaxValue(
          "remboursement",
          "id_remb",
          null,
        );
        const dateOperation = new Date(dateRembourse);

        const nouveauRemboursement = await tx.remboursement.create({
          data: {
            id_remb: idRemboursement,
            mnt_remb: montantSaisi,
            date_remb: dateOperation,
            emprunt_id: parseInt(idEmpruntCible),
            cpt_remb: parseInt(cptCible),
          },
        });

        await tx.compte.update({
          where: { id_cpt: parseInt(cptCible) },
          data: {
            solde_actuel: { decrement: montantSaisi },
          },
        });

        if (montantSaisi >= resteAPayer) {
          await tx.emprunt.update({
            where: { id_emprunt: parseInt(idEmpruntCible) },
            data: { statut_emprunt: "SOLDE" },
          });
        }

        return nouveauRemboursement;
      });

      res
        .status(201)
        .json({ message: "Remboursement ajouté avec succès", data: result });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        error: {
          code:
            error.code ||
            (statusCode >= 400 && statusCode < 500
              ? "BUSINESS_RULE"
              : "SERVER_ERROR"),
          message: error.message,
        },
      });
    }
  },
];

// ==========================================
// SUPPRESSION D'UN EMPRUNT (DELETE)
// ==========================================
export const deleteEmprunt = [
  param("id")
    .isInt()
    .withMessage("L'ID de l'emprunt doit être un entier valide"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    try {
      await prisma.$transaction(async (tx) => {
        const emprunt = await tx.emprunt.findUnique({
          where: { id_emprunt: parseInt(id) },
          include: { remboursements: true },
        });

        if (!emprunt) {
          const err = new Error("Emprunt introuvable.");
          err.statusCode = 404;
          throw err;
        }

        if (emprunt.remboursements.length > 0) {
          const err = new Error(
            "Suppression impossible : des remboursements sont liés à cet emprunt.",
          );
          err.statusCode = 403;
          throw err;
        }

        await tx.compte.update({
          where: { id_cpt: emprunt.cpt_id },
          data: {
            solde_actuel: { decrement: parseFloat(emprunt.mnt_emprunt) },
          },
        });

        await tx.emprunt.delete({
          where: { id_emprunt: parseInt(id) },
        });
      });

      res.status(200).json({ message: "Emprunt supprimé avec succès." });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        error: {
          message: error.message,
        },
      });
    }
  },
];

// ==========================================
// SUPPRESSION D'UN REMBOURSEMENT (DELETE)
// ==========================================
export const deleteRemboursement = [
  param("id")
    .isInt()
    .withMessage("L'ID du remboursement doit être un entier valide"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    try {
      await prisma.$transaction(async (tx) => {
        const remb = await tx.remboursement.findUnique({
          where: { id_remb: parseInt(id) },
          include: { emprunt: true },
        });

        if (!remb) {
          const err = new Error("Remboursement introuvable.");
          err.statusCode = 404;
          throw err;
        }

        await tx.compte.update({
          where: { id_cpt: remb.cpt_remb },
          data: { solde_actuel: { increment: parseFloat(remb.mnt_remb) } },
        });

        // Règle métier : Repasser l'emprunt en "EN_COURS" s'il avait été clôturé
        if (remb.emprunt.statut_emprunt === "SOLDE") {
          await tx.emprunt.update({
            where: { id_emprunt: remb.emprunt_id },
            data: { statut_emprunt: "EN_COURS" },
          });
        }

        await tx.remboursement.delete({
          where: { id_remb: parseInt(id) },
        });
      });

      res.status(200).json({ message: "Remboursement annulé avec succès." });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        error: {
          message: error.message,
        },
      });
    }
  },
];

// ==========================================
// MODIFICATION D'UN EMPRUNT (PUT)
// ==========================================
export const updateEmprunt = [
  body("desEmprunt").isString().trim().notEmpty(),
  body("montant").isDecimal().notEmpty(),
  body("cpt").isNumeric().notEmpty(),
  body("dateEmprunt").notEmpty(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { desEmprunt, montant, cpt, dateEmprunt } = req.body;

    try {
      await prisma.$transaction(async (tx) => {
        const oldEmprunt = await tx.emprunt.findUnique({
          where: { id_emprunt: parseInt(id) },
          include: { remboursements: true },
        });

        if (!oldEmprunt) throw new Error("NOT_FOUND");

        const totalRembourse = oldEmprunt.remboursements.reduce(
          (sum, r) => sum + parseFloat(r.mnt_remb),
          0,
        );
        const newMontant = parseFloat(montant);

        // Sécurité : Impossible de baisser le montant de l'emprunt sous ce qui a déjà été payé
        if (newMontant < totalRembourse) {
          throw new Error(
            `Le montant ne peut pas être inférieur au total déjà remboursé (${totalRembourse} DZD).`,
          );
        }

        // 1. Ajustement des soldes de compte avec parseFloat systématique
        if (oldEmprunt.cpt_id !== parseInt(cpt)) {
          // Changement de compte : on retire l'argent de l'ancien, on l'ajoute au nouveau
          await tx.compte.update({
            where: { id_cpt: oldEmprunt.cpt_id },
            data: {
              solde_actuel: { decrement: parseFloat(oldEmprunt.mnt_emprunt) },
            },
          });
          await tx.compte.update({
            where: { id_cpt: parseInt(cpt) },
            data: { solde_actuel: { increment: newMontant } },
          });
        } else if (newMontant !== parseFloat(oldEmprunt.mnt_emprunt)) {
          // Même compte mais montant différent : on applique la différence
          const diff = newMontant - parseFloat(oldEmprunt.mnt_emprunt);
          await tx.compte.update({
            where: { id_cpt: oldEmprunt.cpt_id },
            data: { solde_actuel: { increment: diff } },
          });
        }

        // 2. Mise à jour de l'emprunt (Aucun appel à `crediter`)
        const nouveauStatut =
          newMontant === totalRembourse && newMontant > 0
            ? "SOLDE"
            : "EN_COURS";

        await tx.emprunt.update({
          where: { id_emprunt: parseInt(id) },
          data: {
            des_emprunt: desEmprunt,
            mnt_emprunt: newMontant,
            cpt_id: parseInt(cpt),
            date_emprunt: new Date(dateEmprunt),
            statut_emprunt: nouveauStatut,
          },
        });
      });

      res.status(200).json({ message: "Emprunt mis à jour avec succès." });
    } catch (error) {
      if (error.message === "NOT_FOUND")
        return res
          .status(404)
          .json({ error: { message: "Emprunt introuvable." } });
      res.status(400).json({ error: { message: error.message } });
    }
  },
];

// ==========================================
// MODIFICATION D'UN REMBOURSEMENT (PUT)
// ==========================================
export const updateRemboursement = [
  body("mntRembourse").isDecimal().notEmpty(),
  body("cptCible").isNumeric().notEmpty(),
  body("dateRembourse").notEmpty(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { mntRembourse, cptCible, dateRembourse } = req.body;

    try {
      await prisma.$transaction(async (tx) => {
        const oldRemb = await tx.remboursement.findUnique({
          where: { id_remb: parseInt(id) },
          include: { emprunt: { include: { remboursements: true } } },
        });

        if (!oldRemb) throw new Error("NOT_FOUND");

        const emprunt = oldRemb.emprunt;
        const newMontantSaisi = parseFloat(mntRembourse);
        const newCompteId = parseInt(cptCible);

        // Calcul du total remboursé SANS ce paiement précis
        const autresRemboursements = emprunt.remboursements.filter(
          (r) => r.id_remb !== parseInt(id),
        );
        const totalAutres = autresRemboursements.reduce(
          (sum, r) => sum + parseFloat(r.mnt_remb),
          0,
        );
        const maxAutorise = parseFloat(emprunt.mnt_emprunt) - totalAutres;

        if (newMontantSaisi > maxAutorise) {
          throw new Error(
            `Le montant corrigé dépasse le reste à payer (${arrondir(maxAutorise)} DZD).`,
          );
        }

        // 1. Ajuster les comptes selon la nouvelle architecture DCL
        if (oldRemb.cpt_remb !== newCompteId) {
          // L'utilisateur a changé le compte source : on restitue à l'ancien, on prélève sur le nouveau
          await tx.compte.update({
            where: { id_cpt: oldRemb.cpt_remb },
            data: { solde_actuel: { increment: parseFloat(oldRemb.mnt_remb) } },
          });

          // Vérifier les fonds du nouveau compte
          const infoNouveauCompte = await tx.compte.findUnique({
            where: { id_cpt: newCompteId },
            select: { solde_actuel: true },
          });
          if (
            !infoNouveauCompte ||
            parseFloat(infoNouveauCompte.solde_actuel) < newMontantSaisi
          ) {
            throw new Error(
              "Fonds insuffisants sur le nouveau compte sélectionné.",
            );
          }
          await tx.compte.update({
            where: { id_cpt: newCompteId },
            data: { solde_actuel: { decrement: newMontantSaisi } },
          });
        } else if (newMontantSaisi !== parseFloat(oldRemb.mnt_remb)) {
          // Même compte, mais montant modifié
          const diff = newMontantSaisi - parseFloat(oldRemb.mnt_remb);
          await tx.compte.update({
            where: { id_cpt: oldRemb.cpt_remb },
            data: { solde_actuel: { decrement: diff } },
          });
        }

        // 2. Mettre à jour le remboursement
        await tx.remboursement.update({
          where: { id_remb: parseInt(id) },
          data: {
            mnt_remb: newMontantSaisi,
            cpt_remb: newCompteId,
            date_remb: new Date(dateRembourse),
          },
        });

        // 3. Recalculer le statut de l'emprunt
        const nouveauTotal = totalAutres + newMontantSaisi;
        const nouveauStatut =
          nouveauTotal === parseFloat(emprunt.mnt_emprunt)
            ? "SOLDE"
            : "EN_COURS";
        await tx.emprunt.update({
          where: { id_emprunt: emprunt.id_emprunt },
          data: { statut_emprunt: nouveauStatut },
        });
      });

      res.status(200).json({ message: "Remboursement corrigé avec succès." });
    } catch (error) {
      if (error.message === "NOT_FOUND")
        return res
          .status(404)
          .json({ error: { message: "Remboursement introuvable." } });
      res.status(400).json({ error: { message: error.message } });
    }
  },
];
