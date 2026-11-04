import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";
import { getMaxValue, arrondir } from "../config/utils.js";

export const crediterCompte = [
  body("compteId")
    .isInt({ min: 1 })
    .withMessage("Le compte est obligatoire et doit être un identifiant entier"),
  body("montantSaisi")
    .matches(/^\d+(?:\.\d{1,2})?$/)
    .withMessage("Le montant doit être un nombre positif avec au maximum 2 décimales")
    .custom((value) => Number(value) >= 1 && Number(value) <= 99999999.99)
    .withMessage("Le montant doit être compris entre 1 et 99 999 999,99"),
  body("tauxChange")
    .matches(/^\d+(?:\.\d{1,2})?$/)
    .withMessage("Le taux doit être un nombre positif avec au maximum 2 décimales")
    .custom((value) => Number(value) >= 1 && Number(value) <= 99999999.99)
    .withMessage("Le taux de change doit être compris entre 1 et 99 999 999,99"),
  body("dateOperation")
    .isISO8601({ strict: true })
    .withMessage("La date d'opération est invalide"),
  body("strategieCredit")
    .optional()
    .isIn(["DEVISE_RECUE", "DZD_PAYE"])
    .withMessage("La stratégie de crédit est invalide"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { compteId, montantSaisi, tauxChange, dateOperation } = req.body;
    // Compatibilité temporaire : sans stratégie explicite, l'ancien formulaire
    // conserve son comportement jusqu'à son adaptation côté frontend.
    const strategie = req.body.strategieCredit || "DEVISE_RECUE";

    // Les montants manipulés en centimes évitent les erreurs binaires des floats.
    const toCents = (value) => {
      const [whole, fraction = ""] = String(value).split(".");
      return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    };
    const fromCents = (value) => value / 100;
    const truncateToCents = (numeratorCents, rateCents) =>
      Math.floor((numeratorCents * 100) / rateCents);

    try {
      await prisma.$transaction(async (tx) => {
        const cptIdInt = Number(compteId);
        const montantSaisiCentimes = toCents(montantSaisi);
        const tauxCentimes = toCents(tauxChange);

        if (!Number.isSafeInteger(cptIdInt)) throw new Error("INVALID_ACCOUNT_ID");

        const infoCompte = await tx.compte.findUnique({
          where: { id_cpt: cptIdInt },
          select: {
            solde_actuel: true,
            taux_change_actuel: true,
            designation_cpt: true,
            type_cpt: true,
          },
        });

        if (!infoCompte) throw new Error("COMPTE_NOT_FOUND");

        let montantAjoutCentimes;
        let montantADeduireCentimes;
        let tauxEffectif;

        if (strategie === "DZD_PAYE") {
          montantADeduireCentimes = montantSaisiCentimes;
          montantAjoutCentimes = truncateToCents(
            montantSaisiCentimes,
            tauxCentimes,
          );

          if (montantAjoutCentimes < 1) {
            throw new Error("CREDIT_AMOUNT_TOO_SMALL");
          }

          tauxEffectif =
            montantADeduireCentimes / montantAjoutCentimes;
        } else {
          montantAjoutCentimes = montantSaisiCentimes;
          montantADeduireCentimes = Math.round(
            (montantAjoutCentimes * tauxCentimes) / 100,
          );
          tauxEffectif = fromCents(tauxCentimes);
        }

        const montantAjout = fromCents(montantAjoutCentimes);
        const montantPayeDzd = fromCents(montantADeduireCentimes);
        const tauxAjout = fromCents(tauxCentimes);
        const tauxValorisation = arrondir(tauxEffectif);

        let montantDzdCaisse = null;

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

          const soldeDisponibleCaisseCentimes =
            toCents(caisse.solde_actuel) -
            toCents(caisse.solde_bloque || 0);

          if (soldeDisponibleCaisseCentimes < montantADeduireCentimes) {
            throw new Error("INSUFFICIENT_FUNDS");
          }

          const debitCaisse = await tx.compte.updateMany({
            where: {
              id_cpt: caisse.id_cpt,
              solde_actuel: {
                gte: fromCents(
                  toCents(caisse.solde_bloque || 0) +
                    montantADeduireCentimes,
                ),
              },
            },
            data: {
              solde_actuel: { decrement: montantPayeDzd },
            },
          });

          if (debitCaisse.count !== 1) {
            throw new Error("INSUFFICIENT_FUNDS");
          }
          montantDzdCaisse = montantPayeDzd;
        }

        const soldeAncien = Number(infoCompte.solde_actuel || 0);
        const tauxAncien = Number(infoCompte.taux_change_actuel || 0);
        const soldeNouveau = soldeAncien + montantAjout;

        const newTauxChange =
          soldeNouveau > 0
            ? arrondir(
                (soldeAncien * tauxAncien +
                  montantPayeDzd) /
                  soldeNouveau,
              )
            : tauxValorisation;

        const id_op = await getMaxValue("crediter", "id_op_crd", null);

        await tx.crediter.create({
          data: {
            id_op_crd: id_op,
            date_op: new Date(dateOperation),
            montant_op: montantAjout,
            taux_change:
              strategie === "DZD_PAYE" ? tauxValorisation : tauxAjout,
            compte: {
              connect: {
                id_cpt: cptIdInt,
              },
            },
          },
        });

        await tx.compte.update({
          where: { id_cpt: cptIdInt },
          data: {
            solde_actuel: { increment: montantAjout },
            taux_change_actuel: newTauxChange,
          },
        });
      });

      return res.status(200).json({
        message: "Votre compte a été mis à jour avec succès!",
      });
    } catch (error) {
      if (error.message === "COMPTE_NOT_FOUND") {
        return res.status(404).json({ message: "Compte introuvable." });
      }
      if (error.message === "INVALID_ACCOUNT_ID") {
        return res.status(400).json({ message: "Identifiant de compte invalide." });
      }
      if (error.message === "CREDIT_AMOUNT_TOO_SMALL") {
        return res.status(400).json({
          message: "Le montant payé est trop faible pour créditer 0,01 unité de devise.",
        });
      }
      if (error.message === "INSUFFICIENT_FUNDS") {
        return res.status(400).json({
          message:
            "Le solde disponible de la CAISSE est insuffisant (fonds bloqués déduits).",
        });
      }
      if (error.message === "CAISSE_NOT_FOUND") {
        return res
          .status(404)
          .json({ message: "Compte 'Caisse' introuvable." });
      }

      return res
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

export const annulerCredit = [
  async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Identifiant de créditation invalide." });
    }

    try {
      await prisma.$transaction(async (tx) => {
        const operation = await tx.crediter.findUnique({
          where: { id_op_crd: id },
          include: {
            compte: {
              select: {
                solde_actuel: true,
                solde_bloque: true,
                taux_change_actuel: true,
                type_cpt: true,
                designation_cpt: true,
              },
            },
            sortie_remboursee: { select: { id_sortie: true } },
          },
        });

        if (!operation) throw new Error("CREDIT_NOT_FOUND");
        if (operation.isAnnule) throw new Error("CREDIT_ALREADY_CANCELED");
        if (operation.sortie_remboursee) throw new Error("CREDIT_LINKED_TO_REFUND");

        const compte = operation.compte;
        const montant = Number(operation.montant_op);
        const tauxCredit = Number(operation.taux_change);
        const soldeActuel = Number(compte.solde_actuel || 0);
        const soldeBloque = Number(compte.solde_bloque || 0);
        const tauxActuel = Number(compte.taux_change_actuel || 0);
        const nouveauSolde = arrondir(soldeActuel - montant);

        if (montant <= 0 || nouveauSolde < 0 || nouveauSolde - soldeBloque < 0) {
          throw new Error("INSUFFICIENT_ACCOUNT_FUNDS");
        }

        let nouveauTaux = 0;
        if (nouveauSolde > 0) {
          nouveauTaux = arrondir(
            (soldeActuel * tauxActuel - montant * tauxCredit) / nouveauSolde,
          );
          if (nouveauTaux < 0) throw new Error("INVALID_REVERSE_VALUATION");
        }

        // Les anciennes opérations qui ont débité la Caisse sont identifiées
        // par montant_dzd; les remboursements exceptionnels n'ont pas ce champ.
        const doitRestituerCaisse =
          compte.type_cpt === "COMMUN" && compte.designation_cpt !== "Caisse";

        if (doitRestituerCaisse) {
          const caisse = await tx.compte.findFirst({
            where: { designation_cpt: "Caisse" },
            select: { id_cpt: true },
          });
          if (!caisse) throw new Error("CAISSE_NOT_FOUND");
          await tx.compte.update({
            where: { id_cpt: caisse.id_cpt },
            data: { solde_actuel: { increment: arrondir(montant * tauxCredit) } },
          });
        }

        await tx.compte.update({
          where: { id_cpt: operation.cpt_id },
          data: {
            solde_actuel: { decrement: montant },
            taux_change_actuel: nouveauTaux,
          },
        });

        await tx.crediter.update({
          where: { id_op_crd: id },
          data: { isAnnule: true },
        });
      });

      return res.status(200).json({ message: "Créditation annulée et solde recalculé." });
    } catch (error) {
      const messages = {
        CREDIT_NOT_FOUND: "Créditation introuvable.",
        CREDIT_ALREADY_CANCELED: "Cette créditation est déjà annulée.",
        CREDIT_LINKED_TO_REFUND: "Cette créditation est liée au remboursement d'une sortie exceptionnelle. Annulez d'abord cette décision depuis le module concerné.",
        INSUFFICIENT_ACCOUNT_FUNDS: "Annulation impossible : le solde disponible du compte est insuffisant.",
        INVALID_REVERSE_VALUATION: "Annulation impossible : le taux moyen recalculé serait négatif.",
        CAISSE_NOT_FOUND: "Le compte Caisse est introuvable.",
      };
      const status = error.message === "CREDIT_NOT_FOUND" || error.message === "CAISSE_NOT_FOUND" ? 404 : 409;
      return res.status(status).json({ message: messages[error.message] || "Erreur lors de l'annulation de la créditation." });
    }
  },
];

export const getHistoriqueCredit = async (req, res) => {
  const { id } = req.params;
  try {
    const historique = await prisma.crediter.findMany({
      where: { cpt_id: parseInt(id, 10) },
      orderBy: { date_op: "desc" },
    });
    res.status(200).json(historique);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
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
