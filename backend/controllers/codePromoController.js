import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";
import {
  getMaxValue,
  arrondirPrix,
  estCodeUtilisable,
  calculerReduction,
} from "../config/utils.js";

const TYPES_REDUCTION = ["POURCENTAGE", "MONTANT"];

const estDateExpirationValide = (dateExpiration) => {
  const finJournee = new Date(dateExpiration);
  finJournee.setHours(23, 59, 59, 999);
  return finJournee >= new Date();
};

export const addCodePromo = [
  body("code")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le code est obligatoire")
    .isLength({ max: 50 })
    .withMessage("Le code ne peut pas dépasser 50 caractères"),
  body("typeReduction")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le type de réduction est obligatoire"),
  body("valeurReduction")
    .isFloat({ gt: 0 })
    .withMessage("La valeur de la réduction doit être supérieure à 0"),
  body("dateExpiration")
    .isISO8601()
    .withMessage("La date d'expiration doit être une date valide"),
  body("montantMinPromo")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Le montant minimum doit être un nombre positif"),
  body("estActifPromo")
    .optional()
    .isBoolean()
    .withMessage("estActifPromo doit être un booléen"),
  body("utilisationMax")
    .isInt({ gt: 0 })
    .withMessage("Le nombre d'utilisations maximum doit être au moins 1"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const code = req.body.code.trim().toUpperCase();
    const typeReduction = req.body.typeReduction.trim().toUpperCase();
    const valeurReduction = parseFloat(req.body.valeurReduction);

    if (!TYPES_REDUCTION.includes(typeReduction)) {
      return res.status(400).json({
        message: "Type de réduction invalide (POURCENTAGE ou MONTANT).",
      });
    }
    if (typeReduction === "POURCENTAGE" && valeurReduction > 100) {
      return res.status(400).json({
        message: "Une réduction en pourcentage ne peut pas dépasser 100.",
      });
    }
    if (!estDateExpirationValide(req.body.dateExpiration)) {
      return res.status(400).json({
        message: "La date d'expiration doit être dans le futur.",
      });
    }

    try {
      const existant = await prisma.code_promo.findUnique({
        where: { code },
      });
      if (existant) {
        return res.status(409).json({ message: `Le code "${code}" existe déjà.` });
      }

      const idCode = await getMaxValue("code_promo", "id_code", null);

      const codePromo = await prisma.code_promo.create({
        data: {
          id_code: idCode,
          code,
          type_reduction: typeReduction,
          valeur_reduction: valeurReduction,
          date_expiration: new Date(req.body.dateExpiration),
          montant_min_promo:
            req.body.montantMinPromo !== undefined &&
            req.body.montantMinPromo !== null
              ? parseFloat(req.body.montantMinPromo)
              : 0,
          est_actif_promo:
            req.body.estActifPromo !== undefined ? req.body.estActifPromo : true,
          utilisation_max: parseInt(req.body.utilisationMax, 10),
        },
      });

      res.status(201).json(codePromo);
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ message: "Ce code promo existe déjà." });
      }
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const updateCodePromo = [
  body("code")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le code ne peut pas être vide")
    .isLength({ max: 50 })
    .withMessage("Le code ne peut pas dépasser 50 caractères"),
  body("typeReduction")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le type de réduction ne peut pas être vide"),
  body("valeurReduction")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("La valeur de la réduction doit être supérieure à 0"),
  body("dateExpiration")
    .optional()
    .isISO8601()
    .withMessage("La date d'expiration doit être une date valide"),
  body("montantMinPromo")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Le montant minimum doit être un nombre positif"),
  body("estActifPromo")
    .optional()
    .isBoolean()
    .withMessage("estActifPromo doit être un booléen"),
  body("utilisationMax")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Le nombre d'utilisations maximum doit être au moins 1"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idCode = parseInt(req.params.id, 10);
    if (isNaN(idCode)) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const { code, typeReduction, valeurReduction, dateExpiration, montantMinPromo, estActifPromo, utilisationMax } = req.body;

    try {
      const codePromo = await prisma.code_promo.findUnique({
        where: { id_code: idCode },
      });
      if (!codePromo) {
        return res.status(404).json({ message: "Code promo introuvable." });
      }

      const data = {};
      let typeFinal = codePromo.type_reduction;
      let valeurFinale = parseFloat(codePromo.valeur_reduction);

      if (code !== undefined) {
        const codeNettoye = code.trim().toUpperCase();
        if (codeNettoye !== codePromo.code) {
          const existant = await prisma.code_promo.findUnique({
            where: { code: codeNettoye },
          });
          if (existant) {
            return res
              .status(409)
              .json({ message: `Le code "${codeNettoye}" existe déjà.` });
          }
          data.code = codeNettoye;
        }
      }

      if (typeReduction !== undefined) {
        const typeNettoye = typeReduction.trim().toUpperCase();
        if (!TYPES_REDUCTION.includes(typeNettoye)) {
          return res.status(400).json({
            message: "Type de réduction invalide (POURCENTAGE ou MONTANT).",
          });
        }
        typeFinal = typeNettoye;
        data.type_reduction = typeNettoye;
      }

      if (valeurReduction !== undefined) {
        valeurFinale = parseFloat(valeurReduction);
        data.valeur_reduction = valeurFinale;
      }

      if (typeFinal === "POURCENTAGE" && valeurFinale > 100) {
        return res.status(400).json({
          message: "Une réduction en pourcentage ne peut pas dépasser 100.",
        });
      }

      if (dateExpiration !== undefined) {
        data.date_expiration = new Date(dateExpiration);
      }
      if (montantMinPromo !== undefined) {
        data.montant_min_promo =
          montantMinPromo === null ? 0 : parseFloat(montantMinPromo);
      }
      if (estActifPromo !== undefined) {
        data.est_actif_promo = estActifPromo;
      }
      if (utilisationMax !== undefined) {
        const nouvelleLimite = parseInt(utilisationMax, 10);
        if (nouvelleLimite < codePromo.utilisation_actuelle) {
          return res.status(400).json({
            message:
              "La limite d'utilisation ne peut pas être inférieure au nombre d'utilisations actuelles.",
          });
        }
        data.utilisation_max = nouvelleLimite;
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ message: "Aucune donnée à mettre à jour." });
      }

      const codePromoMAJ = await prisma.code_promo.update({
        where: { id_code: idCode },
        data,
      });

      res.status(200).json(codePromoMAJ);
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ message: "Ce code promo existe déjà." });
      }
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const deleteCodePromo = async (req, res) => {
  const idCode = parseInt(req.params.id, 10);
  if (isNaN(idCode)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  try {
    const codePromo = await prisma.code_promo.findUnique({
      where: { id_code: idCode },
      include: { _count: { select: { commandes: true } } },
    });
    if (!codePromo) {
      return res.status(404).json({ message: "Code promo introuvable." });
    }

    if (codePromo._count.commandes > 0) {
      return res.status(409).json({
        message:
          "Impossible de supprimer : ce code est utilisé par des commandes. Désactivez-le plutôt.",
      });
    }

    await prisma.code_promo.delete({ where: { id_code: idCode } });

    res.status(200).json({ message: "Code promo supprimé avec succès." });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getAllCodesPromo = async (req, res) => {
  try {
    const codesPromo = await prisma.code_promo.findMany({
      orderBy: { code: "asc" },
      include: { _count: { select: { commandes: true } } },
    });
    res.status(200).json(codesPromo);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const verifierCodePromo = async (req, res) => {
  const code = (req.params.code || "").trim().toUpperCase();
  const montant =
    req.query.montant !== undefined ? parseFloat(req.query.montant) : null;

  if (req.query.montant !== undefined && (isNaN(montant) || montant < 0)) {
    return res.status(400).json({ message: "Montant invalide." });
  }

  try {
    const codePromo = await prisma.code_promo.findUnique({ where: { code } });

    const verification = estCodeUtilisable(codePromo, montant);
    if (!verification.utilisable) {
      const messages = {
        CODE_INTROUVABLE: { status: 404, message: "Code promo introuvable." },
        CODE_DESACTIVE: { status: 403, message: "Ce code promo est désactivé." },
        CODE_EXPIRE: { status: 403, message: "Ce code promo a expiré." },
        CODE_EPUISE: {
          status: 403,
          message:
            "Ce code promo a atteint son nombre maximum d'utilisations.",
        },
        MONTANT_MIN_NON_ATTEINT: {
          status: 403,
          message: `Ce code promo nécessite un montant minimum de ${parseFloat(
            codePromo.montant_min_promo,
          )} DZD.`,
        },
      };
      const { status, message } = messages[verification.motif];
      return res.status(status).json({ message, motif: verification.motif });
    }

    const reponse = {
      id_code: codePromo.id_code,
      code: codePromo.code,
      type_reduction: codePromo.type_reduction,
      valeur_reduction: parseFloat(codePromo.valeur_reduction),
      date_expiration: codePromo.date_expiration,
      montant_min_promo:
        codePromo.montant_min_promo !== null
          ? parseFloat(codePromo.montant_min_promo)
          : 0,
    };

    if (montant !== null) {
      reponse.montant_reduction = calculerReduction(codePromo, montant);
      reponse.montant_apres_reduction = arrondirPrix(
        montant - reponse.montant_reduction,
      );
    }

    res.status(200).json(reponse);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};
