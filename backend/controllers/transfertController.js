import prisma from "../config/dbConfig.js";
import { body, param, validationResult } from "express-validator";
import { arrondir, getMaxValue } from "../config/utils.js";

export const executeTransfert = [
  body("cptSource").isInt().notEmpty().withMessage("Source obligatoire"),
  body("cptDest").isInt().notEmpty().withMessage("Destination obligatoire"),
  body("montant").isDecimal().notEmpty().withMessage("Montant obligatoire"),
  body("dateTransfert").notEmpty().withMessage("Date obligatoire"),
  body("observation").optional({ checkFalsy: true }).isString().trim(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { cptSource, cptDest, montant, dateTransfert, observation } =
      req.body;

    const sourceId = parseInt(cptSource, 10);
    const destId = parseInt(cptDest, 10);
    const montantSaisi = arrondir(parseFloat(montant));

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
        if (infoSource.dev_code !== infoDest.dev_code)
          throw new Error("DEVISE_MISMATCH");

        const soldeDisponible = arrondir(
          parseFloat(infoSource.solde_actuel) -
            parseFloat(infoSource.solde_bloque || 0),
        );
        if (soldeDisponible < montantSaisi)
          throw new Error("INSUFFICIENT_FUNDS");

        const tauxSource = parseFloat(infoSource.taux_change_actuel || 0);
        const soldeDestAncien = parseFloat(infoDest.solde_actuel || 0);
        const tauxDestAncien = parseFloat(infoDest.taux_change_actuel || 0);

        const nouveauTauxDest = arrondir(
          (soldeDestAncien * tauxDestAncien + montantSaisi * tauxSource) /
            (soldeDestAncien + montantSaisi),
        );

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
            solde_actuel: { increment: montantSaisi },
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
        DEVISE_MISMATCH: "Les devises doivent être identiques.",
        INSUFFICIENT_FUNDS: "Fonds insuffisants (Fonds bloqués atteints).",
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

        const montantARendre = parseFloat(transfert.montant);
        const soldeDisponibleDest = arrondir(
          parseFloat(infoDest.solde_actuel) -
            parseFloat(infoDest.solde_bloque || 0),
        );

        if (soldeDisponibleDest < montantARendre)
          throw new Error("DEST_INSUFFICIENT_FUNDS");

        const tauxTransfertInitial = parseFloat(transfert.taux_source);

        const soldeSourceAncien = parseFloat(infoSource.solde_actuel || 0);
        const tauxSourceAncien = parseFloat(infoSource.taux_change_actuel || 0);

        const nouveauTauxSource = arrondir(
          (soldeSourceAncien * tauxSourceAncien +
            montantARendre * tauxTransfertInitial) /
            (soldeSourceAncien + montantARendre),
        );

        const soldeDestAncien = parseFloat(infoDest.solde_actuel || 0);
        const tauxDestAncien = parseFloat(infoDest.taux_change_actuel || 0);
        const nouveauSoldeDest = arrondir(soldeDestAncien - montantARendre);

        let nouveauTauxDest = 0;
        if (nouveauSoldeDest > 0) {
          nouveauTauxDest = arrondir(
            (soldeDestAncien * tauxDestAncien -
              montantARendre * tauxTransfertInitial) /
              nouveauSoldeDest,
          );
        }

        await tx.compte.update({
          where: { id_cpt: transfert.cpt_dest_id },
          data: {
            solde_actuel: { decrement: montantARendre },
            taux_change_actuel: nouveauTauxDest,
          },
        });

        await tx.compte.update({
          where: { id_cpt: transfert.cpt_source_id },
          data: {
            solde_actuel: { increment: montantARendre },
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
        DEST_INSUFFICIENT_FUNDS:
          "Le compte de destination n'a plus assez de fonds pour annuler.",
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
