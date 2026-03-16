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

    try {
      const idVoyage = await getMaxValue("voyage", "id_voyage", null);

      const nouveauVoyage = await prisma.voyage.create({
        data: {
          id_voyage: idVoyage,
          designation: desVoyage,
          destination: destination || null,
          date_depart: new Date(dateDepart),
          date_retour: new Date(dateRetour),
          devise_destination: deviseDest || "CNY",
          compte_defaut_id: cptDefautId ? parseInt(cptDefautId) : null,
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
  body("desVoyage").isString().trim().notEmpty(),
  body("destination").optional().isString().trim(),
  body("dateDepart").notEmpty(),
  body("dateRetour").notEmpty(),
  body("cptDefautId").optional({ checkFalsy: true }).isInt(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { desVoyage, destination, dateDepart, dateRetour, cptDefautId } =
      req.body;

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
          designation: desVoyage,
          destination: destination || null,
          date_depart: new Date(dateDepart),
          date_retour: new Date(dateRetour),
          compte_defaut_id: cptDefautId ? parseInt(cptDefautId) : null,
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
      return res.status(403).json({
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
// WORKFLOW : CHANGEMENT DE STATUT & CLÔTURE
// ==========================================

export const changerStatutVoyage = async (req, res) => {
  const { id } = req.params;
  const { statut, tauxChange } = req.body;

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

      if (statut === "EN_COURS") {
        if (!tauxChange)
          throw new Error("Le taux de change prévisionnel est requis.");

        await tx.voyage.update({
          where: { id_voyage: parseInt(id) },
          data: {
            statut: "EN_COURS",
            taux_change_devise: parseFloat(tauxChange),
          },
        });
      } else if (statut === "CLOTURE") {
        if (voyage.transactions.length === 0)
          throw new Error("Impossible de clôturer sans transactions.");

        const totalFraisDZD = voyage.depenses.reduce(
          (sum, d) => sum + parseFloat(d.mnt_dep_dzd),
          0,
        );
        let totalMarchandisesDZD = 0;

        voyage.transactions.forEach((t) => {
          totalMarchandisesDZD +=
            parseFloat(t.montant_total) * parseFloat(t.taux_transaction);
        });

        // SÉCURITÉ : Éviter la division par zéro si un voyage a des transactions mais un total de 0
        if (totalMarchandisesDZD === 0) {
          throw new Error(
            "Le total des marchandises est de 0 DZD. Impossible de calculer le coefficient d'approche.",
          );
        }

        const coeffApproche =
          (totalMarchandisesDZD + totalFraisDZD) / totalMarchandisesDZD;

        await tx.voyage.update({
          where: { id_voyage: parseInt(id) },
          data: { statut: "CLOTURE", coefficient_approche: coeffApproche },
        });

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
      articles,
    } = req.body;

    try {
      await prisma.$transaction(async (tx) => {
        const compte = await tx.compte.findUnique({
          where: { id_cpt: parseInt(cptPaiementId) },
        });
        if (!compte) throw new Error("Compte introuvable");
        if (parseFloat(compte.solde_actuel) < parseFloat(montantDebite)) {
          throw new Error("Solde insuffisant.");
        }

        const voyage = await tx.voyage.findUnique({
          where: { id_voyage: parseInt(idVoyage) },
        });
        if (!voyage || voyage.statut !== "EN_COURS") {
          throw new Error("Le voyage doit être EN_COURS.");
        }

        // CORRECTION LOGIQUE : Calcul automatique de la date de stock (Date de retour + 1 jour)
        const dateStockPrevue = new Date(voyage.date_retour);
        dateStockPrevue.setDate(dateStockPrevue.getDate() + 1);

        const idTransaction = await getMaxValue(
          "transaction_voyage",
          "id_transaction",
          null,
        );
        const transaction = await tx.transaction_voyage.create({
          data: {
            id_transaction: idTransaction,
            voyage_id: parseInt(idVoyage),
            compte_id: parseInt(cptPaiementId),
            fournisseur: fournisseur || null,
            devise_transaction: deviseFacture,
            taux_transaction: parseFloat(tauxDzd),
            montant_total: parseFloat(montantFacture),
            commission_banque: parseFloat(commBanque),
            commission_paiement: parseFloat(commPaiement),
          },
        });

        const ratioConversionCarte =
          parseFloat(montantDebite) / parseFloat(montantFacture);

        for (const article of articles) {
          const qte = parseInt(article.qte);
          const pu_dest = parseFloat(article.puDevise);
          const mnt_tot_dest = pu_dest * qte;

          const mnt_tot_carte = mnt_tot_dest * ratioConversionCarte;
          const pu_carte = mnt_tot_carte / qte;

          const mnt_tot_dzd = mnt_tot_dest * parseFloat(tauxDzd);
          const pu_dzd = mnt_tot_dzd / qte;

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
              cat_id: parseInt(article.catId),
              prd_id: prd_id,
              cpt_id: parseInt(cptPaiementId),
              mnt_tot_dev: mnt_tot_carte,
              date_stock: dateStockPrevue, // Utilisation de la logique (retour + 1j)
              qte_achat: qte,
              mnt_tot_dzd: mnt_tot_dzd,
              pu_dev: pu_carte,
              pu_dzd: pu_dzd,
              pu_dzd_ttc: pu_dzd,
              colis_voyage: {
                create: {
                  transaction_id: idTransaction,
                  pu_devise_dest: pu_dest,
                  mnt_tot_dev_dest: mnt_tot_dest,
                  pu_dev_ttc: pu_carte,
                  mnt_dev_ttc: mnt_tot_carte,
                },
              },
            },
          });
        }

        await tx.compte.update({
          where: { id_cpt: parseInt(cptPaiementId) },
          data: { solde_actuel: { decrement: parseFloat(montantDebite) } },
        });
      });

      res
        .status(201)
        .json({ message: "Facture et articles enregistrés avec succès." });
    } catch (error) {
      res.status(400).json({ error: { message: error.message } });
    }
  },
];
