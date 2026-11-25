import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";
import {
  getMaxValue,
  verifierCodePromoValide,
  calculerReductionPromo,
} from "../config/utils.js";

const TYPES_REDUCTION = ["POURCENTAGE", "MONTANT_FIXE"];

const normaliserCode = (code) => code.trim().toUpperCase();

export const addCodePromo = [
  body("code")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le code promo est obligatoire"),
  body("type_reduction")
    .customSanitizer((value) =>
      typeof value === "string" ? value.trim().toUpperCase() : value,
    )
    .isIn(TYPES_REDUCTION)
    .withMessage(
      `Le type de réduction doit être ${TYPES_REDUCTION.join(", ")}`,
    ),
  body("valeur_reduction")
    .isFloat({ gt: 0 })
    .withMessage("La valeur de la réduction doit être supérieure à 0"),
  body("date_debut")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("La date de début doit être une date valide"),
  body("date_expiration")
    .isISO8601()
    .withMessage("La date d'expiration doit être une date valide"),
  body("utilisation_max")
    .isInt({ min: 1 })
    .withMessage("L'utilisation maximum doit être un entier supérieur à 0"),
  body("montant_min_promo")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Le montant minimum doit être un nombre positif ou nul"),
  body("est_actif_promo")
    .optional()
    .isBoolean()
    .withMessage("L'activation du code promo doit être un booléen"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      code,
      type_reduction,
      valeur_reduction,
      date_debut,
      date_expiration,
      utilisation_max,
      montant_min_promo,
      est_actif_promo,
    } = req.body;

    if (
      type_reduction === "POURCENTAGE" &&
      parseFloat(valeur_reduction) > 100
    ) {
      return res.status(400).json({
        message: "Une réduction en pourcentage ne peut pas dépasser 100.",
      });
    }

    if (
      date_debut &&
      new Date(date_debut) > new Date(date_expiration)
    ) {
      return res.status(400).json({
        message:
          "La date de début doit être antérieure ou égale à la date d'expiration.",
      });
    }

    try {
      const codeNormalise = normaliserCode(code);
      const existant = await prisma.code_promo.findUnique({
        where: { code: codeNormalise },
      });
      if (existant) {
        return res
          .status(409)
          .json({ message: "Ce code promo existe déjà." });
      }

      const idCode = await getMaxValue("code_promo", "id_code", null);

      const nouveauCode = await prisma.code_promo.create({
        data: {
          id_code: idCode,
          code: codeNormalise,
          type_reduction,
          valeur_reduction: parseFloat(valeur_reduction),
          date_debut: date_debut ? new Date(date_debut) : null,
          date_expiration: new Date(date_expiration),
          montant_min_promo:
            montant_min_promo === null ||
            montant_min_promo === undefined ||
            montant_min_promo === ""
              ? 0
              : parseFloat(montant_min_promo),
          est_actif_promo:
            est_actif_promo !== undefined ? est_actif_promo : true,
          utilisation_max: parseInt(utilisation_max, 10),
        },
      });

      res.status(201).json(nouveauCode);
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const getAllCodesPromo = async (req, res) => {
  try {
    const codes = await prisma.code_promo.findMany({
      include: { _count: { select: { commandes: true } } },
      orderBy: { date_expiration: "asc" },
    });

    res.status(200).json(codes);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getCodePromoById = async (req, res) => {
  const idCode = parseInt(req.params.id, 10);
  if (isNaN(idCode)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  try {
    const codePromo = await prisma.code_promo.findUnique({
      where: { id_code: idCode },
      include: {
        commandes: {
          select: {
            id_cmd_web: true,
            date_creation: true,
            nom_client: true,
            montant_total_final: true,
            statut_commande: true,
          },
          orderBy: { date_creation: "desc" },
          take: 20,
        },
      },
    });

    if (!codePromo) {
      return res.status(404).json({ message: "Code promo introuvable." });
    }

    res.status(200).json(codePromo);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const updateCodePromo = [
  body("code")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le code promo est obligatoire"),
  body("type_reduction")
    .optional()
    .customSanitizer((value) =>
      typeof value === "string" ? value.trim().toUpperCase() : value,
    )
    .isIn(TYPES_REDUCTION)
    .withMessage(
      `Le type de réduction doit être ${TYPES_REDUCTION.join(", ")}`,
    ),
  body("valeur_reduction")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("La valeur de la réduction doit être supérieure à 0"),
  body("date_debut")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("La date de début doit être une date valide"),
  body("date_expiration")
    .optional()
    .isISO8601()
    .withMessage("La date d'expiration doit être une date valide"),
  body("utilisation_max")
    .optional()
    .isInt({ min: 1 })
    .withMessage("L'utilisation maximum doit être un entier supérieur à 0"),
  body("montant_min_promo")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Le montant minimum doit être un nombre positif ou nul"),
  body("est_actif_promo")
    .optional()
    .isBoolean()
    .withMessage("L'activation du code promo doit être un booléen"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idCode = parseInt(req.params.id, 10);
    if (isNaN(idCode)) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const {
      code,
      type_reduction,
      valeur_reduction,
      date_debut,
      date_expiration,
      utilisation_max,
      montant_min_promo,
      est_actif_promo,
    } = req.body;

    try {
      const codePromo = await prisma.code_promo.findUnique({
        where: { id_code: idCode },
      });
      if (!codePromo) {
        return res.status(404).json({ message: "Code promo introuvable." });
      }

      const dateDebutEffective =
        date_debut !== undefined
          ? date_debut
            ? new Date(date_debut)
            : null
          : codePromo.date_debut
            ? new Date(codePromo.date_debut)
            : null;
      const dateExpirationEffective =
        date_expiration !== undefined
          ? new Date(date_expiration)
          : new Date(codePromo.date_expiration);
      if (
        dateDebutEffective &&
        dateDebutEffective > dateExpirationEffective
      ) {
        return res.status(400).json({
          message:
            "La date de début doit être antérieure ou égale à la date d'expiration.",
        });
      }

      const typeEffectif =
        type_reduction !== undefined
          ? type_reduction
          : codePromo.type_reduction;
      const valeurEffective =
        valeur_reduction !== undefined
          ? parseFloat(valeur_reduction)
          : parseFloat(codePromo.valeur_reduction);
      if (typeEffectif === "POURCENTAGE" && valeurEffective > 100) {
        return res.status(400).json({
          message: "Une réduction en pourcentage ne peut pas dépasser 100.",
        });
      }

      const dataToUpdate = {};
      if (code !== undefined) {
        const codeNormalise = normaliserCode(code);
        const conflit = await prisma.code_promo.findFirst({
          where: { code: codeNormalise, id_code: { not: idCode } },
        });
        if (conflit) {
          return res
            .status(409)
            .json({ message: "Ce code promo existe déjà." });
        }
        dataToUpdate.code = codeNormalise;
      }
      if (type_reduction !== undefined) {
        dataToUpdate.type_reduction = type_reduction;
      }
      if (valeur_reduction !== undefined) {
        dataToUpdate.valeur_reduction = parseFloat(valeur_reduction);
      }
      if (date_debut !== undefined) {
        dataToUpdate.date_debut = date_debut ? new Date(date_debut) : null;
      }
      if (date_expiration !== undefined) {
        dataToUpdate.date_expiration = new Date(date_expiration);
      }
      if (utilisation_max !== undefined) {
        dataToUpdate.utilisation_max = parseInt(utilisation_max, 10);
      }
      if (montant_min_promo !== undefined) {
        dataToUpdate.montant_min_promo =
          montant_min_promo === null || montant_min_promo === ""
            ? 0
            : parseFloat(montant_min_promo);
      }
      if (est_actif_promo !== undefined) {
        dataToUpdate.est_actif_promo = est_actif_promo;
      }

      if (Object.keys(dataToUpdate).length === 0) {
        return res
          .status(400)
          .json({ message: "Aucune donnée à mettre à jour fournie." });
      }

      const codeModifie = await prisma.code_promo.update({
        where: { id_code: idCode },
        data: dataToUpdate,
      });

      res.status(200).json(codeModifie);
    } catch (error) {
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
    });
    if (!codePromo) {
      return res.status(404).json({ message: "Code promo introuvable." });
    }

    const nbCommandes = await prisma.commande_web.count({
      where: { code_promo_id: idCode },
    });
    if (nbCommandes > 0) {
      return res.status(403).json({
        message:
          "Impossible de supprimer un code promo déjà utilisé par des commandes.",
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

export const verifyCodePromo = [
  body("code")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le code promo est obligatoire"),
  body("montant_commande")
    .notEmpty()
    .withMessage("Le montant de la commande est obligatoire")
    .isFloat({ min: 0 })
    .withMessage("Le montant de la commande doit être un nombre positif ou nul"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code, montant_commande } = req.body;

    try {
      const codePromo = await prisma.code_promo.findUnique({
        where: { code: normaliserCode(code) },
      });

      const montant = parseFloat(montant_commande);
      const verification = verifierCodePromoValide(codePromo, montant);

      if (!verification.valide) {
        return res
          .status(200)
          .json({ valide: false, message: verification.message });
      }

      const montantReduction = calculerReductionPromo(codePromo, montant);

      res.status(200).json({
        valide: true,
        code_promo: codePromo,
        montant_reduction: montantReduction,
      });
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];
