import prisma from "../config/dbConfig.js";
import { body, param, validationResult } from "express-validator";
import { getMaxValue, arrondir } from "../config/utils.js";

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
          select: { solde_actuel: true, solde_bloque: true },
        });

        if (!infoCompte) {
          const err = new Error("Compte de prélèvement introuvable.");
          err.statusCode = 404;
          throw err;
        }

        const soldeDisponible = arrondir(
          parseFloat(infoCompte.solde_actuel) -
            parseFloat(infoCompte.solde_bloque || 0),
        );

        if (soldeDisponible < montantSaisi) {
          const err = new Error(
            "Fonds insuffisants (Fonds bloqués atteints) sur le compte sélectionné.",
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

        const compte = await tx.compte.findUnique({
          where: { id_cpt: emprunt.cpt_id },
          select: { solde_actuel: true, solde_bloque: true },
        });

        const soldeDisponible = arrondir(
          parseFloat(compte.solde_actuel) -
            parseFloat(compte.solde_bloque || 0),
        );
        const montantADeduire = arrondir(parseFloat(emprunt.mnt_emprunt));

        if (soldeDisponible < montantADeduire) {
          const err = new Error(
            "Fonds insuffisants (Fonds bloqués atteints) pour annuler cet emprunt.",
          );
          err.statusCode = 403;
          throw err;
        }

        await tx.compte.update({
          where: { id_cpt: emprunt.cpt_id },
          data: {
            solde_actuel: { decrement: montantADeduire },
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

export const updateEmprunt = [
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

    const { id } = req.params;
    const { desEmprunt, montant, cpt, dateEmprunt } = req.body;

    try {
      await prisma.$transaction(async (tx) => {
        const oldEmprunt = await tx.emprunt.findUnique({
          where: { id_emprunt: parseInt(id) },
          include: { remboursements: true },
        });

        if (!oldEmprunt) {
          const err = new Error("Emprunt introuvable.");
          err.statusCode = 404;
          throw err;
        }

        const totalRembourse = oldEmprunt.remboursements.reduce(
          (sum, r) => sum + parseFloat(r.mnt_remb),
          0,
        );
        const newMontant = parseFloat(montant);

        if (newMontant < totalRembourse) {
          const err = new Error(
            `Le montant ne peut pas être inférieur au total déjà remboursé (${totalRembourse} DZD).`,
          );
          err.statusCode = 403;
          throw err;
        }

        if (oldEmprunt.cpt_id !== parseInt(cpt)) {
          const oldCompte = await tx.compte.findUnique({
            where: { id_cpt: oldEmprunt.cpt_id },
            select: { solde_actuel: true, solde_bloque: true },
          });

          const soldeDisponible = arrondir(
            parseFloat(oldCompte.solde_actuel) -
              parseFloat(oldCompte.solde_bloque || 0),
          );
          const montantADeduire = arrondir(parseFloat(oldEmprunt.mnt_emprunt));

          if (soldeDisponible < montantADeduire) {
            const err = new Error(
              "Fonds insuffisants (Fonds bloqués atteints) sur l'ancien compte pour effectuer ce transfert.",
            );
            err.statusCode = 403;
            throw err;
          }

          await tx.compte.update({
            where: { id_cpt: oldEmprunt.cpt_id },
            data: {
              solde_actuel: { decrement: montantADeduire },
            },
          });

          await tx.compte.update({
            where: { id_cpt: parseInt(cpt) },
            data: { solde_actuel: { increment: newMontant } },
          });
        } else if (newMontant !== parseFloat(oldEmprunt.mnt_emprunt)) {
          const diff = arrondir(
            newMontant - parseFloat(oldEmprunt.mnt_emprunt),
          );

          if (diff < 0) {
            const compte = await tx.compte.findUnique({
              where: { id_cpt: oldEmprunt.cpt_id },
              select: { solde_actuel: true, solde_bloque: true },
            });
            const soldeDisponible = arrondir(
              parseFloat(compte.solde_actuel) -
                parseFloat(compte.solde_bloque || 0),
            );
            if (soldeDisponible < Math.abs(diff)) {
              const err = new Error(
                "Fonds insuffisants (Fonds bloqués atteints) pour réduire le montant de cet emprunt.",
              );
              err.statusCode = 403;
              throw err;
            }
          }

          await tx.compte.update({
            where: { id_cpt: oldEmprunt.cpt_id },
            data: { solde_actuel: { increment: diff } },
          });
        }

        const nouveauStatut =
          newMontant <= totalRembourse && newMontant > 0 ? "SOLDE" : "EN_COURS";

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
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        error: {
          message: error.message,
        },
      });
    }
  },
];

export const updateRemboursement = [
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

    const { id } = req.params;
    const { mntRembourse, cptCible, dateRembourse } = req.body;

    try {
      await prisma.$transaction(async (tx) => {
        const oldRemb = await tx.remboursement.findUnique({
          where: { id_remb: parseInt(id) },
          include: { emprunt: { include: { remboursements: true } } },
        });

        if (!oldRemb) {
          const err = new Error("Remboursement introuvable.");
          err.statusCode = 404;
          throw err;
        }

        const emprunt = oldRemb.emprunt;
        const newMontantSaisi = arrondir(parseFloat(mntRembourse));
        const newCompteId = parseInt(cptCible);

        const autresRemboursements = emprunt.remboursements.filter(
          (r) => r.id_remb !== parseInt(id),
        );
        const totalAutres = autresRemboursements.reduce(
          (sum, r) => sum + parseFloat(r.mnt_remb),
          0,
        );
        const maxAutorise = arrondir(
          parseFloat(emprunt.mnt_emprunt) - totalAutres,
        );

        if (newMontantSaisi > maxAutorise) {
          const err = new Error(
            `Le montant corrigé dépasse le reste à payer (${maxAutorise} DZD).`,
          );
          err.statusCode = 403;
          throw err;
        }

        if (oldRemb.cpt_remb !== newCompteId) {
          await tx.compte.update({
            where: { id_cpt: oldRemb.cpt_remb },
            data: { solde_actuel: { increment: parseFloat(oldRemb.mnt_remb) } },
          });

          const infoNouveauCompte = await tx.compte.findUnique({
            where: { id_cpt: newCompteId },
            select: { solde_actuel: true, solde_bloque: true },
          });

          if (!infoNouveauCompte) {
            const err = new Error("Nouveau compte introuvable.");
            err.statusCode = 404;
            throw err;
          }

          const soldeDisponible = arrondir(
            parseFloat(infoNouveauCompte.solde_actuel) -
              parseFloat(infoNouveauCompte.solde_bloque || 0),
          );

          if (soldeDisponible < newMontantSaisi) {
            const err = new Error(
              "Fonds insuffisants (Fonds bloqués atteints) sur le nouveau compte sélectionné.",
            );
            err.statusCode = 403;
            throw err;
          }

          await tx.compte.update({
            where: { id_cpt: newCompteId },
            data: { solde_actuel: { decrement: newMontantSaisi } },
          });
        } else if (newMontantSaisi !== parseFloat(oldRemb.mnt_remb)) {
          const diff = arrondir(newMontantSaisi - parseFloat(oldRemb.mnt_remb));

          if (diff > 0) {
            const compte = await tx.compte.findUnique({
              where: { id_cpt: oldRemb.cpt_remb },
              select: { solde_actuel: true, solde_bloque: true },
            });
            const soldeDisponible = arrondir(
              parseFloat(compte.solde_actuel) -
                parseFloat(compte.solde_bloque || 0),
            );

            if (soldeDisponible < diff) {
              const err = new Error(
                "Fonds insuffisants (Fonds bloqués atteints) pour augmenter ce remboursement.",
              );
              err.statusCode = 403;
              throw err;
            }
          }

          await tx.compte.update({
            where: { id_cpt: oldRemb.cpt_remb },
            data: { solde_actuel: { decrement: diff } },
          });
        }

        await tx.remboursement.update({
          where: { id_remb: parseInt(id) },
          data: {
            mnt_remb: newMontantSaisi,
            cpt_remb: newCompteId,
            date_remb: new Date(dateRembourse),
          },
        });

        const nouveauTotal = arrondir(totalAutres + newMontantSaisi);
        const nouveauStatut =
          nouveauTotal >= parseFloat(emprunt.mnt_emprunt)
            ? "SOLDE"
            : "EN_COURS";

        await tx.emprunt.update({
          where: { id_emprunt: emprunt.id_emprunt },
          data: { statut_emprunt: nouveauStatut },
        });
      });

      res.status(200).json({ message: "Remboursement corrigé avec succès." });
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
