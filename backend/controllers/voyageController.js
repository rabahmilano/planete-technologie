import prisma from "../config/dbConfig.js";
import { body, param, validationResult } from "express-validator";
import { getMaxValue } from "../config/utils.js";

// ==========================================
// LECTURE DES VOYAGES
// ==========================================

export const getAllVoyages = async (req, res) => {
  try {
    const voyages = await prisma.voyage.findMany({
      include: {
        compte_defaut: {
          select: { designation_cpt: true, dev_code: true },
        },
        _count: {
          select: { depenses: true, transactions: true },
        },
      },
      orderBy: { date_depart: "desc" },
    });

    res.status(200).json(voyages);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getVoyageById = async (req, res) => {
  const { id } = req.params;
  try {
    const voyage = await prisma.voyage.findUnique({
      where: { id_voyage: parseInt(id) },
      include: {
        compte_defaut: { select: { designation_cpt: true, dev_code: true } },
        depenses: {
          include: { nature_dep: true, compte: true },
          orderBy: { date_dep: "desc" },
        },
        transactions: {
          include: {
            compte: true,
            _count: { select: { colis_voyage: true } },
          },
          orderBy: { id_transaction: "desc" },
        },
      },
    });

    if (!voyage) return res.status(404).json({ message: "Voyage introuvable" });

    // Calculs rapides à la volée pour le Dashboard Front-end
    const totalDepensesDZD = voyage.depenses
      .filter((d) => !d.isAnnule)
      .reduce((sum, d) => sum + parseFloat(d.mnt_dep_dzd), 0);

    const totalAchatsDZD = voyage.transactions.reduce(
      (sum, t) =>
        sum + parseFloat(t.montant_total) * parseFloat(t.taux_transaction),
      0,
    );

    res.status(200).json({
      ...voyage,
      kpis: {
        totalDepensesDZD,
        totalAchatsDZD,
        coutTotalDZD: totalDepensesDZD + totalAchatsDZD,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

// ==========================================
// CRÉATION ET MODIFICATION
// ==========================================

export const addVoyage = [
  body("designation")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("La désignation est obligatoire"),
  body("destination").optional().isString().trim(),
  body("date_depart")
    .notEmpty()
    .withMessage("La date de départ est obligatoire"),
  body("date_retour")
    .notEmpty()
    .withMessage("La date de retour est obligatoire"),
  body("devise_destination").optional().isString().trim(),
  body("compte_defaut_id").optional({ checkFalsy: true }).isInt(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const {
      designation,
      destination,
      date_depart,
      date_retour,
      devise_destination,
      compte_defaut_id,
    } = req.body;

    try {
      const idVoyage = await getMaxValue("voyage", "id_voyage", null);

      const nouveauVoyage = await prisma.voyage.create({
        data: {
          id_voyage: idVoyage,
          designation,
          destination: destination || null,
          date_depart: new Date(date_depart),
          date_retour: new Date(date_retour),
          devise_destination: devise_destination || "CNY",
          compte_defaut_id: compte_defaut_id
            ? parseInt(compte_defaut_id)
            : null,
          statut: "EN_PREPARATION",
        },
      });

      res
        .status(201)
        .json({ message: "Voyage créé avec succès", data: nouveauVoyage });
    } catch (error) {
      res.status(500).json({ error: { message: error.message } });
    }
  },
];

export const updateVoyage = [
  param("id").isInt(),
  body("designation").isString().trim().notEmpty(),
  body("destination").optional().isString().trim(),
  body("date_depart").notEmpty(),
  body("date_retour").notEmpty(),
  body("compte_defaut_id").optional({ checkFalsy: true }).isInt(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const {
      designation,
      destination,
      date_depart,
      date_retour,
      compte_defaut_id,
    } = req.body;

    try {
      const voyage = await prisma.voyage.findUnique({
        where: { id_voyage: parseInt(id) },
      });
      if (!voyage)
        return res.status(404).json({ message: "Voyage introuvable" });
      if (voyage.statut === "CLOTURE")
        return res
          .status(403)
          .json({ message: "Impossible de modifier un voyage clôturé" });

      await prisma.voyage.update({
        where: { id_voyage: parseInt(id) },
        data: {
          designation,
          destination: destination || null,
          date_depart: new Date(date_depart),
          date_retour: new Date(date_retour),
          compte_defaut_id: compte_defaut_id
            ? parseInt(compte_defaut_id)
            : null,
        },
      });

      res.status(200).json({ message: "Voyage mis à jour." });
    } catch (error) {
      res.status(500).json({ error: { message: error.message } });
    }
  },
];

export const deleteVoyage = async (req, res) => {
  const { id } = req.params;
  try {
    const voyage = await prisma.voyage.findUnique({
      where: { id_voyage: parseInt(id) },
      include: { _count: { select: { depenses: true, transactions: true } } },
    });

    if (!voyage) return res.status(404).json({ message: "Voyage introuvable" });
    if (voyage._count.depenses > 0 || voyage._count.transactions > 0) {
      return res
        .status(403)
        .json({
          message:
            "Impossible de supprimer ce voyage car il contient des dépenses ou des transactions.",
        });
    }

    await prisma.voyage.delete({ where: { id_voyage: parseInt(id) } });
    res.status(200).json({ message: "Voyage supprimé avec succès." });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

// ==========================================
// WORKFLOW : CHANGEMENT DE STATUT & CLÔTURE (LA MAGIE DE L'ERP)
// ==========================================

export const changerStatutVoyage = async (req, res) => {
  const { id } = req.params;
  const { statut, taux_change_devise } = req.body;

  try {
    await prisma.$transaction(async (tx) => {
      const voyage = await tx.voyage.findUnique({
        where: { id_voyage: parseInt(id) },
        include: {
          depenses: { where: { isAnnule: false } },
          transactions: {
            include: { colis_voyage: { include: { colis: true } } },
          },
        },
      });

      if (!voyage) throw new Error("Voyage introuvable");

      // LOGIQUE : Passage à "EN_COURS"
      if (statut === "EN_COURS") {
        if (!taux_change_devise)
          throw new Error(
            "Le taux de change prévisionnel est requis pour démarrer le voyage.",
          );

        await tx.voyage.update({
          where: { id_voyage: parseInt(id) },
          data: {
            statut: "EN_COURS",
            taux_change_devise: parseFloat(taux_change_devise),
          },
        });
      }

      // LOGIQUE : Passage à "CLOTURE" (Calcul du prix de revient réel)
      else if (statut === "CLOTURE") {
        if (voyage.transactions.length === 0)
          throw new Error(
            "Vous ne pouvez pas clôturer un voyage sans transactions de marchandises.",
          );

        // 1. Total des Frais Annexes (Dépenses du voyage type Billet, Hôtel, etc)
        const totalFraisDZD = voyage.depenses.reduce(
          (sum, d) => sum + parseFloat(d.mnt_dep_dzd),
          0,
        );

        // 2. Total des Achats Marchandises purs (en DZD)
        let totalMarchandisesDZD = 0;
        voyage.transactions.forEach((t) => {
          // montant_total de la transaction * taux_transaction
          totalMarchandisesDZD +=
            parseFloat(t.montant_total) * parseFloat(t.taux_transaction);
        });

        // 3. Calcul du Coefficient d'Approche
        // Exemple: Achat=100.000 DZD, Frais=20.000 DZD => Total=120.000 => Coeff = 1.20 (Soit +20% sur chaque article)
        const coeffApproche =
          (totalMarchandisesDZD + totalFraisDZD) / totalMarchandisesDZD;

        // 4. On fige le voyage avec son coefficient
        await tx.voyage.update({
          where: { id_voyage: parseInt(id) },
          data: { statut: "CLOTURE", coefficient_approche: coeffApproche },
        });

        // 5. UPDATE MASSIF : On applique le coefficient sur tous les articles de ce voyage
        // Cela met à jour le pu_dzd_ttc (Prix de revient final unitaire) de chaque colis
        for (const transaction of voyage.transactions) {
          for (const cv of transaction.colis_voyage) {
            const ancienTTC = parseFloat(cv.colis.pu_dzd_ttc);
            const nouveauTTC = ancienTTC * coeffApproche;

            await tx.colis.update({
              where: { id_colis: cv.id_colis_voy },
              data: { pu_dzd_ttc: nouveauTTC },
            });
          }
        }
      }
    });

    res
      .status(200)
      .json({
        message: `Le statut du voyage est passé à ${statut} avec succès.`,
      });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};
