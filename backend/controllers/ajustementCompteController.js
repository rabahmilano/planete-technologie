import prisma from "../config/dbConfig.js";
import { body, param, validationResult } from "express-validator";
import { arrondir, getMaxValue } from "../config/utils.js";

export const creerAjustement = [
  body("compteId").isInt({ min: 1 }).withMessage("Le compte est obligatoire."),
  body("typeAjustement").isIn(["AUGMENTATION", "DIMINUTION"]).withMessage("Type d'ajustement invalide."),
  body("montant").matches(/^\d+(?:\.\d{1,2})?$/).withMessage("Le montant doit avoir au maximum 2 décimales.")
    .custom(value => Number(value) > 0 && Number(value) <= 99999999.99).withMessage("Le montant doit être supérieur à zéro."),
  body("modeTaux").optional().isIn(["ACTUEL", "PERSONNALISE"]).withMessage("Mode de taux invalide."),
  body("tauxPersonnalise").optional({ nullable: true, checkFalsy: true })
    .matches(/^\d+(?:\.\d{1,2})?$/).withMessage("Le taux personnalisé est invalide.")
    .custom(value => Number(value) > 0 && Number(value) <= 99999999.99).withMessage("Le taux doit être supérieur à zéro."),
  body("dateAjustement").isISO8601({ strict: true }).withMessage("La date est invalide."),
  body("observation").isString().trim().notEmpty().withMessage("Le motif de l'ajustement est obligatoire.")
    .isLength({ max: 255 }).withMessage("Le motif ne doit pas dépasser 255 caractères."),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { compteId, typeAjustement, montant, modeTaux = "ACTUEL", tauxPersonnalise, dateAjustement, observation } = req.body;
    const compteIdInt = Number(compteId);
    const montantAjustement = arrondir(Number(montant));
    if (!Number.isSafeInteger(compteIdInt) || !Number.isFinite(montantAjustement) || montantAjustement <= 0) {
      return res.status(400).json({ message: "Données d'ajustement invalides." });
    }
    if (typeAjustement === "DIMINUTION" && modeTaux === "PERSONNALISE") {
      return res.status(400).json({ message: "Une diminution utilise toujours le taux actuel du compte." });
    }
    if (typeAjustement === "AUGMENTATION" && modeTaux === "PERSONNALISE" &&
        (!tauxPersonnalise || !Number.isFinite(Number(tauxPersonnalise)) || Number(tauxPersonnalise) <= 0)) {
      return res.status(400).json({ message: "Saisissez un taux personnalisé valide." });
    }

    try {
      await prisma.$transaction(async tx => {
        const compte = await tx.compte.findUnique({
          where: { id_cpt: compteIdInt },
          select: { id_cpt: true, solde_actuel: true, solde_bloque: true, taux_change_actuel: true }
        });
        if (!compte) throw new Error("COMPTE_NOT_FOUND");

        const solde = Number(compte.solde_actuel || 0);
        const tauxActuel = Number(compte.taux_change_actuel || 0);
        const tauxUtilise = typeAjustement === "DIMINUTION"
          ? tauxActuel
          : modeTaux === "PERSONNALISE" ? arrondir(Number(tauxPersonnalise)) : tauxActuel;

        if (typeAjustement === "DIMINUTION") {
          const disponible = arrondir(solde - Number(compte.solde_bloque || 0));
          if (disponible < montantAjustement) throw new Error("INSUFFICIENT_FUNDS");
          await tx.compte.update({
            where: { id_cpt: compteIdInt },
            data: { solde_actuel: { decrement: montantAjustement } }
          });
        } else {
          const nouveauSolde = arrondir(solde + montantAjustement);
          const nouveauTaux = nouveauSolde > 0
            ? arrondir((solde * tauxActuel + montantAjustement * tauxUtilise) / nouveauSolde)
            : tauxUtilise;
          await tx.compte.update({
            where: { id_cpt: compteIdInt },
            data: { solde_actuel: { increment: montantAjustement }, taux_change_actuel: nouveauTaux }
          });
        }

        const id = await getMaxValue("ajustement_compte", "id_ajustement", null);
        await tx.ajustement_compte.create({
          data: {
            id_ajustement: id,
            cpt_id: compteIdInt,
            montant: montantAjustement,
            type_ajustement: typeAjustement,
            taux_change: tauxUtilise,
            date_ajustement: new Date(dateAjustement),
            observation: observation.trim()
          }
        });
      });

      return res.status(201).json({ message: "Ajustement du compte enregistré avec succès." });
    } catch (error) {
      if (error.message === "COMPTE_NOT_FOUND") return res.status(404).json({ message: "Compte introuvable." });
      if (error.message === "INSUFFICIENT_FUNDS") return res.status(400).json({ message: "Le solde disponible est insuffisant (fonds bloqués déduits)." });
      return res.status(500).json({ error: { code: error.code, message: error.message } });
    }
  }
];

