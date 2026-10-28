import prisma from "../config/dbConfig.js";
import { body, param, validationResult } from "express-validator";
import { arrondir, getMaxValue } from "../config/utils.js";

export const executeTransfert = [
  body("cptSource").isInt().notEmpty().withMessage("Source obligatoire"),
  body("cptDest").isInt().notEmpty().withMessage("Destination obligatoire"),
  body("montant").isDecimal().notEmpty().withMessage("Montant obligatoire"),
  body("montantDest").optional().isDecimal().withMessage("Montant reçu invalide"),
  body("dateTransfert").notEmpty().withMessage("Date obligatoire"),
  body("observation").optional({ checkFalsy: true }).isString().trim(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { cptSource, cptDest, montant, montantDest: montantDestSaisi, dateTransfert, observation } =
      req.body;

    const sourceId = parseInt(cptSource, 10);
    const destId = parseInt(cptDest, 10);
    const montantSaisi = arrondir(parseFloat(montant));

    if (!Number.isFinite(montantSaisi) || montantSaisi <= 0)
      return res.status(400).json({ message: "Montant invalide." });

    if (sourceId === destId) {
      return res
        .status(400)
        .json({ message: "Les comptes doivent être différents." });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const infoSource = await tx.compte.findUnique({
          where: { id_cpt: sourceId },
          select: {
            solde_actuel: true,
            solde_bloque: true,
            dev_code: true,
            taux_change_actuel: true,
          },
        });

        const infoDest = await tx.compte.findUnique({
          where: { id_cpt: destId },
          select: {
            solde_actuel: true,
            dev_code: true,
            taux_change_actuel: true,
          },
        });

        if (!infoSource || !infoDest) throw new Error("COMPTE_NOT_FOUND");

        const soldeDisponible = arrondir(
          parseFloat(infoSource.solde_actuel) -
            parseFloat(infoSource.solde_bloque || 0),
        );
        if (soldeDisponible < montantSaisi)
          throw new Error("INSUFFICIENT_FUNDS");

        const tauxSource = parseFloat(infoSource.taux_change_actuel || 0);
        const soldeDestAncien = parseFloat(infoDest.solde_actuel || 0);
        const tauxDestAncien = parseFloat(infoDest.taux_change_actuel || 0);
        const memeDevise = infoSource.dev_code === infoDest.dev_code;

        let montantDest = montantSaisi;
        if (!memeDevise) {
          montantDest = parseFloat(montantDestSaisi);
          if (!Number.isFinite(montantDest) || montantDest <= 0)
            throw new Error("INVALID_DESTINATION_AMOUNT");
          montantDest = Math.round((montantDest + Number.EPSILON) * 100) / 100;
        }

        const nouveauSoldeDest = arrondir(soldeDestAncien + montantDest);
        const valeurTransfertDzd = montantSaisi * tauxSource;
        const nouveauTauxDest =
          nouveauSoldeDest > 0
            ? arrondir(
                (soldeDestAncien * tauxDestAncien + valeurTransfertDzd) /
                  nouveauSoldeDest,
              )
            : tauxSource;

        const newTransfertId = await getMaxValue(
          "transfert",
          "id_transfert",
          null,
        );

        const transfertRecord = await tx.transfert.create({
          data: {
            id_transfert: newTransfertId,
            cpt_source_id: sourceId,
            cpt_dest_id: destId,
            montant: montantSaisi,
            montant_dest: montantDest,
            taux_source: tauxSource,
            date_transfert: new Date(dateTransfert),
            observation: observation || null,
          },
        });

        await tx.compte.update({
          where: { id_cpt: sourceId },
          data: { solde_actuel: { decrement: montantSaisi } },
        });

        await tx.compte.update({
          where: { id_cpt: destId },
          data: {
            solde_actuel: { increment: montantDest },
            taux_change_actuel: nouveauTauxDest,
          },
        });

        return transfertRecord;
      });

      res
        .status(201)
        .json({ message: "Transfert effectué avec succès.", data: result });
    } catch (error) {
      const messages = {
        COMPTE_NOT_FOUND: "Compte introuvable.",
        INSUFFICIENT_FUNDS: "Fonds insuffisants (Fonds bloqués atteints).",
        INVALID_EXCHANGE_RATE:
          "Conversion impossible : le taux de valorisation d'un compte est nul ou invalide.",
        INVALID_CONVERTED_AMOUNT:
          "Le montant converti est inférieur à la précision autorisée.",
        INVALID_DESTINATION_AMOUNT:
          "Le montant reçu doit être supérieur à zéro.",
      };
      res
        .status(403)
        .json({ message: messages[error.message] || error.message });
    }
  },
];

