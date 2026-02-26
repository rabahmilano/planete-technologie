import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";

import dayjs from "dayjs";

import { getMaxValue } from "../config/utils.js";

export const addNatureDepense = [
  body("natDep")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("La désignation du nature de dépense est obligatoire"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { natDep } = req.body;

    const cleanedNatDep = natDep.trim().toUpperCase();

    try {
      const isExist = await prisma.nature_dep.findFirst({
        where: {
          designation_nat_dep: cleanedNatDep,
        },
      });

      if (isExist) {
        return res
          .status(403)
          .json({ message: `Le type "${cleanedNatDep}" existe déja` });
      }

      const idNatDep = await getMaxValue("nature_dep", "id_nat_dep", null);

      const newNatDep = await prisma.nature_dep.create({
        data: {
          id_nat_dep: idNatDep,
          designation_nat_dep: cleanedNatDep,
        },
      });

      res.status(201).json(newNatDep);
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const getAllNatDep = async (req, res) => {
  try {
    const listNature = await prisma.nature_dep.findMany({
      orderBy: {
        designation_nat_dep: "asc",
      },
    });

    res.status(200).json(listNature);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const addNewDepense = [
  body("montant")
    .isDecimal()
    .notEmpty()
    .withMessage("Le montant est obligatoire"),
  body("cpt").isDecimal().notEmpty().withMessage("Le compte est obligatoire"),
  body("nature")
    .isNumeric()
    .notEmpty()
    .withMessage("La nature du dépense est obligatoire"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { montant, cpt, nature, dateDepense } = req.body;

    try {
      const newDepense = await prisma.$transaction(async (tx) => {
        const infoCompte = await prisma.compte.findUnique({
          where: {
            id_cpt: cpt,
          },
          select: {
            solde_actuel: true,
            taux_change_actuel: true,
          },
        });

        if (infoCompte.solde_actuel >= montant) {
          const newId = await getMaxValue("depense", "id_op_dep", null);
          const mnt_dep_dzd = montant * infoCompte.taux_change_actuel;

          await tx.depense.create({
            data: {
              id_op_dep: newId,
              date_dep: dateDepense,
              mnt_dep: montant,
              mnt_dep_dzd,
              cpt_id: cpt,
              nat_dep_id: nature,
            },
          });

          await tx.compte.update({
            where: {
              id_cpt: cpt,
            },
            data: {
              solde_actuel: {
                decrement: montant,
              },
            },
          });
        } else {
          res.status(405).json({ message: "Votre solde est insuffisant" });
        }
      });

      res.status(201).json(newDepense);
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const getGlobalStats = async (req, res) => {
  try {
    const [totalDepensesResult, totalEpargneResult, droitsTimbreColisCount, globalDepensesRaw, naturesList] =
      await Promise.all([
        prisma.depense.aggregate({
          _sum: { mnt_dep_dzd: true },
          where: {
            nature_dep: { designation_nat_dep: { not: "COFFRE FORT" } },
          },
        }),
        prisma.depense.aggregate({
          _sum: { mnt_dep_dzd: true },
          where: { nature_dep: { designation_nat_dep: "COFFRE FORT" } },
        }),
        prisma.colis.count({
          where: { droits_timbre: true },
        }),
        // Requête pour le graphique global
        prisma.depense.groupBy({
          by: ['nat_dep_id'],
          _sum: { mnt_dep_dzd: true },
        }),
        // Récupération des noms des natures pour le mapping
        prisma.nature_dep.findMany()
      ]);

    const totalDroitsTimbreColis = droitsTimbreColisCount * 130;

    // Création du dictionnaire pour associer l'ID à sa désignation
    const natureMap = {};
    naturesList.forEach(n => {
      natureMap[n.id_nat_dep] = n.designation_nat_dep;
    });

    // Formatage des données du graphique
    let globalChartData = globalDepensesRaw
      .filter(g => natureMap[g.nat_dep_id] !== "COFFRE FORT") // Exclusion stricte du coffre fort
      .map(g => ({
        name: natureMap[g.nat_dep_id] || "Autre",
        value: parseFloat(g._sum.mnt_dep_dzd) || 0
      }))
      .filter(item => item.value > 0); // Exclusion des montants à zéro

    res.status(200).json({
      totalDepenses: totalDepensesResult._sum.mnt_dep_dzd || 0,
      totalDroitsTimbreColis: totalDroitsTimbreColis,
      totalEpargne: totalEpargneResult._sum.mnt_dep_dzd || 0,
      globalChartData: globalChartData // Nouvelle donnée renvoyée au frontend
    });
  } catch (error) {
    console.error("Erreur dans getGlobalStats:", error);
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
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
    const natureIsColisTimbre = natureId === 99; // ID 99 pour les droits de timbre des colis

    let depensesFromDbPromise = Promise.resolve([]);
    let droitsTimbreFromColisPromise = Promise.resolve([]);

    if (noNatureFilter || !natureIsColisTimbre) {
      const whereDepense = { date_dep: dateWhereClause };
      if (natureId) {
        whereDepense.nat_dep_id = natureId;
      }

      depensesFromDbPromise = prisma.depense.findMany({
        where: whereDepense,
        select: {
          id_op_dep: true,
          date_dep: true,
          mnt_dep_dzd: true,
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
    }));

    // 1. REGROUPEMENT MENSUEL DES TIMBRES POUR LE TABLEAU
    // (droitsTimbreResult ne contient déjà que les colis avec droits_timbre = true)
    const timbresParMois = droitsTimbreResult.reduce((acc, c) => {
      const moisCle = dayjs(c.date_stock).format('YYYY-MM');
      if (!acc[moisCle]) {
        acc[moisCle] = 0;
      }
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
      };
    });

    // 2. FUSION ET PAGINATION POUR LE TABLEAU
    let allDepenses = [...formattedDepenses, ...formattedDroitsTimbre];
    allDepenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = allDepenses.length;
    const paginatedDepenses = allDepenses.slice(skip, skip + limitNum);

    res.status(200).json({
      depenses: paginatedDepenses,
      total: total,
    });
  } catch (error) {
    console.error("ERREUR DÉTAILLÉE dans getDepensesFiltrees:", error);
    res
      .status(500)
      .json({ message: "Erreur interne du serveur.", details: error.message });
  }
};
