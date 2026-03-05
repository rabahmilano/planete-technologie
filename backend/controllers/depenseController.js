import prisma from "../config/dbConfig.js";
import { body, param, validationResult } from "express-validator";
import dayjs from "dayjs";
import { getMaxValue } from "../config/utils.js";

// ==========================================
// NATURE DE DÉPENSES
// ==========================================

export const addNatureDepense = [
  body("natDep")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("La désignation du nature de dépense est obligatoire"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { natDep } = req.body;
    const cleanedNatDep = natDep.trim().toUpperCase();

    try {
      const isExist = await prisma.nature_dep.findFirst({
        where: { designation_nat_dep: cleanedNatDep },
      });

      if (isExist) return res.status(403).json({ message: `Le type "${cleanedNatDep}" existe déja` });

      const idNatDep = await getMaxValue("nature_dep", "id_nat_dep", null);

      const newNatDep = await prisma.nature_dep.create({
        data: {
          id_nat_dep: idNatDep,
          designation_nat_dep: cleanedNatDep,
        },
      });

      res.status(201).json(newNatDep);
    } catch (error) {
      res.status(500).json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const getAllNatDep = async (req, res) => {
  try {
    const listNature = await prisma.nature_dep.findMany({
      orderBy: { designation_nat_dep: "asc" },
    });
    res.status(200).json(listNature);
  } catch (error) {
    res.status(500).json({ error: { code: error.code, message: error.message } });
  }
};

// ==========================================
// GESTION DES DÉPENSES (CRUD)
// ==========================================

export const addNewDepense = [
  // Validation incluant le nouveau champ observation (optionnel)
  body("montant").isDecimal().notEmpty().withMessage("Le montant est obligatoire"),
  body("cpt").isInt().notEmpty().withMessage("Le compte est obligatoire"),
  body("nature").isInt().notEmpty().withMessage("La nature de la dépense est obligatoire"),
  body("dateDepense").notEmpty().withMessage("La date est obligatoire"),
  body("observation").optional({ checkFalsy: true }).isString().trim(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { montant, cpt, nature, dateDepense, observation } = req.body;

    try {
      const newDepense = await prisma.$transaction(async (tx) => {
        const infoCompte = await tx.compte.findUnique({
          where: { id_cpt: parseInt(cpt) },
          select: { solde_actuel: true, taux_change_actuel: true },
        });

        if (!infoCompte) throw new Error("COMPTE_NOT_FOUND");
        if (parseFloat(infoCompte.solde_actuel) < parseFloat(montant)) throw new Error("INSUFFICIENT_FUNDS");

        const newId = await getMaxValue("depense", "id_op_dep", null);
        const mnt_dep_dzd = parseFloat(montant) * parseFloat(infoCompte.taux_change_actuel);

        // Création avec observation et statut par défaut
        const depenseCree = await tx.depense.create({
          data: {
            id_op_dep: newId,
            date_dep: new Date(dateDepense),
            mnt_dep: parseFloat(montant),
            mnt_dep_dzd: mnt_dep_dzd,
            cpt_id: parseInt(cpt),
            nat_dep_id: parseInt(nature),
            observation: observation || null,
            isAnnule: false
          },
        });

        // Décrémentation du compte
        await tx.compte.update({
          where: { id_cpt: parseInt(cpt) },
          data: { solde_actuel: { decrement: parseFloat(montant) } },
        });

        return depenseCree;
      });

      res.status(201).json(newDepense);
    } catch (error) {
      if (error.message === "COMPTE_NOT_FOUND") return res.status(404).json({ error: { message: "Compte introuvable." } });
      if (error.message === "INSUFFICIENT_FUNDS") return res.status(403).json({ error: { message: "Solde insuffisant pour cette dépense." } });
      res.status(500).json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const updateDepense = [
  param("id").isInt().withMessage("L'ID de la dépense doit être un entier"),
  body("nature").isInt().notEmpty().withMessage("La nature est obligatoire"),
  body("observation").optional({ checkFalsy: true }).isString().trim(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { nature, observation } = req.body;

    try {
      // on ne touche pas au solde des comptes !
      const oldDep = await prisma.depense.findUnique({ where: { id_op_dep: parseInt(id) } });
      
      if (!oldDep) return res.status(404).json({ error: { message: "Dépense introuvable." } });
      if (oldDep.isAnnule) return res.status(403).json({ error: { message: "Impossible de modifier une dépense annulée." } });

      // Mise à jour uniquement des champs textuels/catégoriques
      await prisma.depense.update({
        where: { id_op_dep: parseInt(id) },
        data: {
          nat_dep_id: parseInt(nature),
          observation: observation || null
        }
      });

      res.status(200).json({ message: "Dépense mise à jour avec succès (Reclassement)." });
    } catch (error) {
      res.status(500).json({ error: { code: error.code, message: error.message } });
    }
  }
];

// update complet l'enregistrement
// export const updateDepense = [
//   param("id").isInt().withMessage("L'ID de la dépense doit être un entier"),
//   body("montant").isDecimal().notEmpty(),
//   body("cpt").isInt().notEmpty(),
//   body("nature").isInt().notEmpty(),
//   body("dateDepense").notEmpty(),
//   body("observation").optional({ checkFalsy: true }).isString().trim(),

//   async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

//     const { id } = req.params;
//     const { montant, cpt, nature, dateDepense, observation } = req.body;
    
//     const newMontant = parseFloat(montant);
//     const newCptId = parseInt(cpt);

//     try {
//       await prisma.$transaction(async (tx) => {
//         const oldDep = await tx.depense.findUnique({ where: { id_op_dep: parseInt(id) } });
        
//         if (!oldDep) throw new Error("NOT_FOUND");
//         if (oldDep.isAnnule) throw new Error("IS_ANNULE");

//         const infoNouveauCompte = await tx.compte.findUnique({ 
//           where: { id_cpt: newCptId }, 
//           select: { solde_actuel: true, taux_change_actuel: true } 
//         });
        
//         if (!infoNouveauCompte) throw new Error("COMPTE_NOT_FOUND");

//         // Calcul du nouveau montant en DZD selon le taux de change du compte ciblé
//         const mnt_dep_dzd = newMontant * parseFloat(infoNouveauCompte.taux_change_actuel);

//         // 1. Logique d'ajustement des comptes
//         if (oldDep.cpt_id !== newCptId) {
//           // Si le compte a changé : on restitue à l'ancien, on prélève sur le nouveau
//           await tx.compte.update({ where: { id_cpt: oldDep.cpt_id }, data: { solde_actuel: { increment: oldDep.mnt_dep } } });
//           if (parseFloat(infoNouveauCompte.solde_actuel) < newMontant) throw new Error("INSUFFICIENT_FUNDS");
//           await tx.compte.update({ where: { id_cpt: newCptId }, data: { solde_actuel: { decrement: newMontant } } });
//         } else {
//           // Si c'est le même compte, on gère la différence
//           const diff = newMontant - parseFloat(oldDep.mnt_dep);
//           if (diff > 0) {
//             if (parseFloat(infoNouveauCompte.solde_actuel) < diff) throw new Error("INSUFFICIENT_FUNDS");
//             await tx.compte.update({ where: { id_cpt: oldDep.cpt_id }, data: { solde_actuel: { decrement: diff } } });
//           } else if (diff < 0) {
//             await tx.compte.update({ where: { id_cpt: oldDep.cpt_id }, data: { solde_actuel: { increment: Math.abs(diff) } } });
//           }
//         }

//         // 2. Mise à jour de la dépense
//         await tx.depense.update({
//           where: { id_op_dep: parseInt(id) },
//           data: {
//             date_dep: new Date(dateDepense),
//             mnt_dep: newMontant,
//             mnt_dep_dzd: mnt_dep_dzd,
//             cpt_id: newCptId,
//             nat_dep_id: parseInt(nature),
//             observation: observation || null
//           }
//         });
//       });

//       res.status(200).json({ message: "Dépense mise à jour avec succès." });
//     } catch (error) {
//       if (error.message === "NOT_FOUND") return res.status(404).json({ error: { message: "Dépense introuvable." } });
//       if (error.message === "IS_ANNULE") return res.status(403).json({ error: { message: "Impossible de modifier une dépense annulée." } });
//       if (error.message === "COMPTE_NOT_FOUND") return res.status(404).json({ error: { message: "Nouveau compte introuvable." } });
//       if (error.message === "INSUFFICIENT_FUNDS") return res.status(403).json({ error: { message: "Fonds insuffisants." } });
//       res.status(500).json({ error: { code: error.code, message: error.message } });
//     }
//   }
// ];

export const deleteDepense = [
  param("id").isInt().withMessage("L'ID doit être un entier"),
  
  async (req, res) => {
    const { id } = req.params;

    try {
      await prisma.$transaction(async (tx) => {
        const depense = await tx.depense.findUnique({ where: { id_op_dep: parseInt(id) } });
        
        if (!depense) throw new Error("NOT_FOUND");
        if (depense.isAnnule) throw new Error("ALREADY_ANNULE");

        // 1. Restituer l'argent au compte
        await tx.compte.update({
          where: { id_cpt: depense.cpt_id },
          data: { solde_actuel: { increment: depense.mnt_dep } }
        });

        // 2. Annuler (Soft Delete) la dépense
        await tx.depense.update({
          where: { id_op_dep: parseInt(id) },
          data: { isAnnule: true }
        });
      });

      res.status(200).json({ message: "Dépense annulée avec succès. L'argent a été restitué." });
    } catch (error) {
      if (error.message === "NOT_FOUND") return res.status(404).json({ error: { message: "Dépense introuvable." } });
      if (error.message === "ALREADY_ANNULE") return res.status(403).json({ error: { message: "Cette dépense est déjà annulée." } });
      res.status(500).json({ error: { code: error.code, message: error.message } });
    }
  }
];


// ==========================================
// STATISTIQUES ET FILTRES (Lecture seule)
// ==========================================

export const getGlobalStats = async (req, res) => {
  try {
    const [totalDepensesResult, totalEpargneResult, droitsTimbreColisCount, globalDepensesRaw, naturesList] =
      await Promise.all([
        prisma.depense.aggregate({
          _sum: { mnt_dep_dzd: true },
          where: {
            isAnnule: false, // <-- Exclusion des annulations
            nature_dep: { designation_nat_dep: { not: "COFFRE FORT" } },
          },
        }),
        prisma.depense.aggregate({
          _sum: { mnt_dep_dzd: true },
          where: { 
            isAnnule: false, // <-- Exclusion des annulations
            nature_dep: { designation_nat_dep: "COFFRE FORT" } 
          },
        }),
        prisma.colis.count({
          where: { droits_timbre: true },
        }),
        prisma.depense.groupBy({
          by: ['nat_dep_id'],
          _sum: { mnt_dep_dzd: true },
          where: { isAnnule: false } // <-- Exclusion des annulations
        }),
        prisma.nature_dep.findMany()
      ]);

    const totalDroitsTimbreColis = droitsTimbreColisCount * 130;

    const natureMap = {};
    naturesList.forEach(n => {
      natureMap[n.id_nat_dep] = n.designation_nat_dep;
    });

    let globalChartData = globalDepensesRaw
      .filter(g => natureMap[g.nat_dep_id] !== "COFFRE FORT")
      .map(g => ({
        name: natureMap[g.nat_dep_id] || "Autre",
        value: parseFloat(g._sum.mnt_dep_dzd) || 0
      }))
      .filter(item => item.value > 0);

    res.status(200).json({
      totalDepenses: totalDepensesResult._sum.mnt_dep_dzd || 0,
      totalDroitsTimbreColis: totalDroitsTimbreColis,
      totalEpargne: totalEpargneResult._sum.mnt_dep_dzd || 0,
      globalChartData: globalChartData
    });
  } catch (error) {
    res.status(500).json({ error: { code: error.code, message: error.message } });
  }
};

export const getDepensesFiltrees = async (req, res) => {
  const { page = 1, limit = 10, nature, periode } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  let dateWhereClause = {};
  if (periode && periode !== "all") {
    let startDate;
    if (["1m", "3m", "6m"].includes(periode)) {
      const months = parseInt(periode.replace("m", ""));
      startDate = dayjs().subtract(months, "month").toDate();
    } else if (!isNaN(parseInt(periode, 10))) {
      startDate = dayjs(periode).startOf("year").toDate();
      const endDate = dayjs(periode).endOf("year").toDate();
      dateWhereClause = { gte: startDate, lte: endDate };
    }
    if (startDate && !dateWhereClause.gte) {
      dateWhereClause = { gte: startDate };
    }
  }

  try {
    const natureId = nature ? parseInt(nature, 10) : null;
    const noNatureFilter = !natureId;
    const natureIsColisTimbre = natureId === 99;

    let depensesFromDbPromise = Promise.resolve([]);
    let droitsTimbreFromColisPromise = Promise.resolve([]);

    if (noNatureFilter || !natureIsColisTimbre) {
      // Filtrage STRICT des dépenses non annulées
      const whereDepense = { 
        date_dep: dateWhereClause,
        isAnnule: false // <-- Exclusion des annulations
      };
      
      if (natureId) {
        whereDepense.nat_dep_id = natureId;
      }

      depensesFromDbPromise = prisma.depense.findMany({
        where: whereDepense,
        select: {
          id_op_dep: true,
          date_dep: true,
          mnt_dep_dzd: true,
          observation: true, // <-- Ajout pour l'affichage
          isAnnule: true,
          nature_dep: { select: { designation_nat_dep: true } },
        },
      });
    }

    if (noNatureFilter || natureIsColisTimbre) {
      droitsTimbreFromColisPromise = prisma.colis.findMany({
        where: {
          droits_timbre: true,
          date_stock: { not: null, ...dateWhereClause },
        },
      });
    }

    const [depensesResult, droitsTimbreResult] = await Promise.all([
      depensesFromDbPromise,
      droitsTimbreFromColisPromise,
    ]);

    const formattedDepenses = depensesResult.map((d) => ({
      id: `d-${d.id_op_dep}`,
      nature: d.nature_dep?.designation_nat_dep || "N/A",
      date: d.date_dep,
      montant: d.mnt_dep_dzd,
      observation: d.observation, // <-- Transmission au front
      isAnnule: d.isAnnule
    }));

    const timbresParMois = droitsTimbreResult.reduce((acc, c) => {
      const moisCle = dayjs(c.date_stock).format('YYYY-MM');
      if (!acc[moisCle]) acc[moisCle] = 0;
      acc[moisCle] += 130;
      return acc;
    }, {});

    const formattedDroitsTimbre = Object.keys(timbresParMois).map((moisCle) => {
      const dernierJour = dayjs(`${moisCle}-01`).endOf('month').toDate();
      return {
        id: `timbre-mensuel-${moisCle}`,
        nature: "DROITS DE TIMBRE (MENSUEL)",
        date: dernierJour,
        montant: timbresParMois[moisCle],
        observation: `Regroupement automatique du mois`,
        isAnnule: false
      };
    });

    let allDepenses = [...formattedDepenses, ...formattedDroitsTimbre];
    allDepenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = allDepenses.length;
    const paginatedDepenses = allDepenses.slice(skip, skip + limitNum);

    res.status(200).json({
      depenses: paginatedDepenses,
      total: total,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur interne du serveur.", details: error.message });
  }
};