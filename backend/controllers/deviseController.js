import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";

// ==========================================
// AJOUTER UNE DEVISE
// ==========================================
export const addDevise = [
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

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

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
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ error: { code: "P2002", message: "Devise already exists" } });
      }

      return res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

// ==========================================
// LISTER TOUTES LES DEVISES
// ==========================================
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