import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";
import { getMaxValue } from "../config/utils.js";

const TYPES_LIVRAISON = ["DOMICILE", "BUREAU"];

export const addTarifLivraison = [
  body("code_wilaya_tarif")
    .isInt({ min: 1, max: 58 })
    .withMessage("Le code wilaya doit être entre 1 et 58"),
  body("nom_wilaya_tarif")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le nom de la wilaya est obligatoire"),
  body("type_livraison_tarif")
    .customSanitizer((value) =>
      typeof value === "string" ? value.trim().toUpperCase() : value,
    )
    .isIn(TYPES_LIVRAISON)
    .withMessage(
      `Le type de livraison doit être ${TYPES_LIVRAISON.join(", ")}`,
    ),
  body("prix_livraison_tarif")
    .isFloat({ min: 0 })
    .withMessage("Le prix de livraison doit être un nombre positif ou nul"),
  body("actif_tarif")
    .optional()
    .isBoolean()
    .withMessage("L'activation du tarif doit être un booléen"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      code_wilaya_tarif,
      nom_wilaya_tarif,
      type_livraison_tarif,
      prix_livraison_tarif,
      actif_tarif,
    } = req.body;

    try {
      const existant = await prisma.tarif_livraison.findUnique({
        where: {
          code_wilaya_tarif_type_livraison_tarif: {
            code_wilaya_tarif: parseInt(code_wilaya_tarif, 10),
            type_livraison_tarif,
          },
        },
      });
      if (existant) {
        return res.status(409).json({
          message: "Un tarif existe déjà pour cette wilaya et ce type de livraison.",
        });
      }

      const idTarif = await getMaxValue("tarif_livraison", "id_tarif", null);

      const nouveauTarif = await prisma.tarif_livraison.create({
        data: {
          id_tarif: idTarif,
          code_wilaya_tarif: parseInt(code_wilaya_tarif, 10),
          nom_wilaya_tarif: nom_wilaya_tarif.trim(),
          type_livraison_tarif,
          prix_livraison_tarif: parseFloat(prix_livraison_tarif),
          actif_tarif: actif_tarif !== undefined ? actif_tarif : true,
        },
      });

      res.status(201).json(nouveauTarif);
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({
          message: "Un tarif existe déjà pour cette wilaya et ce type de livraison.",
        });
      }
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const getAllTarifsLivraison = async (req, res) => {
  const { code_wilaya_tarif, type_livraison_tarif, actif_tarif } = req.query;

  const whereClause = {};
  if (code_wilaya_tarif && !isNaN(parseInt(code_wilaya_tarif, 10))) {
    whereClause.code_wilaya_tarif = parseInt(code_wilaya_tarif, 10);
  }
  if (
    type_livraison_tarif &&
    TYPES_LIVRAISON.includes(type_livraison_tarif.toUpperCase())
  ) {
    whereClause.type_livraison_tarif = type_livraison_tarif.toUpperCase();
  }
  if (actif_tarif === "true" || actif_tarif === "false") {
    whereClause.actif_tarif = actif_tarif === "true";
  }

  try {
    const tarifs = await prisma.tarif_livraison.findMany({
      where: whereClause,
      orderBy: [
        { code_wilaya_tarif: "asc" },
        { type_livraison_tarif: "asc" },
      ],
    });

    res.status(200).json(tarifs);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getTarifLivraisonById = async (req, res) => {
  const idTarif = parseInt(req.params.id, 10);
  if (isNaN(idTarif)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  try {
    const tarif = await prisma.tarif_livraison.findUnique({
      where: { id_tarif: idTarif },
    });
    if (!tarif) {
      return res.status(404).json({ message: "Tarif introuvable." });
    }

    res.status(200).json(tarif);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const updateTarifLivraison = [
  body("code_wilaya_tarif")
    .optional()
    .isInt({ min: 1, max: 58 })
    .withMessage("Le code wilaya doit être entre 1 et 58"),
  body("nom_wilaya_tarif")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le nom de la wilaya est obligatoire"),
  body("type_livraison_tarif")
    .optional()
    .customSanitizer((value) =>
      typeof value === "string" ? value.trim().toUpperCase() : value,
    )
    .isIn(TYPES_LIVRAISON)
    .withMessage(
      `Le type de livraison doit être ${TYPES_LIVRAISON.join(", ")}`,
    ),
  body("prix_livraison_tarif")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Le prix de livraison doit être un nombre positif ou nul"),
  body("actif_tarif")
    .optional()
    .isBoolean()
    .withMessage("L'activation du tarif doit être un booléen"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idTarif = parseInt(req.params.id, 10);
    if (isNaN(idTarif)) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const {
      code_wilaya_tarif,
      nom_wilaya_tarif,
      type_livraison_tarif,
      prix_livraison_tarif,
      actif_tarif,
    } = req.body;

    try {
      const tarif = await prisma.tarif_livraison.findUnique({
        where: { id_tarif: idTarif },
      });
      if (!tarif) {
        return res.status(404).json({ message: "Tarif introuvable." });
      }

      const codeEffectif =
        code_wilaya_tarif !== undefined
          ? parseInt(code_wilaya_tarif, 10)
          : tarif.code_wilaya_tarif;
      const typeEffectif =
        type_livraison_tarif !== undefined
          ? type_livraison_tarif
          : tarif.type_livraison_tarif;

      if (
        codeEffectif !== tarif.code_wilaya_tarif ||
        typeEffectif !== tarif.type_livraison_tarif
      ) {
        const conflit = await prisma.tarif_livraison.findUnique({
          where: {
            code_wilaya_tarif_type_livraison_tarif: {
              code_wilaya_tarif: codeEffectif,
              type_livraison_tarif: typeEffectif,
            },
          },
        });
        if (conflit) {
          return res.status(409).json({
            message:
              "Un tarif existe déjà pour cette wilaya et ce type de livraison.",
          });
        }
      }

      const dataToUpdate = {};
      if (code_wilaya_tarif !== undefined) {
        dataToUpdate.code_wilaya_tarif = parseInt(code_wilaya_tarif, 10);
      }
      if (nom_wilaya_tarif !== undefined) {
        dataToUpdate.nom_wilaya_tarif = nom_wilaya_tarif.trim();
      }
      if (type_livraison_tarif !== undefined) {
        dataToUpdate.type_livraison_tarif = type_livraison_tarif;
      }
      if (prix_livraison_tarif !== undefined) {
        dataToUpdate.prix_livraison_tarif = parseFloat(prix_livraison_tarif);
      }
      if (actif_tarif !== undefined) {
        dataToUpdate.actif_tarif = actif_tarif;
      }

      if (Object.keys(dataToUpdate).length === 0) {
        return res
          .status(400)
          .json({ message: "Aucune donnée à mettre à jour fournie." });
      }

      const tarifModifie = await prisma.tarif_livraison.update({
        where: { id_tarif: idTarif },
        data: dataToUpdate,
      });

      res.status(200).json(tarifModifie);
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({
          message: "Un tarif existe déjà pour cette wilaya et ce type de livraison.",
        });
      }
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const deleteTarifLivraison = async (req, res) => {
  const idTarif = parseInt(req.params.id, 10);
  if (isNaN(idTarif)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  try {
    const tarif = await prisma.tarif_livraison.findUnique({
      where: { id_tarif: idTarif },
    });
    if (!tarif) {
      return res.status(404).json({ message: "Tarif introuvable." });
    }

    await prisma.tarif_livraison.delete({ where: { id_tarif: idTarif } });

    res.status(200).json({ message: "Tarif supprimé avec succès." });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};
