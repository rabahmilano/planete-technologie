import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";
import dayjs from "dayjs";

import { getMaxValue } from "../config/utils.js";

export const addCatProduit = [
  body("desCat")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le nom de la catégorie est obligatoire"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(403).json({ errors: errors.array() });
    }

    const { desCat } = req.body;
    const cleanedDesCat = desCat.trim().toUpperCase();

    try {
      const isExist = await prisma.categorie.findFirst({
        where: {
          designation_cat: cleanedDesCat,
        },
      });

      if (isExist) {
        return res
          .status(403)
          .json({ message: `Le catégorie "${cleanedDesCat}" existe déja` });
      }

      const idCat = await getMaxValue("categorie", "id_cat", null);

      const newCat = await prisma.categorie.create({
        data: {
          id_cat: idCat,
          designation_cat: cleanedDesCat,
        },
      });

      res.status(201).json(newCat);
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const getAllCategorie = async (req, res) => {
  try {
    const categories = await prisma.categorie.findMany({
      orderBy: {
        designation_cat: "asc",
      },
    });
    res.status(200).json(categories);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getNomSearch = async (req, res) => {
  const { query } = req.query;

  try {
    const produits = await prisma.produit.findMany({
      where: {
        designation_prd: {
          contains: query,
          // mode: "insensitive",
        },
      },
      select: {
        designation_prd: true,
      },
      orderBy: {
        designation_prd: "asc",
      },
      take: 15, // Ne ramène que 15 produits max
    });

    res.status(200).json(produits);
  } catch (error) {
    throw new Error(
      "Erreur lors de la récupération des produits: " + error.message
    );
  }
};

export const addColis = [
  body("cat")
    .isNumeric()
    .notEmpty()
    .withMessage("La catégorie est obligatoire"),
  body("cpt").isNumeric().notEmpty().withMessage("Le compte est obligatoire"),
  body("dateAchat").notEmpty().withMessage("La date d'achat est obligatoire"),
  body("desPrd")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le nom du produit est obligatoire"),
  body("mntTotDev")
    .isDecimal()
    .notEmpty()
    .withMessage("Le montant total est obligatoire"),
  body("qte").isNumeric().notEmpty().withMessage("La quantité est obligatoire"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cat, cpt, dateAchat, desPrd, mntTotDev, qte, taux } = req.body;

    try {
      const newColis = await prisma.$transaction(async (tx) => {
        const infoCpt = await tx.compte.findUnique({
          where: {
            id_cpt: cpt,
          },
          select: {
            solde_actuel: true,
            taux_change_actuel: true,
          },
        });

        if (infoCpt.solde_actuel >= mntTotDev) {
          let id_colis, prd_id;
          const taux = infoCpt.taux_change_actuel;

          const mnt_tot_dzd = (mntTotDev * taux).toFixed(4);
          const pu_dev = (mntTotDev / qte).toFixed(2);
          const pu_dzd = (mnt_tot_dzd / qte).toFixed(4);

          const produitExist = await tx.produit.findFirst({
            where: {
              designation_prd: {
                equals: desPrd,
              },
            },
          });

          if (!produitExist) {
            prd_id = await getMaxValue("produit", "id_prd", null);
            await tx.produit.create({
              data: {
                id_prd: prd_id,
                designation_prd: desPrd,
              },
            });
          } else {
            prd_id = produitExist.id_prd;
          }

          id_colis = await getMaxValue("colis", "id_colis", null);

          const colis = await tx.colis.create({
            data: {
              id_colis,
              mnt_tot_dev: mntTotDev,
              date_achat: dateAchat,
              qte_achat: qte,
              mnt_tot_dzd,
              pu_dev,
              pu_dzd,
              cat_id: cat,
              prd_id,
              cpt_id: cpt,
              pu_dzd_ttc: pu_dzd,
            },
          });

          await tx.compte.update({
            where: {
              id_cpt: cpt,
            },
            data: {
              solde_actuel: {
                decrement: mntTotDev,
              },
            },
          });

          return colis;
        } else {
          res.status(405).json({ message: "Votre solde est insuffisant" });
        }
      });

      res.status(201).json(newColis);
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const getMarchandiseDisponible = async (req, res) => {
  try {
    const catIds = await prisma.categorie.findMany({
      where: {
        designation_cat: {
          not: "UTILISATION PERSONNEL",
        },
      },
      select: {
        id_cat: true,
      },
    });

    const catIdArray = catIds.map((cat) => cat.id_cat);

    const marchandises = await prisma.produit.findMany({
      where: {
        qte_dispo: {
          gt: 0,
        },
        colis: {
          some: {
            cat_id: {
              in: catIdArray,
            },
          },
        },
      },
      select: {
        id_prd: true,
        designation_prd: true,
        qte_dispo: true,
      },
      orderBy: {
        designation_prd: "asc",
      },
    });

    res.status(200).json(marchandises);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getAllProduitDisponible = async (req, res) => {
  try {
    const produits = await prisma.produit.findMany({
      where: {
        qte_dispo: {
          gt: 0,
        },
      },
      select: {
        id_prd: true,
        designation_prd: true,
        qte_dispo: true,
      },
      orderBy: {
        designation_prd: "asc",
      },
    });

    res.status(200).json(produits);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

// export const getColisEnRoute = async (req, res) => {
//   try {
//     const colis = await prisma.colis.findMany({
//       where: {
//         date_stock: null,
//       },
//       select: {
//         id_colis: true,
//         prd_id: true,
//         date_achat: true,
//         mnt_tot_dev: true,
//         produit: {
//           select: {
//             designation_prd: true,
//           },
//         },
//         categorie: {
//           select: {
//             designation_cat: true,
//           },
//         },
//         compte: {
//           select: {
//             devise: {
//               select: {
//                 symbole_dev: true,
//               },
//             },
//           },
//         },
//       },
//       orderBy: {
//         date_achat: "asc",
//       },
//     });

//     res.status(200).json(colis);
//   } catch (error) {
//     res
//       .status(500)
//       .json({ error: { code: error.code, message: error.message } });
//   }
// };

export const updateColisEnRoute = [
  body("prd_id")
    .isNumeric()
    .notEmpty()
    .withMessage("Il y'a une erreur avec vos données"),
  body("date_stock").notEmpty().withMessage("La date est obligatoire"),
  body("droits_timbre")
    .isBoolean()
    .notEmpty()
    .withMessage("Une erreur avec les droits de timbres"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const idColis = parseInt(req.params.id);
      const { prd_id, date_stock, droits_timbre } = req.body;

      await prisma.$transaction(async (tx) => {
        const colis = await tx.colis.findUnique({
          where: {
            id_colis: idColis,
          },
          select: {
            qte_achat: true,
            pu_dzd_ttc: true,
            cat_id: true,
          },
        });

        if (!colis) {
          throw new Error("Achat non trouvé");
        }

        const updatedData = {
          date_stock,
          droits_timbre,
          qte_stock: colis.qte_achat,
        };

        if (droits_timbre) {
          updatedData.pu_dzd_ttc =
            parseFloat(colis.pu_dzd_ttc) + 130 / colis.qte_achat;
        }

        await tx.colis.update({
          where: {
            id_colis: idColis,
          },
          data: updatedData,
        });

        // await tx.produit.update({
        //   where: {
        //     id_prd: prd_id,
        //   },
        //   data: {
        //     qte_dispo: {
        //       increment: colis.qte_achat,
        //     },
        //   },
        // });

        if (colis.cat_id !== 2) {
          await tx.produit.update({
            where: {
              id_prd: prd_id,
            },
            data: {
              qte_dispo: {
                increment: colis.qte_achat,
              },
            },
          });
        }
      });

      res.status(200).json({ message: "Opération effectuée avec succés" });
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const getColisEnRoute = async (req, res) => {
  try {
    const colis = await prisma.colis.findMany({
      where: {
        date_stock: null,
      },
      select: {
        id_colis: true,
        prd_id: true,
        date_achat: true,
        mnt_tot_dev: true,
        qte_achat: true, // Ajouté pour la nouvelle colonne
        produit: {
          select: {
            designation_prd: true,
          },
        },
        categorie: {
          select: {
            designation_cat: true,
          },
        },
        compte: {
          select: {
            devise: {
              select: {
                symbole_dev: true,
              },
            },
          },
        },
      },
      orderBy: {
        date_achat: "asc",
      },
    });

    // On renvoie directement le tableau des colis, comme dans votre version originale
    res.status(200).json(colis);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getColisEnRouteStats = async (req, res) => {
  try {
    const stats = await prisma.colis.aggregate({
      _count: {
        id_colis: true, // Compte le nombre de colis
      },
      _sum: {
        mnt_tot_dzd: true, // Fait la somme de leur valeur en DZD
        qte_achat: true, // FAIT LA SOMME DES QUANTITÉS D'ARTICLES
      },
      where: {
        date_stock: null,
      },
    });

    res.status(200).json({
      totalCount: stats._count.id_colis || 0,
      totalValueDZD: stats._sum.mnt_tot_dzd || 0,
      totalProduits: stats._sum.qte_achat || 0, // On renvoie la nouvelle statistique
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

// ====================================================================
// FONCTION FINALE: Annuler un colis avec recalcul du taux de change
// ====================================================================
export const cancelColis = async (req, res) => {
  try {
    const idColis = parseInt(req.params.id);

    if (isNaN(idColis)) {
      return res.status(400).json({ message: "ID du colis invalide." });
    }

    await prisma.$transaction(async (tx) => {
      const colis = await tx.colis.findUnique({
        where: { id_colis: idColis },
        select: { mnt_tot_dev: true, mnt_tot_dzd: true, cpt_id: true },
      });

      if (!colis) {
        throw new Error("Colis non trouvé.");
      }

      const compte = await tx.compte.findUnique({
        where: { id_cpt: colis.cpt_id },
        select: { solde_actuel: true, taux_change_actuel: true },
      });

      if (!compte) {
        throw new Error("Compte associé non trouvé.");
      }

      const valeurActuelleDZD =
        parseFloat(compte.solde_actuel) * parseFloat(compte.taux_change_actuel);
      const nouveauSoldeDevise =
        parseFloat(compte.solde_actuel) + parseFloat(colis.mnt_tot_dev);
      const nouvelleValeurTotaleDZD =
        valeurActuelleDZD + parseFloat(colis.mnt_tot_dzd);
      const nouveauTauxChange =
        nouveauSoldeDevise > 0
          ? nouvelleValeurTotaleDZD / nouveauSoldeDevise
          : 0;

      await tx.compte.update({
        where: { id_cpt: colis.cpt_id },
        data: {
          solde_actuel: nouveauSoldeDevise,
          taux_change_actuel: nouveauTauxChange,
        },
      });

      await tx.colis.delete({
        where: { id_colis: idColis },
      });
    });

    res.status(200).json({
      message: "Colis annulé, compte remboursé et taux de change mis à jour.",
    });
  } catch (error) {
    if (error.message.includes("non trouvé")) {
      return res.status(404).json({ message: error.message });
    }
    console.error("Erreur lors de l'annulation du colis:", error);
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

// ====================================================================
// FONCTION MISE À JOUR: Gère l'historique complet avec filtres, tri et pagination
// ====================================================================
// NOUVELLE FONCTION pour récupérer la liste des comptes pour les filtres
export const getAllComptes = async (req, res) => {
  try {
    const comptes = await prisma.compte.findMany({
      orderBy: { designation_cpt: "asc" },
    });
    res.status(200).json(comptes);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getAllColis = async (req, res) => {
  const {
    page = 1,
    limit = 25,
    search = "",
    sortBy = "date_achat",
    sortOrder = "desc",
    statut,
    categorieId,
    compteId,
    dateDebut,
    dateFin,
  } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const whereClause = {
    produit: { designation_prd: { contains: search } },
  };

  if (statut === "en_stock") whereClause.date_stock = { not: null };
  else if (statut === "en_route") whereClause.date_stock = null;

  if (categorieId) whereClause.cat_id = parseInt(categorieId, 10);
  if (compteId) whereClause.cpt_id = parseInt(compteId, 10);

  if (dateDebut && dateFin) {
    whereClause.date_achat = {
      gte: new Date(dateDebut),
      lte: new Date(dateFin),
    };
  }

  const orderBy = [];
  if (sortBy === "designation_prd") {
    orderBy.push({ produit: { designation_prd: sortOrder } });
  } else {
    orderBy.push({ [sortBy]: sortOrder });
  }

  orderBy.push({ id_colis: "desc" });

  try {
    const [colis, total] = await prisma.$transaction([
      prisma.colis.findMany({
        where: whereClause,
        select: {
          id_colis: true,
          date_achat: true,
          date_stock: true,
          mnt_tot_dev: true,
          mnt_tot_dzd: true,
          qte_achat: true,
          pu_dzd: true,
          produit: { select: { designation_prd: true } },
          categorie: { select: { designation_cat: true } },
          compte: { select: { devise: { select: { symbole_dev: true } } } },
        },
        orderBy: orderBy,
        skip: skip,
        take: limitNum,
      }),
      prisma.colis.count({ where: whereClause }),
      prisma.colis.aggregate({
        _min: { mnt_tot_dzd: true },
        _max: { mnt_tot_dzd: true },
      }),
    ]);

    res.status(200).json({
      colis,
      total,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};
// ====================================================================
// FONCTION MISE À JOUR: Calcule les KPIs en fonction des filtres
// ====================================================================
export const getAllColisStats = async (req, res) => {
  const {
    search = "",
    statut,
    categorieId,
    compteId,
    dateDebut,
    dateFin,
  } = req.query;
  const whereClause = {
    produit: { designation_prd: { contains: search } },
  };
  if (statut === "en_stock") whereClause.date_stock = { not: null };
  else if (statut === "en_route") whereClause.date_stock = null;
  if (categorieId) whereClause.cat_id = parseInt(categorieId, 10);
  if (compteId) whereClause.cpt_id = parseInt(compteId, 10);
  if (dateDebut && dateFin)
    whereClause.date_achat = {
      gte: new Date(dateDebut),
      lte: new Date(dateFin),
    };

  try {
    const stats = await prisma.colis.aggregate({
      _count: { id_colis: true },
      _sum: { mnt_tot_dzd: true, qte_achat: true },
      where: whereClause,
    });
    res.status(200).json({
      totalCount: stats._count.id_colis || 0,
      totalValueDZD: stats._sum.mnt_tot_dzd || 0,
      totalProduits: stats._sum.qte_achat || 0,
    });
  } catch (error) {
    console.log(error);

    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

// NOUVELLES FONCTIONS pour les données des graphiques
export const getChartDataByCategory = async (req, res) => {
  try {
    const data = await prisma.colis.groupBy({
      by: ["cat_id"],
      _count: { id_colis: true },
      orderBy: { _count: { id_colis: "desc" } },
    });
    const categories = await prisma.categorie.findMany({
      where: { id_cat: { in: data.map((i) => i.cat_id) } },
    });
    const map = categories.reduce(
      (acc, cat) => ({ ...acc, [cat.id_cat]: cat.designation_cat }),
      {}
    );
    res.status(200).json(
      data.map((i) => ({
        name: map[i.cat_id] || "Inconnu",
        value: i._count.id_colis,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getChartDataByYear = async (req, res) => {
  try {
    const result =
      await prisma.$queryRaw`SELECT YEAR(date_achat) as year, sum(qte_achat) as value FROM colis GROUP BY YEAR(date_achat) ORDER BY year DESC`;
    res
      .status(200)
      .json(
        result.map((i) => ({ year: i.year.toString(), value: Number(i.value) }))
      );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getChartDataByAccount = async (req, res) => {
  try {
    const data = await prisma.colis.groupBy({
      by: ["cpt_id"],
      _count: { id_colis: true },
      orderBy: { _count: { id_colis: "desc" } },
    });
    const comptes = await prisma.compte.findMany({
      where: { id_cpt: { in: data.map((i) => i.cpt_id) } },
    });
    const map = comptes.reduce(
      (acc, cpt) => ({ ...acc, [cpt.id_cpt]: cpt.designation_cpt }),
      {}
    );
    res.status(200).json(
      data.map((i) => ({
        name: map[i.cpt_id] || "Inconnu",
        value: i._count.id_colis,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getChartDataTopProducts = async (req, res) => {
  try {
    const data = await prisma.colis.groupBy({
      by: ["prd_id"],
      _sum: { qte_achat: true },
      orderBy: { _sum: { qte_achat: "desc" } },
      take: 5,
    });
    const prdIds = data.map((i) => i.prd_id);
    const products = await prisma.produit.findMany({
      where: { id_prd: { in: prdIds } },
    });
    const map = products.reduce(
      (acc, prd) => ({ ...acc, [prd.id_prd]: prd.designation_prd }),
      {}
    );
    res.status(200).json(
      data.map((i) => ({
        name: map[i.prd_id] || "Inconnu",
        value: i._sum.qte_achat,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ====================================================================
// NOUVELLE FONCTION: Mettre à jour les détails d'un colis
// ====================================================================
export const updateColisDetails = async (req, res) => {
  const idColis = parseInt(req.params.id);
  const { cat_id, date_achat, date_stock, new_price } = req.body;

  if (isNaN(idColis)) {
    return res.status(400).json({ message: "ID du colis invalide." });
  }

  try {
    // CAS 1: Modification du prix (logique simplifiée)
    if (new_price !== undefined) {
      const newPriceDev = parseFloat(new_price);
      if (isNaN(newPriceDev) || newPriceDev <= 0) {
        return res
          .status(400)
          .json({ message: "Le nouveau prix est invalide." });
      }

      await prisma.$transaction(async (tx) => {
        // 1. Trouver le colis et son compte associé
        const colis = await tx.colis.findUnique({
          where: { id_colis: idColis },
        });
        if (!colis) throw new Error("Colis non trouvé.");

        const compte = await tx.compte.findUnique({
          where: { id_cpt: colis.cpt_id },
        });
        if (!compte) throw new Error("Compte associé non trouvé.");

        // 2. Calculer l'état financier actuel du compte en DZD
        const valeurActuelleDZD =
          parseFloat(compte.solde_actuel) *
          parseFloat(compte.taux_change_actuel);

        // 3. "Rembourser" l'ancien montant pour obtenir un état intermédiaire
        const soldeDeviseApresRemboursement =
          parseFloat(compte.solde_actuel) + parseFloat(colis.mnt_tot_dev);
        const valeurDZDApresRemboursement =
          valeurActuelleDZD + parseFloat(colis.mnt_tot_dzd);

        // 4. Vérifier si le solde est suffisant pour le nouveau prix
        if (soldeDeviseApresRemboursement < newPriceDev) {
          throw new Error(
            "Solde insuffisant pour couvrir le nouveau prix après ajustement."
          );
        }

        // 5. Calculer le nouveau montant en DZD en conservant le taux de change de l'achat initial
        const tauxAchatOriginal =
          parseFloat(colis.mnt_tot_dzd) / parseFloat(colis.mnt_tot_dev);
        const newMntTotDZD = newPriceDev * tauxAchatOriginal;

        // 6. Calculer le nouvel état final du compte
        const nouveauSoldeDeviseFinal =
          soldeDeviseApresRemboursement - newPriceDev;
        const nouvelleValeurDZDfinal =
          valeurDZDApresRemboursement - newMntTotDZD;
        const nouveauTauxChangeFinal =
          nouveauSoldeDeviseFinal > 0
            ? nouvelleValeurDZDfinal / nouveauSoldeDeviseFinal
            : 0;

        // 7. Mettre à jour le compte
        await tx.compte.update({
          where: { id_cpt: compte.id_cpt },
          data: {
            solde_actuel: nouveauSoldeDeviseFinal,
            taux_change_actuel: nouveauTauxChangeFinal,
          },
        });

        const newPuDzdTtc =
          colis.pu_dzd_ttc - colis.pu_dzd + newMntTotDZD / colis.qte_achat;
        // 8. Mettre à jour le colis avec les nouvelles informations financières
        await tx.colis.update({
          where: { id_colis: idColis },
          data: {
            mnt_tot_dev: newPriceDev,
            mnt_tot_dzd: newMntTotDZD,
            pu_dev: newPriceDev / colis.qte_achat,
            pu_dzd: newMntTotDZD / colis.qte_achat,
            pu_dzd_ttc: newPuDzdTtc,
          },
        });
      });
    }
    // CAS 2: Modifications simples (catégorie et dates)
    else {
      const dataToUpdate = {};
      if (cat_id !== undefined) dataToUpdate.cat_id = parseInt(cat_id, 10);
      if (date_achat) dataToUpdate.date_achat = new Date(date_achat);
      if (date_stock) dataToUpdate.date_stock = new Date(date_stock);

      if (Object.keys(dataToUpdate).length === 0) {
        return res
          .status(400)
          .json({ message: "Aucune donnée à mettre à jour fournie." });
      }

      await prisma.colis.update({
        where: { id_colis: idColis },
        data: dataToUpdate,
      });
    }

    res.status(200).json({ message: "Colis mis à jour avec succès." });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du colis:", error);
    res
      .status(500)
      .json({ message: error.message || "Erreur interne du serveur." });
  }
};

// ====================================================================
// NOUVELLE FONCTION: Calcule les KPIs pour TOUS les colis
// ====================================================================
// export const getAllColisStats = async (req, res) => {
//   try {
//     const stats = await prisma.colis.aggregate({
//       _count: { id_colis: true },
//       _sum: { mnt_tot_dzd: true, qte_achat: true },
//     });

//     res.status(200).json({
//       totalCount: stats._count.id_colis || 0,
//       totalValueDZD: stats._sum.mnt_tot_dzd || 0,
//       totalProduits: stats._sum.qte_achat || 0,
//     });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ error: { code: error.code, message: error.message } });
//   }
// };

// ====================================================================
// NOUVELLES FONCTIONS POUR LA PAGE "HISTORIQUE DES PRIX"
// ====================================================================

/**
 * Récupère la liste principale des produits pour le tableau de la page.
 * Gère la recherche, le tri et la pagination.
 */
export const getProduitsForTable = async (req, res) => {
  const {
    page = 1,
    limit = 24,
    search = "",
    sortBy = "designation_prd",
    sortOrder = "asc",
  } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;
  const searchPattern = `%${search}%`;

  try {
    const produits = await prisma.$queryRaw`
      SELECT 
        p.id_prd, 
        p.designation_prd, 
        p.qte_dispo
      FROM produit AS p
      LEFT JOIN (
        SELECT prd_id, SUM(qte_achat) as total_qte_achetee
        FROM colis
        GROUP BY prd_id
      ) AS c_sum ON p.id_prd = c_sum.prd_id
      WHERE p.designation_prd LIKE ${searchPattern}
      ORDER BY
        CASE WHEN p.qte_dispo > 0 THEN 0 ELSE 1 END ASC,
        CASE WHEN p.qte_dispo > 0 THEN p.designation_prd ELSE NULL END ASC,
        CASE WHEN p.qte_dispo = 0 THEN c_sum.total_qte_achetee ELSE NULL END DESC,
        p.designation_prd ASC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const totalResult = await prisma.produit.count({
      where: { designation_prd: { contains: search } },
    });

    res.status(200).json({ produits, total: totalResult });
  } catch (error) {
    console.error("Erreur dans getProduitsForTable:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Calcule les KPIs globaux pour la page "Historique des Prix".
 */
export const getProduitsPageStats = async (req, res) => {
  try {
    const [totalProduits, produitsEnStock, totalQteAchetee] =
      await prisma.$transaction([
        prisma.produit.count(),
        prisma.produit.count({ where: { qte_dispo: { gt: 0 } } }),
        prisma.colis.aggregate({ _sum: { qte_achat: true } }),
      ]);

    res.status(200).json({
      totalProduits: totalProduits || 0,
      produitsEnStock: produitsEnStock || 0,
      totalQteAchetee: totalQteAchetee._sum.qte_achat || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Récupère toutes les données détaillées pour un produit (pour la modale).
 */
export const getProduitDetails = async (req, res) => {
  const idProduit = parseInt(req.params.id);
  if (isNaN(idProduit)) {
    return res.status(400).json({ message: "ID du produit invalide." });
  }

  try {
    const [produit, statsAchat, lignesDeCommande, colisVendus] =
      await Promise.all([
        prisma.produit.findUnique({ where: { id_prd: idProduit } }),
        prisma.colis.aggregate({
          where: { prd_id: idProduit },
          _min: { pu_dev: true, pu_dzd_ttc: true },
          _max: { pu_dev: true, pu_dzd_ttc: true },
          _avg: { pu_dev: true, pu_dzd_ttc: true },
          _sum: { qte_achat: true },
        }),
        prisma.ligne_commande.findMany({
          where: { prd_id: idProduit },
        }),
        prisma.ligne_commande_colis.findMany({
          where: { prd_id: idProduit },
          include: { colis: true },
        }),
      ]);

    if (!produit) {
      return res.status(404).json({ message: "Produit non trouvé." });
    }

    const totalVenteDZD = lignesDeCommande.reduce(
      (sum, ligne) => sum + parseFloat(ligne.pu_vente) * ligne.qte_cde,
      0
    );
    const totalCoutDZDdesVentes = colisVendus.reduce(
      (sum, l) => sum + parseFloat(l.colis.pu_dzd_ttc) * l.qte,
      0
    );
    const totalBeneficeDZD = totalVenteDZD - totalCoutDZDdesVentes;

    const kpisVente =
      lignesDeCommande.length > 0
        ? {
            minDa: Math.min(
              ...lignesDeCommande.map((l) => parseFloat(l.pu_vente))
            ),
            maxDa: Math.max(
              ...lignesDeCommande.map((l) => parseFloat(l.pu_vente))
            ),
            avgDa:
              totalVenteDZD /
              lignesDeCommande.reduce((sum, l) => sum + l.qte_cde, 0),
          }
        : { minDa: 0, maxDa: 0, avgDa: 0 };

    const qteParAnneeRaw = await prisma.$queryRaw`
      SELECT YEAR(date_achat) as year, SUM(qte_achat) as value 
      FROM colis 
      WHERE prd_id = ${idProduit}
      GROUP BY YEAR(date_achat) ORDER BY year DESC LIMIT 5`;

    // Le .reverse() remet les années dans l'ordre chronologique croissant (gauche à droite)
    const qteParAnnee = qteParAnneeRaw.map((item) => ({
      year: item.year.toString(),
      value: Number(item.value),
    })).reverse();

    res.status(200).json({
      produitInfo: {
        designation: produit.designation_prd,
        qteDispo: produit.qte_dispo,
        qteAchetee: statsAchat._sum.qte_achat || 0,
      },
      kpisAchat: {
        minDev: statsAchat._min.pu_dev,
        maxDev: statsAchat._max.pu_dev,
        avgDev: statsAchat._avg.pu_dev,
        minDzd: statsAchat._min.pu_dzd_ttc,
        maxDzd: statsAchat._max.pu_dzd_ttc,
        avgDzd: statsAchat._avg.pu_dzd_ttc,
      },
      kpisVente: kpisVente,
      chartData: {
        financials: [
          { name: "Coût d'Achat (Ventes)", value: totalCoutDZDdesVentes },
          {
            name: "Bénéfice Brut",
            value: totalBeneficeDZD > 0 ? totalBeneficeDZD : 0,
          },
        ],
        qteParAnnee: qteParAnnee,
      },
    });
  } catch (error) {
    console.error("Erreur dans getProduitDetails:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Récupère la liste des colis pour un produit spécifique (pour la modale).
 */
export const getColisForProduit = async (req, res) => {
  const idProduit = parseInt(req.params.id);
  const { page = 1, limit = 5 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  if (isNaN(idProduit)) {
    return res.status(400).json({ message: "ID du produit invalide." });
  }

  try {
    const colis = await prisma.colis.findMany({
      where: { prd_id: idProduit },
      include: {
        categorie: true,
        lignes: {
          include: {
            ligne_commande: {
              include: { commande: true },
            },
          },
        },
        compte: {
          select: { devise: { select: { symbole_dev: true } } },
        },
      },
      orderBy: [{ date_achat: "desc" }, {qte_stock : "desc"}],
      skip: skip,
      take: parseInt(limit),
    });

    const total = await prisma.colis.count({ where: { prd_id: idProduit } });

    const formattedColis = colis.map((c) => {
      // 1. Calcul du statut global du lot
      let statut = "En Route";
      if (c.date_stock) statut = "En Stock";
      if (c.qte_stock === 0 && c.date_stock) statut = "Vendu (Totalement)";
      else if (c.qte_stock < c.qte_achat && c.date_stock) statut = "Vendu (Partiel)";

      // 2. Formatage du sous-tableau des ventes de CE lot
      const ventesList = c.lignes.map((vente) => {
        const pu_vente = parseFloat(vente.ligne_commande.pu_vente);
        return {
          date_vente: vente.ligne_commande.commande.date_cde,
          qte_vendue: vente.qte,
          prix_vente: pu_vente,
          benefice: pu_vente - parseFloat(c.pu_dzd_ttc),
        };
      });

      // 3. Retour de l'objet imbriqué
      return {
        id_colis: c.id_colis,
        date_achat: c.date_achat,
        qte_achat: c.qte_achat,
        qte_stock: c.qte_stock,
        prix_achat_dev: `${parseFloat(c.pu_dev).toFixed(2)} ${c.compte.devise.symbole_dev}`,
        prix_achat_dzd: parseFloat(c.pu_dzd_ttc),
        statut: statut,
        categorie: c.categorie.designation_cat.substring(0, 4) + ".",
        ventes: ventesList, // <--- Le tableau imbriqué est ici !
      };
    });

    res.status(200).json({ colis: formattedColis, total });
  } catch (error) {
    console.error("Erreur dans getColisForProduit:", error);
    res.status(500).json({ error: error.message });
  }
};

// ====================================================================
// NOUVELLE FONCTION: Récupère les données pour le graphique de la page d'accueil
// ====================================================================

// export const getDashboardChartData = async (req, res) => {
//   try {
//     const twelveMonthsAgo = dayjs()
//       .subtract(12, "month")
//       .startOf("month")
//       .toDate();

//     const achats = await prisma.colis.findMany({
//       where: {
//         date_achat: {
//           gte: twelveMonthsAgo,
//         },
//       },
//       select: {
//         date_achat: true,
//       },
//     });

//     const ventes = await prisma.commande.findMany({
//       where: {
//         date_cde: {
//           gte: twelveMonthsAgo,
//         },
//       },
//       include: {
//         ligne_commande: {
//           select: {
//             qte_cde: true,
//           },
//         },
//       },
//     });

//     const monthlyData = {};

//     // Initialiser les 13 derniers mois pour avoir une plage de 12 mois complets
//     for (let i = 0; i < 13; i++) {
//       const monthKey = dayjs().subtract(i, "month").format("YYYY-MM");
//       monthlyData[monthKey] = { achats: 0, ventes: 0 };
//     }

//     achats.forEach((item) => {
//       const monthKey = dayjs(item.date_achat).format("YYYY-MM");
//       if (monthlyData[monthKey]) {
//         monthlyData[monthKey].achats += 1;
//       }
//     });

//     ventes.forEach((commande) => {
//       const monthKey = dayjs(commande.date_cde).format("YYYY-MM");
//       if (monthlyData[monthKey]) {
//         const totalVendu = commande.ligne_commande.reduce(
//           (sum, ligne) => sum + ligne.qte_cde,
//           0
//         );
//         monthlyData[monthKey].ventes += totalVendu;
//       }
//     });

//     // CORRECTION FINALE: Trier les clés (ex: "2024-07") puis construire le tableau final
//     const sortedChartData = Object.keys(monthlyData)
//       .sort() // Le tri alphabétique sur le format "AAAA-MM" est un tri chronologique
//       .map((monthKey) => ({
//         month: dayjs(monthKey).format("MMM YY"),
//         achats: monthlyData[monthKey].achats,
//         ventes: monthlyData[monthKey].ventes,
//       }));

//     // On retire le mois le plus ancien qui peut être incomplet
//     if (sortedChartData.length > 12) {
//       sortedChartData.shift();
//     }

//     res.status(200).json(sortedChartData);
//   } catch (error) {
//     console.error("Erreur dans getDashboardChartData:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

/**
 * Prépare les données pour le graphique comparant le NOMBRE DE COLIS ACHETÉS
 * au NOMBRE DE COMMANDES VENDUES sur les 12 derniers mois.
 */
export const getTransactionsChartData = async (req, res) => {
  try {
    const twelveMonthsAgo = dayjs()
      .subtract(12, "month")
      .startOf("month")
      .toDate();

    const achats = await prisma.colis.findMany({
      where: { date_achat: { gte: twelveMonthsAgo } },
      select: { date_achat: true },
    });

    const ventes = await prisma.commande.findMany({
      where: { date_cde: { gte: twelveMonthsAgo } },
      select: { date_cde: true },
    });

    const monthlyData = {};
    for (let i = 0; i < 13; i++) {
      const monthKey = dayjs().subtract(i, "month").format("YYYY-MM");
      monthlyData[monthKey] = { colis: 0, commandes: 0 };
    }

    achats.forEach((item) => {
      const monthKey = dayjs(item.date_achat).format("YYYY-MM");
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].colis += 1;
      }
    });

    ventes.forEach((commande) => {
      const monthKey = dayjs(commande.date_cde).format("YYYY-MM");
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].commandes += 1;
      }
    });

    const sortedChartData = Object.keys(monthlyData)
      .sort()
      .map((monthKey) => ({
        month: dayjs(monthKey).format("MMM YY"),
        colis: monthlyData[monthKey].colis,
        commandes: monthlyData[monthKey].commandes,
      }));

    if (sortedChartData.length > 12) {
      sortedChartData.shift();
    }

    res.status(200).json(sortedChartData);
  } catch (error) {
    console.error("Erreur dans getTransactionsChartData:", error);
    res.status(500).json({ message: "Erreur serveur interne" });
  }
};

/**
 * Prépare les données pour le graphique comparant la QUANTITÉ DE PRODUITS ACHETÉS
 * à la QUANTITÉ DE PRODUITS VENDUS sur les 12 derniers mois.
 */
export const getProduitsChartData = async (req, res) => {
  try {
    const twelveMonthsAgo = dayjs()
      .subtract(12, "month")
      .startOf("month")
      .toDate();

    // Récupère la quantité de produits dans chaque colis (`qte_achat`)
    const achats = await prisma.colis.findMany({
      where: { date_achat: { gte: twelveMonthsAgo } },
      select: {
        date_achat: true,
        qte_achat: true,
      },
    });

    // Récupère la quantité de produits dans chaque commande
    const ventes = await prisma.commande.findMany({
      where: { date_cde: { gte: twelveMonthsAgo } },
      include: {
        ligne_commande: {
          select: { qte_cde: true },
        },
      },
    });

    const monthlyData = {};
    for (let i = 0; i < 13; i++) {
      const monthKey = dayjs().subtract(i, "month").format("YYYY-MM");
      monthlyData[monthKey] = { produitsAchetes: 0, produitsVendus: 0 };
    }

    achats.forEach((colis) => {
      const monthKey = dayjs(colis.date_achat).format("YYYY-MM");
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].produitsAchetes += colis.qte_achat || 0;
      }
    });

    ventes.forEach((commande) => {
      const monthKey = dayjs(commande.date_cde).format("YYYY-MM");
      if (monthlyData[monthKey]) {
        const totalProduitsCommande = commande.ligne_commande.reduce(
          (sum, ligne) => sum + ligne.qte_cde,
          0
        );
        monthlyData[monthKey].produitsVendus += totalProduitsCommande;
      }
    });

    const sortedChartData = Object.keys(monthlyData)
      .sort()
      .map((monthKey) => ({
        month: dayjs(monthKey).format("MMM YY"),
        produitsAchetes: monthlyData[monthKey].produitsAchetes,
        produitsVendus: monthlyData[monthKey].produitsVendus,
      }));

    if (sortedChartData.length > 12) {
      sortedChartData.shift();
    }

    res.status(200).json(sortedChartData);
  } catch (error) {
    console.error("Erreur dans getProduitsChartData:", error);
    res.status(500).json({ message: "Erreur serveur interne" });
  }
};
