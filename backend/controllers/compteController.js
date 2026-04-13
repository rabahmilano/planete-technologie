import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";
import { getMaxValue, arrondir } from "../config/utils.js";

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

        const montantAjout = arrondir(parseFloat(mnt));
        const tauxAjout = arrondir(parseFloat(taux));

        await tx.crediter.create({
          data: {
            id_op_crd: id_op,
            date_op: new Date(dateOp),
            montant_op: montantAjout,
            taux_change: tauxAjout,
            compte: {
              connect: {
                id_cpt: cptIdInt,
              },
            },
          },
        });

        const infoCompte = await tx.compte.findUnique({
          where: { id_cpt: cptIdInt },
          select: {
            solde_actuel: true,
            taux_change_actuel: true,
            designation_cpt: true,
            type_cpt: true,
          },
        });

        const soldeAncien = parseFloat(infoCompte.solde_actuel || 0);
        const tauxAncien = parseFloat(infoCompte.taux_change_actuel || 0);

        const newTauxChange = arrondir(
          (soldeAncien * tauxAncien + montantAjout * tauxAjout) /
            (soldeAncien + montantAjout),
        );

        await tx.compte.update({
          where: { id_cpt: cptIdInt },
          data: {
            solde_actuel: { increment: montantAjout },
            taux_change_actuel: newTauxChange,
          },
        });

        if (
          infoCompte.type_cpt === "COMMUN" &&
          infoCompte.designation_cpt !== "Caisse"
        ) {
          const caisse = await tx.compte.findFirst({
            where: { designation_cpt: "Caisse" },
            select: {
              id_cpt: true,
              solde_actuel: true,
              solde_bloque: true,
            },
          });

          if (!caisse) throw new Error("CAISSE_NOT_FOUND");

          const montantADeduire = arrondir(montantAjout * tauxAjout);
          const soldeDisponibleCaisse = arrondir(
            parseFloat(caisse.solde_actuel) -
              parseFloat(caisse.solde_bloque || 0),
          );

          if (soldeDisponibleCaisse < montantADeduire) {
            throw new Error("INSUFFICIENT_FUNDS");
          }

          await tx.compte.update({
            where: { id_cpt: caisse.id_cpt },
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
            "Le solde de la CAISSE est insuffisant (fonds bloqués atteints).",
        });
      }
      if (error.message === "CAISSE_NOT_FOUND") {
        return res
          .status(404)
          .json({ message: "Compte 'Caisse' introuvable." });
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
  body("soldeBloque")
    .optional({ nullable: true, checkFalsy: true })
    .isNumeric()
    .withMessage("Le solde bloqué doit être un nombre"),

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

    const { typeCpt, desCpt, devise, commissionPct, soldeBloque } = req.body;

    const cleanedType = typeCpt.toUpperCase();
    const cleanedDes = normalizeString(desCpt);
    const cleanedDevise = devise.trim();
    const cleanedCommission = commissionPct
      ? arrondir(parseFloat(commissionPct))
      : 0.0;
    const cleanedSoldeBloque = soldeBloque
      ? arrondir(parseFloat(soldeBloque))
      : 0.0;

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
          solde_bloque: cleanedSoldeBloque,
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

    const comptesTransformes = comptes.map((c) => {
      const soldeTotal = parseFloat(c.solde_actuel || 0);
      const soldeBloque = parseFloat(c.solde_bloque || 0);
      const taux = parseFloat(c.taux_change_actuel || 1);

      return {
        ...c,
        solde_disponible: arrondir(soldeTotal - soldeBloque),
        valeur_dzd_totale: arrondir(soldeTotal * taux),
        valeur_dzd_disponible: arrondir((soldeTotal - soldeBloque) * taux),
      };
    });

    res.status(200).json(comptesTransformes);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getBilanGlobal = async (req, res) => {
  try {
    const comptes = await prisma.compte.findMany();

    let totalGlobalDZD = 0;
    let totalDisponibleDZD = 0;
    let totalBloqueDZD = 0;

    comptes.forEach((c) => {
      const solde = parseFloat(c.solde_actuel || 0);
      const bloque = parseFloat(c.solde_bloque || 0);
      const taux = parseFloat(c.taux_change_actuel || 1);

      totalGlobalDZD += solde * taux;
      totalDisponibleDZD += (solde - bloque) * taux;
      totalBloqueDZD += bloque * taux;
    });

    res.status(200).json({
      patrimoine_total_dzd: arrondir(totalGlobalDZD),
      liquidite_disponible_dzd: arrondir(totalDisponibleDZD),
      fonds_immobilises_dzd: arrondir(totalBloqueDZD),
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};