export const deleteTransfert = [
  param("id").isInt().withMessage("ID invalide"),

  async (req, res) => {
    const { id } = req.params;

    try {
      await prisma.$transaction(async (tx) => {
        const transfert = await tx.transfert.findUnique({
          where: { id_transfert: parseInt(id, 10) },
        });

        if (!transfert) throw new Error("NOT_FOUND");
        if (transfert.isAnnule) throw new Error("ALREADY_CANCELED");

        const infoDest = await tx.compte.findUnique({
          where: { id_cpt: transfert.cpt_dest_id },
          select: {
            solde_actuel: true,
            solde_bloque: true,
            taux_change_actuel: true,
          },
        });

        const infoSource = await tx.compte.findUnique({
          where: { id_cpt: transfert.cpt_source_id },
          select: { solde_actuel: true, taux_change_actuel: true },
        });

        if (!infoDest || !infoSource) throw new Error("COMPTE_NOT_FOUND");

        const montantSource = parseFloat(transfert.montant);
        const montantDest = parseFloat(
          transfert.montant_dest ?? transfert.montant,
        );
        const soldeDisponibleDest = arrondir(
          parseFloat(infoDest.solde_actuel) -
            parseFloat(infoDest.solde_bloque || 0),
        );

        if (soldeDisponibleDest < montantDest)
          throw new Error("DEST_INSUFFICIENT_FUNDS");

        const tauxTransfertInitial = parseFloat(transfert.taux_source);
        const soldeSourceAncien = parseFloat(infoSource.solde_actuel || 0);
        const tauxSourceAncien = parseFloat(infoSource.taux_change_actuel || 0);
        const nouveauSoldeSource = arrondir(soldeSourceAncien + montantSource);
        const nouveauTauxSource =
          nouveauSoldeSource > 0
            ? arrondir(
                (soldeSourceAncien * tauxSourceAncien +
                  montantSource * tauxTransfertInitial) /
                  nouveauSoldeSource,
              )
            : tauxTransfertInitial;

        const soldeDestAncien = parseFloat(infoDest.solde_actuel || 0);
        const tauxDestAncien = parseFloat(infoDest.taux_change_actuel || 0);
        const nouveauSoldeDest = arrondir(soldeDestAncien - montantDest);

        if (nouveauSoldeDest < 0) throw new Error("DEST_INSUFFICIENT_FUNDS");

        let nouveauTauxDest = 0;
        if (nouveauSoldeDest > 0) {
          nouveauTauxDest = arrondir(
            (soldeDestAncien * tauxDestAncien -
              montantSource * tauxTransfertInitial) /
              nouveauSoldeDest,
          );
          if (nouveauTauxDest < 0) throw new Error("DEST_VALUATION_INVALID");
        }

        await tx.compte.update({
          where: { id_cpt: transfert.cpt_dest_id },
          data: {
            solde_actuel: { decrement: montantDest },
            taux_change_actuel: nouveauTauxDest,
          },
        });

        await tx.compte.update({
          where: { id_cpt: transfert.cpt_source_id },
          data: {
            solde_actuel: { increment: montantSource },
            taux_change_actuel: nouveauTauxSource,
          },
        });

        await tx.transfert.update({
          where: { id_transfert: transfert.id_transfert },
          data: { isAnnule: true },
        });
      });

      res.status(200).json({
        message: "Transfert annulé et soldes restaurés avec précision.",
      });
    } catch (error) {
      const messages = {
        NOT_FOUND: "Transfert introuvable.",
        ALREADY_CANCELED: "Ce transfert est déjà annulé.",
        COMPTE_NOT_FOUND: "Compte introuvable.",
        DEST_INSUFFICIENT_FUNDS:
          "Le compte de destination n'a plus assez de fonds pour annuler.",
        DEST_VALUATION_INVALID:
          "Annulation impossible : la valorisation du compte destination deviendrait négative.",
      };
      res
        .status(403)
        .json({ message: messages[error.message] || error.message });
    }
  },
];

export const getAllTransferts = async (req, res) => {
  try {
    const list = await prisma.transfert.findMany({
      include: {
        compte_source: { select: { designation_cpt: true, dev_code: true } },
        compte_dest: { select: { designation_cpt: true, dev_code: true } },
      },
      orderBy: { date_transfert: "desc" },
    });
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
