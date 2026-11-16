import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";
import {
  getMaxValue,
  arrondirPrix,
  getPrixEffectif,
  estCodeUtilisable,
  calculerReduction,
} from "../config/utils.js";

const STATUTS_COMMANDE_WEB = [
  "NOUVELLE",
  "CONFIRMEE",
  "EXPEDIEE",
  "LIVREE",
  "ANNULEE",
];

const TYPES_LIVRAISON = ["DOMICILE", "BUREAU"];

export const creerCommandeWeb = [
  body("nomClient")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le nom du client est obligatoire")
    .isLength({ max: 100 })
    .withMessage("Le nom du client ne peut pas dépasser 100 caractères"),
  body("telephone")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le téléphone est obligatoire")
    .isLength({ max: 20 })
    .withMessage("Le téléphone ne peut pas dépasser 20 caractères"),
  body("wilaya")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("La wilaya est obligatoire")
    .isLength({ max: 50 })
    .withMessage("La wilaya ne peut pas dépasser 50 caractères"),
  body("codeWilaya")
    .optional({ nullable: true })
    .isInt({ min: 1, max: 58 })
    .withMessage("Le code wilaya doit être compris entre 1 et 58"),
  body("commune")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("La commune est obligatoire")
    .isLength({ max: 100 })
    .withMessage("La commune ne peut pas dépasser 100 caractères"),
  body("adresseExacte")
    .optional({ nullable: true })
    .isString()
    .trim()
    .withMessage("L'adresse doit être une chaîne de caractères"),
  body("typeLivraison")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le type de livraison est obligatoire"),
  body("bureauLivraison")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Le bureau de livraison ne peut pas dépasser 200 caractères"),
  body("fraisLivraison")
    .isFloat({ min: 0 })
    .withMessage("Les frais de livraison sont obligatoires"),
  body("codePromo")
    .optional({ nullable: true })
    .isString()
    .trim()
    .withMessage("Le code promo doit être une chaîne de caractères"),
  body("lignes")
    .isArray({ min: 1 })
    .withMessage("Au moins une ligne de commande est requise"),
  body("lignes.*.prd_id")
    .isInt()
    .withMessage("Chaque ligne doit référencer un produit valide"),
  body("lignes.*.quantite")
    .isInt({ gt: 0 })
    .withMessage("La quantité de chaque ligne doit être supérieure à 0"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const typeLivraison = req.body.typeLivraison.trim().toUpperCase();
    if (!TYPES_LIVRAISON.includes(typeLivraison)) {
      return res.status(400).json({
        message: "Type de livraison invalide (DOMICILE ou BUREAU).",
      });
    }
    if (typeLivraison === "BUREAU" && !req.body.bureauLivraison) {
      return res.status(400).json({
        message:
          "Le bureau de livraison est obligatoire pour une livraison au bureau.",
      });
    }

    const fraisLivraison = parseFloat(req.body.fraisLivraison);

    try {
      const commande = await prisma.$transaction(async (tx) => {
        const lignesBrutes = req.body.lignes.map((ligne) => ({
          prd_id: parseInt(ligne.prd_id, 10),
          quantite: parseInt(ligne.quantite, 10),
        }));

        const produits = await tx.produit.findMany({
          where: { id_prd: { in: lignesBrutes.map((l) => l.prd_id) } },
          include: { paliers: true },
        });
        const produitsParId = new Map(
          produits.map((produit) => [produit.id_prd, produit]),
        );

        let montantProduits = 0;
        const lignesCalculees = lignesBrutes.map((ligne) => {
          const produit = produitsParId.get(ligne.prd_id);
          if (!produit) {
            throw new Error(`PRODUIT_INTROUVABLE:${ligne.prd_id}`);
          }
          const disponible = produit.qte_dispo - produit.qte_reservee;
          if (ligne.quantite > disponible) {
            throw new Error(`STOCK_INSUFFISANT:${produit.designation_prd}`);
          }
          const prixUnitaire = getPrixEffectif(produit, ligne.quantite);
          if (prixUnitaire === null) {
            throw new Error(`PRIX_MANQUANT:${produit.designation_prd}`);
          }
          montantProduits = arrondirPrix(
            montantProduits + prixUnitaire * ligne.quantite,
          );
          return { produit, quantite: ligne.quantite, prixUnitaire };
        });

        let codePromoId = null;
        let montantReduction = 0;
        if (req.body.codePromo) {
          const code = req.body.codePromo.trim().toUpperCase();
          const codePromo = await tx.code_promo.findUnique({ where: { code } });
          const verification = estCodeUtilisable(codePromo, montantProduits);
          if (!verification.utilisable) {
            throw new Error(`CODE_PROMO_INVALIDE:${verification.motif}`);
          }
          montantReduction = calculerReduction(codePromo, montantProduits);
          codePromoId = codePromo.id_code;
        }

        const montantTotalFinal = arrondirPrix(
          montantProduits - montantReduction + fraisLivraison,
        );

        const idCmdWeb = await getMaxValue("commande_web", "id_cmd_web", null);
        let idLigneCourant = await getMaxValue(
          "ligne_commande_web",
          "id_ligne",
          null,
        );

        const lignesData = lignesCalculees.map((ligne) => {
          const ligneData = {
            id_ligne: idLigneCourant,
            quantite: ligne.quantite,
            prix_unitaire_facture: ligne.prixUnitaire,
            designation_facturee: ligne.produit.designation_prd,
            prd_id: ligne.produit.id_prd,
          };
          idLigneCourant++;
          return ligneData;
        });

        const nouvelleCommande = await tx.commande_web.create({
          data: {
            id_cmd_web: idCmdWeb,
            nom_client: req.body.nomClient.trim(),
            telephone: req.body.telephone.trim(),
            wilaya: req.body.wilaya.trim(),
            code_wilaya:
              req.body.codeWilaya !== undefined && req.body.codeWilaya !== null
                ? parseInt(req.body.codeWilaya, 10)
                : null,
            commune: req.body.commune.trim(),
            adresse_exacte: req.body.adresseExacte
              ? req.body.adresseExacte.trim()
              : null,
            type_livraison: typeLivraison,
            bureau_livraison: req.body.bureauLivraison
              ? req.body.bureauLivraison.trim()
              : null,
            frais_livraison: fraisLivraison,
            montant_produits: montantProduits,
            montant_reduction: montantReduction,
            montant_total_final: montantTotalFinal,
            code_promo_id: codePromoId,
            lignes: { create: lignesData },
          },
          include: { lignes: true, promo: true },
        });

        for (const ligne of lignesCalculees) {
          await tx.produit.update({
            where: { id_prd: ligne.produit.id_prd },
            data: { qte_reservee: { increment: ligne.quantite } },
          });
        }

        if (codePromoId !== null) {
          await tx.code_promo.update({
            where: { id_code: codePromoId },
            data: { utilisation_actuelle: { increment: 1 } },
          });
        }

        return nouvelleCommande;
      });

      res.status(201).json(commande);
    } catch (error) {
      if (error.message?.startsWith("PRODUIT_INTROUVABLE")) {
        return res.status(404).json({
          message: `Produit introuvable (id ${error.message.split(":")[1]}).`,
        });
      }
      if (error.message?.startsWith("STOCK_INSUFFISANT")) {
        return res.status(400).json({
          message: `Stock disponible insuffisant pour "${error.message.split(":")[1]}".`,
        });
      }
      if (error.message?.startsWith("PRIX_MANQUANT")) {
        return res.status(400).json({
          message: `Aucun prix de vente défini pour "${error.message.split(":")[1]}".`,
        });
      }
      if (error.message?.startsWith("CODE_PROMO_INVALIDE")) {
        const motif = error.message.split(":")[1];
        const messages = {
          CODE_INTROUVABLE: "Code promo introuvable.",
          CODE_DESACTIVE: "Ce code promo est désactivé.",
          CODE_EXPIRE: "Ce code promo a expiré.",
          CODE_EPUISE:
            "Ce code promo a atteint son nombre maximum d'utilisations.",
          MONTANT_MIN_NON_ATTEINT:
            "Le montant minimum requis pour ce code promo n'est pas atteint.",
        };
        return res
          .status(400)
          .json({ message: messages[motif] || "Code promo refusé." });
      }
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const getAllCommandesWeb = async (req, res) => {
  const { page = 1, limit = 25, statut, search = "" } = req.query;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 25;
  const skip = (pageNum - 1) * limitNum;

  const whereClause = {};

  if (statut && STATUTS_COMMANDE_WEB.includes(statut)) {
    whereClause.statut_commande = statut;
  }
  if (search) {
    whereClause.OR = [
      { nom_client: { contains: search } },
      { telephone: { contains: search } },
    ];
  }

  try {
    const [commandes, total] = await prisma.$transaction([
      prisma.commande_web.findMany({
        where: whereClause,
        include: {
          lignes: {
            select: {
              id_ligne: true,
              quantite: true,
              prix_unitaire_facture: true,
              designation_facturee: true,
              prd_id: true,
            },
          },
          promo: {
            select: {
              id_code: true,
              code: true,
              type_reduction: true,
              valeur_reduction: true,
            },
          },
        },
        orderBy: { date_creation: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.commande_web.count({ where: whereClause }),
    ]);

    res.status(200).json({ commandes, total });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getCommandeWebDetail = async (req, res) => {
  const idCmd = parseInt(req.params.id, 10);
  if (isNaN(idCmd)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  try {
    const commande = await prisma.commande_web.findUnique({
      where: { id_cmd_web: idCmd },
      include: {
        lignes: {
          include: {
            produit: {
              select: { id_prd: true, designation_prd: true, slug_prd: true },
            },
          },
        },
        promo: true,
      },
    });

    if (!commande) {
      return res.status(404).json({ message: "Commande web introuvable." });
    }

    res.status(200).json(commande);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const changerStatutCommandeWeb = [
  body("statutCommande")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le statut est obligatoire")
    .isIn(STATUTS_COMMANDE_WEB)
    .withMessage(
      "Statut invalide (NOUVELLE, CONFIRMEE, EXPEDIEE, LIVREE, ANNULEE)",
    ),
  body("codeTracking")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Le code de suivi ne peut pas dépasser 100 caractères"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idCmd = parseInt(req.params.id, 10);
    if (isNaN(idCmd)) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const { statutCommande, codeTracking } = req.body;

    try {
      const commande = await prisma.commande_web.findUnique({
        where: { id_cmd_web: idCmd },
        select: { id_cmd_web: true, statut_commande: true },
      });
      if (!commande) {
        return res.status(404).json({ message: "Commande web introuvable." });
      }
      if (commande.statut_commande === "ANNULEE") {
        return res.status(409).json({
          message:
            "Cette commande est annulée, son statut ne peut plus être modifié.",
        });
      }

      const data = { statut_commande: statutCommande.trim().toUpperCase() };
      if (codeTracking !== undefined && codeTracking !== null) {
        data.code_tracking = codeTracking.trim();
      }

      const commandeMAJ = await prisma.commande_web.update({
        where: { id_cmd_web: idCmd },
        data,
        include: { lignes: true, promo: true },
      });

      res.status(200).json(commandeMAJ);
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const annulerCommandeWeb = async (req, res) => {
  const idCmd = parseInt(req.params.id, 10);
  if (isNaN(idCmd)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  try {
    const commande = await prisma.$transaction(async (tx) => {
      const cmd = await tx.commande_web.findUnique({
        where: { id_cmd_web: idCmd },
        include: { lignes: true },
      });
      if (!cmd) throw new Error("COMMANDE_INTROUVABLE");
      if (cmd.statut_commande === "ANNULEE") {
        throw new Error("COMMANDE_DEJA_ANNULEE");
      }

      for (const ligne of cmd.lignes) {
        await tx.produit.update({
          where: { id_prd: ligne.prd_id },
          data: { qte_reservee: { decrement: ligne.quantite } },
        });
      }

      if (cmd.code_promo_id !== null) {
        await tx.code_promo.update({
          where: { id_code: cmd.code_promo_id },
          data: { utilisation_actuelle: { decrement: 1 } },
        });
      }

      return tx.commande_web.update({
        where: { id_cmd_web: idCmd },
        data: { statut_commande: "ANNULEE" },
        include: { lignes: true, promo: true },
      });
    });

    res.status(200).json(commande);
  } catch (error) {
    if (error.message === "COMMANDE_INTROUVABLE") {
      return res.status(404).json({ message: "Commande web introuvable." });
    }
    if (error.message === "COMMANDE_DEJA_ANNULEE") {
      return res.status(409).json({ message: "Cette commande est déjà annulée." });
    }
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};
