import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";

import { getMaxValue, getSpecialDate } from "../config/utils.js";

// Fonction pour ajouter une devise avec validation et nettoyage des données
export const addDevise = [
  // Middleware de validation
  body("codeDevise")
    .isString()
    .trim()
    .notEmpty()
    .withMessage(
      "Le code de la devise est obligatoire et devra être sous forme de chaîne de caractère"
    ),
  body("nomDevise")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le nom de la devise est obligatoire"),
  body("symboleDevise")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le symbole de la devise est obligatoire"),

  // Fonction principale de gestion des devises
  async (req, res) => {
    // Validation des erreurs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Fonction de nettoyage des données
    const normalizeString = (str) => {
      return str
        .trim()
        .toLowerCase()
        .replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
    };

    const {
      codeDevise: code,
      nomDevise: nom,
      symboleDevise: symbole,
    } = req.body;

    const cleanedCode = code.trim().toUpperCase();
    const cleanedNom = normalizeString(nom);
    const cleanedSymbole = symbole.trim().toUpperCase();

    try {
      const newDevise = await prisma.devise.create({
        data: {
          code_dev: cleanedCode,
          nom_dev: cleanedNom,
          symbole_dev: cleanedSymbole,
        },
      });

      return res.status(201).json(newDevise);
    } catch (error) {
      // Gestion des erreurs spécifiques de la base de données
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ error: { code: "P2002", message: "Devise already exists" } });
      }

      // Gestion des autres erreurs serveur
      return res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const getAllDevises = async (req, res) => {
  try {
    const devises = await prisma.devise.findMany({
      orderBy: {
        code_dev: "asc",
      },
    });
    res.status(200).send(devises);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getDevisesTaux = async (req, res) => {
  try {
    const devises = await prisma.info_taux_change.findMany({
      where: {
        date_fin: null,
      },
      select: {
        dev_code: true,
        taux_change: {
          select: {
            taux: true,
          },
        },
      },
    });

    res.status(200).json(devises);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getAllDevisesDetails = async (req, res) => {
  try {
    const devises = await prisma.info_taux_change.findMany({
      where: {
        date_fin: null,
      },
      select: {
        date_debut: true,
        taux_change: {
          select: {
            taux: true,
          },
        },
        devise: {
          select: {
            code_dev: true,
            nom_dev: true,
            symbole_dev: true,
          },
        },
      },
      orderBy: {
        devise: {
          nom_dev: "asc",
        },
      },
    });

    res.status(200).json(devises);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const addTauxDeChange = [
  body("devise")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("La devise est obligatoire"),
  body("taux")
    .isDecimal()
    .trim()
    .notEmpty()
    .withMessage("Le taux de change est obligatoire"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { devise, taux, dateTaux } = req.body;
    const idOpe = await getMaxValue("taux_change", "id_taux", null);

    try {
      const nouveauTauxChange = await prisma.$transaction(async (tx) => {
        const tauxChangeRecent = await tx.info_taux_change.findFirst({
          where: {
            date_fin: null,
            dev_code: devise,
          },
        });

        if (tauxChangeRecent) {
          await tx.info_taux_change.update({
            data: {
              date_fin: dateTaux,
            },
            where: {
              dev_code_taux_id: {
                dev_code: devise,
                taux_id: tauxChangeRecent.taux_id,
              },
            },
          });
        }

        const newTaux = await tx.taux_change.create({
          data: {
            id_taux: idOpe,
            taux: taux,
            info_taux_change: {
              create: {
                date_debut: dateTaux,
                dev_code: devise,
              },
            },
          },
        });

        return newTaux;
      });

      return res.status(200).json(nouveauTauxChange);
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];