export const getAjustements = async (req, res) => {
  try {
    const ajustements = await prisma.ajustement_compte.findMany({
      include: { compte: { select: { designation_cpt: true, dev_code: true } } },
      orderBy: [{ date_ajustement: "desc" }, { id_ajustement: "desc" }]
    });
    res.status(200).json(ajustements);
  } catch (error) {
    res.status(500).json({ error: { code: error.code, message: error.message } });
  }
};

export const annulerAjustement = [
  param("id").isInt({ min: 1 }).withMessage("Identifiant invalide."),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      await prisma.$transaction(async tx => {
        const ajustement = await tx.ajustement_compte.findUnique({
          where: { id_ajustement: Number(req.params.id) }
        });
        if (!ajustement) throw new Error("NOT_FOUND");
        if (ajustement.isAnnule) throw new Error("ALREADY_CANCELED");

        const compte = await tx.compte.findUnique({
          where: { id_cpt: ajustement.cpt_id },
          select: { solde_actuel: true, solde_bloque: true, taux_change_actuel: true }
        });
        if (!compte) throw new Error("COMPTE_NOT_FOUND");

        const montant = Number(ajustement.montant);
        const tauxOperation = Number(ajustement.taux_change);
        const soldeActuel = Number(compte.solde_actuel || 0);
        const tauxActuel = Number(compte.taux_change_actuel || 0);
        let nouveauSolde;
        let nouveauTaux;

        if (ajustement.type_ajustement === "AUGMENTATION") {
          const disponible = arrondir(soldeActuel - Number(compte.solde_bloque || 0));
          if (disponible < montant) throw new Error("INSUFFICIENT_FUNDS");
          nouveauSolde = arrondir(soldeActuel - montant);
          if (nouveauSolde > 0) {
            nouveauTaux = arrondir((soldeActuel * tauxActuel - montant * tauxOperation) / nouveauSolde);
            if (nouveauTaux < 0) throw new Error("VALUATION_INVALID");
          } else {
            nouveauTaux = 0;
          }
        } else {
          nouveauSolde = arrondir(soldeActuel + montant);
          nouveauTaux = nouveauSolde > 0
            ? arrondir((soldeActuel * tauxActuel + montant * tauxOperation) / nouveauSolde)
            : tauxOperation;
        }

        await tx.compte.update({
          where: { id_cpt: ajustement.cpt_id },
          data: { solde_actuel: nouveauSolde, taux_change_actuel: nouveauTaux }
        });
        await tx.ajustement_compte.update({
          where: { id_ajustement: ajustement.id_ajustement },
          data: { isAnnule: true }
        });
      });
      return res.status(200).json({ message: "Ajustement annulé et solde recalculé." });
    } catch (error) {
      const messages = {
        NOT_FOUND: "Ajustement introuvable.",
        ALREADY_CANCELED: "Cet ajustement est déjà annulé.",
        COMPTE_NOT_FOUND: "Compte introuvable.",
        INSUFFICIENT_FUNDS: "Annulation impossible : le solde disponible est insuffisant.",
        VALUATION_INVALID: "Annulation impossible : la valorisation du compte deviendrait négative."
      };
      const status = ["NOT_FOUND", "COMPTE_NOT_FOUND"].includes(error.message) ? 404 : 400;
      return res.status(status).json({ message: messages[error.message] || error.message });
    }
  }
];
