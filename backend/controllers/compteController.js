import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";

import { getMaxValue } from "../config/utils.js";

export const crediterCompte = [
  body("cpt").isNumeric().notEmpty().withMessage("Le compte est obligatoire"),
  body("mnt").isDecimal().notEmpty().withMessage("Le montant doit etre >= 1"),
  body("taux")
    .isDecimal()
    .notEmpty()
    .withMessage("Le taux de change doit etre >= 1"),
  body("dateOp").notEmpty().withMessage("La date est obligatoire"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cpt, mnt, taux, dateOp } = req.body;

    try {
      const updatedCompte = await prisma.$transaction(async (tx) => {
        const id_op = await getMaxValue("crediter", "id_op_crd", null);

        await tx.crediter.create({
          data: {
            id_op_crd: id_op,
            date_op: dateOp,
            montant_op: mnt,
            taux_change: taux,
            compte: {
              connect: {
                id_cpt: cpt,
              },
            },
          },
        });

        const infoCompte = await tx.compte.findUnique({
          where: {
            id_cpt: cpt,
          },
          select: {
            solde_actuel: true,
            taux_change_actuel: true,
          },
        });

        // Conversion stricte des variables Prisma Decimal pour éviter les erreurs NaN
        const soldeAncien = parseFloat(infoCompte.solde_actuel || 0);
        const tauxAncien = parseFloat(infoCompte.taux_change_actuel || 0);
        const montantAjout = parseFloat(mnt);
        const tauxAjout = parseFloat(taux);

        // Formule de moyenne pondérée intacte
        const newTauxChange =
          Math.round(
            ((soldeAncien * tauxAncien + montantAjout * tauxAjout) /
              (soldeAncien + montantAjout) +
              Number.EPSILON) *
              100
          ) / 100;

        const compte = await tx.compte.update({
          where: {
            id_cpt: cpt,
          },
          data: {
            solde_actuel: {
              increment: montantAjout,
            },
            taux_change_actuel: newTauxChange,
          },
        });

        if (compte.designation_cpt === "Wise") {
          const caisse = await tx.compte.findFirst({
            where: {
              designation_cpt: "Caisse",
            },
            select: {
              id_cpt: true,
              solde_actuel: true,
            },
          });

          const montantADeduire = montantAjout * tauxAjout;

          if (parseFloat(caisse.solde_actuel) < montantADeduire) {
            throw new Error("Le solde de la CAISSE est insuffisant");
          }

          await tx.compte.update({
            where: {
              id_cpt: caisse.id_cpt,
            },
            data: {
              solde_actuel: { decrement: montantADeduire },
            },
          });
        }
      });

      res
        .status(200)
        .json({ message: "Votre compte a ete met a jour avec succès!" });
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const addCompte = [
  body("typeCpt")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le type du compte est obligatorie"),
  body("desCpt")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("La désignation du compte est obligatoire"),
  body("devise")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("La devise du compte est obligatoire"),

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

    const { typeCpt, desCpt, devise } = req.body;

    const cleanedType = typeCpt.toUpperCase();
    const cleanedDes = normalizeString(desCpt);
    const cleanedDevise = devise.trim();

    try {
      const isExist = await prisma.compte.findFirst({
        where: {
          dev_code: cleanedDevise,
          type_cpt: cleanedType,
          designation_cpt: cleanedDes,
        },
      });

      if (isExist) {
        return res.status(403).json({ message: "Compte déjà existant" });
      }

      const idCpt = await getMaxValue("compte", "id_cpt", null);
      const newCompte = await prisma.compte.create({
        data: {
          id_cpt: idCpt,
          dev_code: cleanedDevise,
          type_cpt: cleanedType,
          designation_cpt: cleanedDes,
        },
      });

      return res.status(201).json(newCompte);
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

export const getComptesWithTauxChange = async (req, res) => {
  try {
    // La table info_taux_change n'existe plus. 
    // Requête simplifiée pour ne pas faire crasher l'application si la route est appelée.
    const comptes = await prisma.compte.findMany({
      select: {
        id_cpt: true,
        designation_cpt: true,
        dev_code: true,
        taux_change_actuel: true,
        devise: {
          select: {
            symbole_dev: true,
          },
        },
      },
    });

    res.status(200).json(comptes);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getAllComptes = async (req, res) => {
  try {
    const comptes = await prisma.compte.findMany({
      include: {
        devise: {
          select: {
            symbole_dev: true,
          },
        },
      },
      orderBy: {
        designation_cpt: "asc",
      },
    });

    res.status(200).json(comptes);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};