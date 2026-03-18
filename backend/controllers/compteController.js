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
      await prisma.$transaction(async (tx) => {
        const id_op = await getMaxValue("crediter", "id_op_crd", null);
        const cptIdInt = parseInt(cpt, 10);

        await tx.crediter.create({
          data: {
            id_op_crd: id_op,
            date_op: new Date(dateOp),
            montant_op: mnt,
            taux_change: taux,
            compte: {
              connect: {
                id_cpt: cptIdInt,
              },
            },
          },
        });

        const infoCompte = await tx.compte.findUnique({
          where: {
            id_cpt: cptIdInt,
          },
          select: {
            solde_actuel: true,
            taux_change_actuel: true,
            designation_cpt: true,
            type_cpt: true,
          },
        });

        const soldeAncien = parseFloat(infoCompte.solde_actuel || 0);
        const tauxAncien = parseFloat(infoCompte.taux_change_actuel || 0);
        const montantAjout = parseFloat(mnt);
        const tauxAjout = parseFloat(taux);

        const newTauxChange =
          Math.round(
            ((soldeAncien * tauxAncien + montantAjout * tauxAjout) /
              (soldeAncien + montantAjout) +
              Number.EPSILON) *
              100,
          ) / 100;

        await tx.compte.update({
          where: {
            id_cpt: cptIdInt,
          },
          data: {
            solde_actuel: {
              increment: montantAjout,
            },
            taux_change_actuel: newTauxChange,
          },
        });

        // Déduction de la Caisse DZD pour tout crédit d'un compte COMMUN
        if (
          infoCompte.type_cpt === "COMMUN" &&
          infoCompte.designation_cpt !== "Caisse"
        ) {
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
            throw new Error("INSUFFICIENT_FUNDS");
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
        .json({ message: "Votre compte a été mis à jour avec succès!" });
    } catch (error) {
      if (error.message === "INSUFFICIENT_FUNDS") {
        return res.status(400).json({
          message:
            "Le solde de la CAISSE est insuffisant pour créditer ce compte.",
        });
      }

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
    .withMessage("Le type du compte est obligatoire"),
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
  body("commissionPct")
    .optional({ nullable: true, checkFalsy: true })
    .isNumeric()
    .withMessage("La commission doit être un nombre"),

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

    const { typeCpt, desCpt, devise, commissionPct } = req.body;

    const cleanedType = typeCpt.toUpperCase();
    const cleanedDes = normalizeString(desCpt);
    const cleanedDevise = devise.trim();
    const cleanedCommission = commissionPct ? parseFloat(commissionPct) : 0.0;

    try {
      const isExist = await prisma.compte.findFirst({
        where: {
          dev_code: cleanedDevise,
          type_cpt: cleanedType,
          designation_cpt: cleanedDes,
        },
      });

      if (isExist) {
        return res.status(403).json({ message: "Ce compte existe déjà" });
      }

      const idCpt = await getMaxValue("compte", "id_cpt", null);

      const newCompte = await prisma.compte.create({
        data: {
          id_cpt: idCpt,
          dev_code: cleanedDevise,
          type_cpt: cleanedType,
          designation_cpt: cleanedDes,
          commission_pct: cleanedCommission,
        },
      });

      return res.status(201).json(newCompte);
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({
          error: {
            code: "P2002",
            message: "Erreur d'unicité : identifiant déjà utilisé.",
          },
        });
      }

      return res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

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
