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

        const newTauxChange =
          Math.round(
            ((infoCompte.solde_actuel * infoCompte.taux_change_actuel +
              mnt * taux) /
              (parseFloat(infoCompte.solde_actuel) + mnt) +
              Number.EPSILON) *
              100
          ) / 100;

        const compte = await tx.compte.update({
          where: {
            id_cpt: cpt,
          },
          data: {
            solde_actuel: {
              increment: mnt,
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

          if (parseFloat(caisse.solde_actuel) < mnt * taux) {
            throw new Error("Le solde de la CAISSE est insuffisant");
          }

          await tx.compte.update({
            where: {
              id_cpt: caisse.id_cpt,
            },
            data: {
              solde_actuel: { decrement: mnt * taux },
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

export const getComptesWithTauxChange = async (req, res) => {
  try {
    const comptes = await prisma.compte.findMany({
      where: {
        devise: {
          info_taux_change: {
            some: {
              date_fin: null,
            },
          },
        },
      },
      select: {
        id_cpt: true,
        designation_cpt: true,
        dev_code: true,
        devise: {
          select: {
            info_taux_change: {
              select: {
                taux_change: {
                  select: {
                    taux: true,
                  },
                },
              },
            },
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
