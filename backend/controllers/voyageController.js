import prisma from "../config/dbConfig.js";
import { body, param, validationResult } from "express-validator";
import { arrondir, getMaxValue } from "../config/utils.js";

export const getAllVoyages = async (req, res) => {
  try {
    const voyages = await prisma.voyage.findMany({
      include: {
        compte_defaut: {
          select: { designation_cpt: true, dev_code: true },
        },
        _count: {
          select: {
            depenses: { where: { isAnnule: false } },
            transactions: true,
          },
        },
      },
      orderBy: { date_dep: "desc" },
    });

    res.status(200).json(voyages);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getVoyageById = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id))
    return res.status(400).json({ message: "Identifiant de voyage invalide." });

  try {
    const voyage = await prisma.voyage.findUnique({
      where: { id_voyage: id },
      include: {
        compte_defaut: { select: { designation_cpt: true, dev_code: true } },
        depenses: {
          where: { isAnnule: false },
          include: { nature_dep: true, compte: true },
          orderBy: { date_dep: "desc" },
        },
        transactions: {
          include: {
            compte: true,
            _count: { select: { colis_voyage: true } },
          },
          orderBy: { id_trans: "desc" },
        },
      },
    });

    if (!voyage)
      return res.status(404).json({ message: "Voyage introuvable." });

    const totalDepensesDZD = arrondir(
      voyage.depenses.reduce((sum, d) => sum + parseFloat(d.mnt_dep_dzd), 0),
    );

    const totalAchatsDZD = arrondir(
      voyage.transactions.reduce(
        (sum, t) => sum + parseFloat(t.mnt_tot_fact) * parseFloat(t.taux_trans),
        0,
      ),
    );

    const totalCommPaieDZD = arrondir(
      voyage.transactions.reduce(
        (sum, t) =>
          sum + parseFloat(t.mnt_comm_paie || 0) * parseFloat(t.taux_trans),
        0,
      ),
    );

    const totalCommBanqueDZD = arrondir(
      voyage.transactions.reduce(
        (sum, t) =>
          sum + parseFloat(t.mnt_comm_banque || 0) * parseFloat(t.taux_trans),
        0,
      ),
    );

    const coutTotalDZD = arrondir(
      totalDepensesDZD + totalAchatsDZD + totalCommPaieDZD + totalCommBanqueDZD,
    );

    res.status(200).json({
      ...voyage,
      kpis: {
        totalDepensesDZD,
        totalAchatsDZD,
        totalCommPaieDZD,
        totalCommBanqueDZD,
        coutTotalDZD,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const addVoyage = [
  body("desVoyage")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("La désignation est obligatoire"),
  body("destination").optional().isString().trim(),
  body("dateDepart")
    .notEmpty()
    .withMessage("La date de départ est obligatoire"),
  body("dateRetour")
    .notEmpty()
    .withMessage("La date de retour est obligatoire"),
  body("deviseDest").optional().isString().trim(),
  body("cptDefautId").optional({ checkFalsy: true }).isInt(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const {
      desVoyage,
      destination,
      dateDepart,
      dateRetour,
      deviseDest,
      cptDefautId,
    } = req.body;

    // Règle métier : Chronologie du voyage
    const dDepart = new Date(dateDepart);
    const dRetour = new Date(dateRetour);

    if (dRetour < dDepart) {
      return res.status(400).json({
        message:
          "La date de retour doit être ultérieure ou égale à la date de départ.",
      });
    }

    try {
      const idVoyage = await getMaxValue("voyage", "id_voyage", null);

      const nouveauVoyage = await prisma.voyage.create({
        data: {
          id_voyage: idVoyage,
          des_voyage: desVoyage,
          dest_voyage: destination || null,
          date_dep: dDepart,
          date_ret: dRetour,
          dev_dest: deviseDest || "CNY",
          cpt_defaut_id: cptDefautId ? parseInt(cptDefautId, 10) : null,
          statut_voy: "EN_PREPARATION",
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
  body("desVoyage").isString().trim().notEmpty(),
  body("destination").optional().isString().trim(),
  body("dateDepart").notEmpty(),
  body("dateRetour").notEmpty(),
  body("cptDefautId").optional({ checkFalsy: true }).isInt(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const id = parseInt(req.params.id, 10);
    if (isNaN(id))
      return res.status(400).json({ message: "Identifiant invalide." });

    const { desVoyage, destination, dateDepart, dateRetour, cptDefautId } =
      req.body;

    const dDepart = new Date(dateDepart);
    const dRetour = new Date(dateRetour);

    if (dRetour < dDepart) {
      return res.status(400).json({
        message:
          "La date de retour doit être ultérieure ou égale à la date de départ.",
      });
    }

    try {
      const voyage = await prisma.voyage.findUnique({
        where: { id_voyage: id },
      });

      if (!voyage)
        return res.status(404).json({ message: "Voyage introuvable" });

      if (voyage.statut_voy === "CLOTURE") {
        return res
          .status(403)
          .json({ message: "Impossible de modifier un voyage clôturé" });
      }

      await prisma.voyage.update({
        where: { id_voyage: id },
        data: {
          des_voyage: desVoyage,
          dest_voyage: destination || null,
          date_dep: dDepart,
          date_ret: dRetour,
          cpt_defaut_id: cptDefautId ? parseInt(cptDefautId, 10) : null,
        },
      });

      res.status(200).json({ message: "Voyage mis à jour." });
    } catch (error) {
      res.status(500).json({ error: { message: error.message } });
    }
  },
];

export const deleteVoyage = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id))
    return res.status(400).json({ message: "Identifiant invalide." });

  try {
    const voyage = await prisma.voyage.findUnique({
      where: { id_voyage: id },
      include: {
        _count: {
          select: {
            depenses: { where: { isAnnule: false } },
            transactions: true,
          },
        },
      },
    });

    if (!voyage) return res.status(404).json({ message: "Voyage introuvable" });

    if (voyage._count.depenses > 0 || voyage._count.transactions > 0) {
      return res.status(403).json({
        message:
          "Impossible de supprimer ce voyage car il contient des dépenses ou des transactions actives.",
      });
    }

    await prisma.voyage.delete({ where: { id_voyage: id } });
    res.status(200).json({ message: "Voyage supprimé avec succès." });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

// ==========================================
// WORKFLOW : CHANGEMENT DE STATUT & CLÔTURE
// ==========================================

export const changerStatutVoyage = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id))
    return res.status(400).json({ message: "Identifiant invalide." });

  const { statut, tauxChange } = req.body;

  try {
    await prisma.$transaction(async (tx) => {
      const voyage = await tx.voyage.findUnique({
        where: { id_voyage: id },
        include: {
          depenses: { where: { isAnnule: false } },
          transactions: {
            include: { colis_voyage: { include: { colis: true } } },
          },
        },
      });

      if (!voyage) throw new Error("Voyage introuvable");

      if (voyage.statut_voy === "CLOTURE" && statut === "CLOTURE") {
        throw new Error("Le voyage est déjà clôturé.");
      }

      if (statut === "EN_COURS") {
        const dataUpdate = { statut_voy: "EN_COURS" };
        if (tauxChange) dataUpdate.taux_change = parseFloat(tauxChange);

        await tx.voyage.update({
          where: { id_voyage: id },
          data: dataUpdate,
        });
      } else if (statut === "CLOTURE") {
        if (voyage.transactions.length === 0) {
          throw new Error("Impossible de clôturer sans transactions.");
        }

        const totalDepensesDZD = voyage.depenses.reduce(
          (sum, d) => sum + parseFloat(d.mnt_dep_dzd),
          0,
        );

        let totalAchatsPursDZD = 0;
        let totalCommissionsDZD = 0;

        voyage.transactions.forEach((t) => {
          const taux = parseFloat(t.taux_trans);
          totalAchatsPursDZD += parseFloat(t.mnt_tot_fact) * taux;
          totalCommissionsDZD +=
            (parseFloat(t.mnt_comm_paie || 0) +
              parseFloat(t.mnt_comm_banque || 0)) *
            taux;
        });

        if (totalAchatsPursDZD === 0) {
          throw new Error("Le total des marchandises est de 0 DZD.");
        }

        const coutGlobalDZD =
          totalAchatsPursDZD + totalCommissionsDZD + totalDepensesDZD;
        const coeffApproche = coutGlobalDZD / totalAchatsPursDZD;

        await tx.voyage.update({
          where: { id_voyage: id },
          data: {
            statut_voy: "CLOTURE",
            coeff_approche: coeffApproche,
          },
        });

        for (const transaction of voyage.transactions) {
          for (const cv of transaction.colis_voyage) {
            const puDzdBase = parseFloat(cv.colis.pu_dzd);
            const nouveauTTC = arrondir(puDzdBase * coeffApproche);

            await tx.colis.update({
              where: { id_colis: cv.id_colis_voy },
              data: { pu_dzd_ttc: nouveauTTC },
            });
          }
        }
      }
    });

    res.status(200).json({ message: `Statut passé à ${statut}.` });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

// ==========================================
// TRANSACTIONS ET ACHATS (COLIS) LIÉS AU VOYAGE
// ==========================================

export const addTransactionVoyage = [
  body("idVoyage").isInt().notEmpty().withMessage("Le voyage est requis"),
  body("cptPaiementId")
    .isInt()
    .notEmpty()
    .withMessage("Le compte de paiement est requis"),
  body("fournisseur").optional().isString().trim(),
  body("deviseFacture")
    .isString()
    .notEmpty()
    .withMessage("La devise est requise"),
  body("tauxDzd")
    .isFloat({ gt: 0 })
    .notEmpty()
    .withMessage("Le taux de change en DZD est requis"),
  body("montantFacture")
    .isFloat({ gt: 0 })
    .notEmpty()
    .withMessage("Le total de la facture est requis"),
  body("montantDebite")
    .isFloat({ gt: 0 })
    .notEmpty()
    .withMessage("Le montant prélevé est requis"),
  body("commBanque").optional().isFloat(),
  body("commPaiement").optional().isFloat(),
  body("dateAchat").notEmpty().withMessage("La date d'achat est requise"),

  body("articles")
    .isArray({ min: 1 })
    .withMessage("Au moins un article est requis"),
  body("articles.*.desPrd").isString().notEmpty(),
  body("articles.*.catId").isInt().notEmpty(),
  body("articles.*.qte").isInt({ gt: 0 }),
  body("articles.*.puDevise").isFloat({ gt: 0 }),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const {
      idVoyage,
      cptPaiementId,
      fournisseur,
      deviseFacture,
      tauxDzd,
      montantFacture,
      montantDebite,
      commBanque = 0,
      commPaiement = 0,
      dateAchat,
      articles,
    } = req.body;

    try {
      await prisma.$transaction(async (tx) => {
        const compte = await tx.compte.findUnique({
          where: { id_cpt: parseInt(cptPaiementId, 10) },
        });

        if (!compte) throw new Error("Compte introuvable");
        if (parseFloat(compte.solde_actuel) < parseFloat(montantDebite)) {
          throw new Error("Solde insuffisant.");
        }

        const voyage = await tx.voyage.findUnique({
          where: { id_voyage: parseInt(idVoyage, 10) },
        });

        if (!voyage || voyage.statut_voy !== "EN_COURS") {
          throw new Error("Le voyage doit être EN_COURS.");
        }

        const dAchatObj = new Date(dateAchat);
        const dDepObj = new Date(voyage.date_dep);
        const dRetObj = new Date(voyage.date_ret);

        if (dAchatObj < dDepObj || dAchatObj > dRetObj) {
          throw new Error("DATE_ACHAT_HORS_VOYAGE");
        }

        const dateStockPrevue = new Date(voyage.date_ret);
        dateStockPrevue.setDate(dateStockPrevue.getDate() + 1);

        const idTransaction = await getMaxValue(
          "transaction_voyage",
          "id_trans",
          null,
        );

        const transaction = await tx.transaction_voyage.create({
          data: {
            id_trans: idTransaction,
            voyage_id: parseInt(idVoyage, 10),
            cpt_id: parseInt(cptPaiementId, 10),
            fournisseur: fournisseur || null,
            dev_trans: deviseFacture,
            taux_trans: parseFloat(tauxDzd),
            mnt_tot_fact: arrondir(parseFloat(montantFacture)),
            mnt_comm_banque: arrondir(parseFloat(commBanque)),
            mnt_comm_paie: arrondir(parseFloat(commPaiement)),
          },
        });

        const ratioConversionCarte =
          parseFloat(montantDebite) / parseFloat(montantFacture);

        for (const article of articles) {
          const qte = parseInt(article.qte, 10);
          const pu_dest = arrondir(parseFloat(article.puDevise));
          const mnt_tot_dest = arrondir(pu_dest * qte);

          const mnt_tot_carte = arrondir(mnt_tot_dest * ratioConversionCarte);
          const pu_carte = arrondir(mnt_tot_carte / qte);

          const mnt_tot_dzd = arrondir(mnt_tot_dest * parseFloat(tauxDzd));
          const pu_dzd = arrondir(mnt_tot_dzd / qte);

          let prd_id;
          const produitExist = await tx.produit.findFirst({
            where: { designation_prd: article.desPrd.trim() },
          });

          if (!produitExist) {
            prd_id = await getMaxValue("produit", "id_prd", null);
            await tx.produit.create({
              data: { id_prd: prd_id, designation_prd: article.desPrd.trim() },
            });
          } else {
            prd_id = produitExist.id_prd;
          }

          const idColis = await getMaxValue("colis", "id_colis", null);
          await tx.colis.create({
            data: {
              id_colis: idColis,
              cat_id: parseInt(article.catId, 10),
              prd_id: prd_id,
              cpt_id: parseInt(cptPaiementId, 10),
              mnt_tot_dev: mnt_tot_carte,
              date_achat: dAchatObj,
              date_stock: dateStockPrevue,
              qte_achat: qte,
              mnt_tot_dzd: mnt_tot_dzd,
              pu_dev: pu_carte,
              pu_dzd: pu_dzd,
              pu_dzd_ttc: pu_dzd,
              colis_voyage: {
                create: {
                  trans_id: idTransaction,
                  pu_dev_dest: pu_dest,
                  mnt_tot_dest: mnt_tot_dest,
                },
              },
            },
          });
        }

        await tx.compte.update({
          where: { id_cpt: parseInt(cptPaiementId, 10) },
          data: { solde_actuel: { decrement: parseFloat(montantDebite) } },
        });
      });

      res
        .status(201)
        .json({ message: "Facture et articles enregistrés avec succès." });
    } catch (error) {
      if (error.message === "DATE_ACHAT_HORS_VOYAGE") {
        return res.status(400).json({
          error: {
            message:
              "La date d'achat doit être comprise entre la date de départ et la date de retour du voyage.",
          },
        });
      }
      res.status(400).json({ error: { message: error.message } });
    }
  },
];
