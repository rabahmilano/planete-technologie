import prisma from "../config/dbConfig.js";
import {
  chargerContextePromotions,
  promoGagnante as calculerPromoGagnante,
} from "../config/promotions.js";
import { body, validationResult } from "express-validator";
import {
  getMaxValue,
  arrondir,
  getPrixEffectifProduit,
  verifierCodePromoValide,
  calculerReductionPromo,
} from "../config/utils.js";
import {
  creerCommandeInterne,
  supprimerCommandeInterne,
} from "./commandeController.js";
import {
  creerColisDepuisCommande,
  estConfigure as yalidineConfigure,
} from "../config/yalidine.js";

const STATUTS_COMMANDE = [
  "NOUVELLE",
  "CONFIRMEE",
  "EXPEDIEE",
  "LIVREE",
  "ANNULEE",
];
const STATUTS_PAIEMENT = ["NON_PAYE", "PAYE"];
const TYPES_LIVRAISON = ["DOMICILE", "BUREAU"];
const TELEPHONE_DZ = /^0(5|6|7)[0-9]{8}$/;

const libererReservationStock = async (tx, lignes) => {
  for (const ligne of lignes) {
    await tx.produit.update({
      where: { id_prd: ligne.prd_id },
      data: { qte_reservee: { decrement: ligne.quantite } },
    });
  }
};

const appliquerLivraison = async (tx, commande) => {
  if (commande.commande_interne_id) {
    throw new Error("COMMANDE_DEJA_LIVREE");
  }

  const idsProduits = commande.lignes.map((ligne) => ligne.prd_id);
  if (new Set(idsProduits).size !== idsProduits.length) {
    throw new Error("LIGNES_DUPLIQUEES");
  }

  const { id_cde } = await creerCommandeInterne(tx, {
    dateVente: new Date(),
    produits: commande.lignes.map((ligne) => ({
      id_prd: ligne.prd_id,
      quantity: ligne.quantite,
      unitPrice: parseFloat(ligne.prix_unitaire_facture),
      totalPrice: arrondir(
        parseFloat(ligne.prix_unitaire_facture) * ligne.quantite,
      ),
    })),
    totalAmount: parseFloat(commande.montant_produits),
  });

  await libererReservationStock(tx, commande.lignes);

  return { commande_interne_id: id_cde };
};

const libererUtilisationPromo = async (tx, commande) => {
  if (!commande.code_promo_id) return;
  await tx.code_promo.updateMany({
    where: {
      id_code: commande.code_promo_id,
      utilisation_actuelle: { gt: 0 },
    },
    data: { utilisation_actuelle: { decrement: 1 } },
  });
};

const appliquerAnnulation = async (tx, commande) => {
  if (commande.commande_interne_id) {
    await tx.commande_web.update({
      where: { id_cmd_web: commande.id_cmd_web },
      data: { commande_interne_id: null },
    });
    try {
      await supprimerCommandeInterne(tx, commande.commande_interne_id);
    } catch (error) {
      if (error.message !== "NOT_FOUND") throw error;
    }
    await libererUtilisationPromo(tx, commande);
    return { commande_interne_id: null };
  }

  await libererReservationStock(tx, commande.lignes);
  await libererUtilisationPromo(tx, commande);
  return {};
};

const inclureCommande = {
  lignes: {
    select: {
      id_ligne: true,
      quantite: true,
      prix_unitaire_facture: true,
      designation_facturee: true,
      prd_id: true,
      produit: {
        select: { designation_prd: true, slug_prd: true },
      },
    },
    orderBy: { id_ligne: "asc" },
  },
  promo: {
    select: {
      id_code: true,
      code: true,
      type_reduction: true,
      valeur_reduction: true,
    },
  },
  commande_interne: {
    select: { id_cde: true, date_cde: true, mnt_cde: true },
  },
};

export const creerCommandeWebInterne = async (tx, donnees) => {
  const {
    nom_client,
    telephone,
    wilaya,
    code_wilaya,
    commune,
    adresse_exacte,
    type_livraison,
    bureau_livraison,
    frais_livraison,
    lignes,
    code_promo,
  } = donnees;

  let codePromoRecord = null;
  if (code_promo) {
    codePromoRecord = await tx.code_promo.findUnique({
      where: { code: code_promo.trim().toUpperCase() },
    });
    if (!codePromoRecord) {
      throw new Error("CODE_PROMO_INTROUVABLE");
    }
  }

  const lignesValorisees = [];
  let montantProduits = 0;
  const contextePromotions = await chargerContextePromotions();

  for (const ligne of lignes) {
    const prdId = parseInt(ligne.prd_id, 10);
    const quantite = parseInt(ligne.quantite, 10);

    const produit = await tx.produit.findUnique({
      where: { id_prd: prdId },
      include: { paliers: true },
    });
    if (!produit) {
      throw new Error(`PRODUIT_NOT_FOUND:${prdId}`);
    }
    if (produit.statut_publication !== "PUBLIE") {
      throw new Error(`PRODUIT_NON_PUBLIE:${prdId}`);
    }

    const disponible =
      produit.qte_dispo - produit.qte_reservee;
    if (quantite > disponible) {
      throw new Error(`STOCK_INSUFFISANT:${prdId}`);
    }

    const gagnante = calculerPromoGagnante(produit, contextePromotions);
    const prixUnitaire = getPrixEffectifProduit(
      produit,
      produit.paliers,
      quantite,
      gagnante,
    );
    if (prixUnitaire === null) {
      throw new Error(`PRIX_MANQUANT:${prdId}`);
    }

    montantProduits = arrondir(
      montantProduits + prixUnitaire * quantite,
    );
    lignesValorisees.push({
      prd_id: prdId,
      quantite,
      prix_unitaire_facture: prixUnitaire,
      designation_facturee: produit.designation_prd,
    });
  }

  let montantReduction = 0;
  if (codePromoRecord) {
    const verification = verifierCodePromoValide(
      codePromoRecord,
      montantProduits,
    );
    if (!verification.valide) {
      throw new Error(`CODE_PROMO_INVALIDE:${verification.message}`);
    }
    montantReduction = calculerReductionPromo(
      codePromoRecord,
      montantProduits,
    );
  }

  const montantTotalFinal = arrondir(
    montantProduits -
      montantReduction +
      parseFloat(frais_livraison),
  );

  const idCmdWeb = await getMaxValue("commande_web", "id_cmd_web", null);

  const commande = await tx.commande_web.create({
    data: {
      id_cmd_web: idCmdWeb,
      nom_client: nom_client.trim(),
      telephone: telephone.trim(),
      wilaya: wilaya.trim(),
      code_wilaya:
        code_wilaya !== undefined ? parseInt(code_wilaya, 10) : null,
      commune: commune.trim(),
      adresse_exacte: adresse_exacte || null,
      type_livraison,
      bureau_livraison: bureau_livraison || null,
      frais_livraison: parseFloat(frais_livraison),
      montant_produits: montantProduits,
      montant_reduction: montantReduction,
      montant_total_final: montantTotalFinal,
      statut_commande: "NOUVELLE",
      code_promo_id: codePromoRecord ? codePromoRecord.id_code : null,
    },
  });

  const maxLigne = await tx.ligne_commande_web.aggregate({
    _max: { id_ligne: true },
  });
  let prochainIdLigne = (maxLigne._max.id_ligne ?? 0) + 1;

  for (const ligne of lignesValorisees) {
    const idLigne = prochainIdLigne++;
    await tx.ligne_commande_web.create({
      data: {
        id_ligne: idLigne,
        quantite: ligne.quantite,
        prix_unitaire_facture: ligne.prix_unitaire_facture,
        designation_facturee: ligne.designation_facturee,
        cmd_web_id: idCmdWeb,
        prd_id: ligne.prd_id,
      },
    });
    await tx.produit.update({
      where: { id_prd: ligne.prd_id },
      data: { qte_reservee: { increment: ligne.quantite } },
    });
  }

  if (codePromoRecord) {
    await tx.code_promo.update({
      where: { id_code: codePromoRecord.id_code },
      data: { utilisation_actuelle: { increment: 1 } },
    });
  }

  return commande;
};

export const createCommandeWeb = [
  body("nom_client")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le nom du client est obligatoire"),
  body("telephone")
    .isString()
    .trim()
    .matches(TELEPHONE_DZ)
    .withMessage("Le téléphone doit être un numéro algérien valide (05, 06 ou 07)"),
  body("wilaya")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("La wilaya est obligatoire"),
  body("code_wilaya")
    .optional()
    .isInt({ min: 1, max: 58 })
    .withMessage("Le code wilaya doit être entre 1 et 58"),
  body("commune")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("La commune est obligatoire"),
  body("adresse_exacte")
    .optional()
    .isString()
    .trim()
    .withMessage("L'adresse exacte doit être une chaîne de caractères"),
  body("type_livraison")
    .customSanitizer((value) =>
      typeof value === "string" ? value.trim().toUpperCase() : value,
    )
    .isIn(TYPES_LIVRAISON)
    .withMessage(
      `Le type de livraison doit être ${TYPES_LIVRAISON.join(", ")}`,
    ),
  body("bureau_livraison")
    .optional()
    .isString()
    .trim()
    .withMessage("Le bureau de livraison doit être une chaîne de caractères"),
  body("frais_livraison")
    .isFloat({ min: 0 })
    .withMessage("Les frais de livraison doivent être un nombre positif ou nul"),
  body("lignes")
    .isArray({ min: 1 })
    .withMessage("La commande doit contenir au moins une ligne"),
  body("lignes.*.prd_id")
    .isInt()
    .withMessage("Chaque ligne doit contenir un identifiant produit valide"),
  body("lignes.*.quantite")
    .isInt({ min: 1 })
    .withMessage("La quantité de chaque ligne doit être supérieure à 0"),
  body("code_promo")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le code promo doit être une chaîne de caractères"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      nom_client,
      telephone,
      wilaya,
      code_wilaya,
      commune,
      adresse_exacte,
      type_livraison,
      bureau_livraison,
      frais_livraison,
      lignes,
      code_promo,
    } = req.body;

    if (type_livraison === "BUREAU" && !bureau_livraison) {
      return res.status(400).json({
        message: "Le bureau de livraison est obligatoire pour une livraison au bureau.",
      });
    }

    try {
      const commandeCreee = await prisma.$transaction((tx) =>
        creerCommandeWebInterne(tx, {
          nom_client,
          telephone,
          wilaya,
          code_wilaya,
          commune,
          adresse_exacte,
          type_livraison,
          bureau_livraison,
          frais_livraison,
          lignes,
          code_promo,
        }),
      );

      const commandeComplete = await prisma.commande_web.findUnique({
        where: { id_cmd_web: commandeCreee.id_cmd_web },
        include: inclureCommande,
      });

      res.status(201).json(commandeComplete);
    } catch (error) {
      if (error.message === "CODE_PROMO_INTROUVABLE") {
        return res.status(400).json({ message: "Code promo introuvable." });
      }
      if (error.message.startsWith("PRODUIT_NOT_FOUND:")) {
        return res.status(404).json({ message: "Produit introuvable." });
      }
      if (error.message.startsWith("PRODUIT_NON_PUBLIE:")) {
        return res.status(400).json({
          message: "Un produit de la commande n'est pas publié.",
        });
      }
      if (error.message.startsWith("STOCK_INSUFFISANT:")) {
        return res.status(400).json({
          message: "Stock insuffisant pour un produit de la commande.",
        });
      }
      if (error.message.startsWith("PRIX_MANQUANT:")) {
        return res.status(400).json({
          message: "Un produit de la commande n'a pas de prix de vente.",
        });
      }
      if (error.message.startsWith("CODE_PROMO_INVALIDE:")) {
        return res.status(400).json({
          message: error.message.replace("CODE_PROMO_INVALIDE:", ""),
        });
      }

      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const getAllCommandesWeb = async (req, res) => {
  const {
    page = 1,
    limit = 25,
    statut,
    search = "",
  } = req.query;

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 25;
  const skip = (pageNum - 1) * limitNum;

  const whereClause = {};
  if (statut && STATUTS_COMMANDE.includes(statut)) {
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
        include: inclureCommande,
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

export const getCommandeWebById = async (req, res) => {
  const idCommande = parseInt(req.params.id, 10);
  if (isNaN(idCommande)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  try {
    const commande = await prisma.commande_web.findUnique({
      where: { id_cmd_web: idCommande },
      include: inclureCommande,
    });

    if (!commande) {
      return res.status(404).json({ message: "Commande introuvable." });
    }

    res.status(200).json(commande);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const updateCommandeWeb = [
  body("note_admin")
    .optional({ nullable: true })
    .isString()
    .withMessage("La note admin doit être une chaîne de caractères"),
  body("statut_paiement")
    .optional()
    .isIn(STATUTS_PAIEMENT)
    .withMessage(
      `Le statut de paiement doit être ${STATUTS_PAIEMENT.join(", ")}`,
    ),
  body("code_tracking")
    .optional({ nullable: true })
    .isString()
    .trim()
    .withMessage("Le code de suivi doit être une chaîne de caractères"),
  body("adresse_exacte")
    .optional({ nullable: true })
    .isString()
    .trim()
    .withMessage("L'adresse exacte doit être une chaîne de caractères"),
  body("telephone")
    .optional()
    .isString()
    .trim()
    .matches(TELEPHONE_DZ)
    .withMessage("Le téléphone doit être un numéro algérien valide (05, 06 ou 07)"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idCommande = parseInt(req.params.id, 10);
    if (isNaN(idCommande)) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const { note_admin, statut_paiement, code_tracking, adresse_exacte, telephone } =
      req.body;

    try {
      const commande = await prisma.commande_web.findUnique({
        where: { id_cmd_web: idCommande },
      });
      if (!commande) {
        return res.status(404).json({ message: "Commande introuvable." });
      }

      const dataToUpdate = {};
      if (note_admin !== undefined) {
        dataToUpdate.note_admin = note_admin || null;
      }
      if (statut_paiement !== undefined) {
        dataToUpdate.statut_paiement = statut_paiement;
      }
      if (code_tracking !== undefined) {
        dataToUpdate.code_tracking = code_tracking || null;
      }
      if (adresse_exacte !== undefined) {
        dataToUpdate.adresse_exacte = adresse_exacte || null;
      }
      if (telephone !== undefined) {
        dataToUpdate.telephone = telephone.trim();
      }

      if (Object.keys(dataToUpdate).length === 0) {
        return res
          .status(400)
          .json({ message: "Aucune donnée à mettre à jour fournie." });
      }

      const commandeModifiee = await prisma.commande_web.update({
        where: { id_cmd_web: idCommande },
        data: dataToUpdate,
        include: inclureCommande,
      });

      res.status(200).json(commandeModifiee);
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const updateStatutCommandeWeb = [
  body("statut_commande")
    .isIn(STATUTS_COMMANDE)
    .withMessage(
      `Le statut de la commande doit être ${STATUTS_COMMANDE.join(", ")}`,
    ),
  body("code_tracking")
    .optional()
    .isString()
    .trim()
    .withMessage("Le code de suivi doit être une chaîne de caractères"),
  body("note_admin")
    .optional()
    .isString()
    .withMessage("La note admin doit être une chaîne de caractères"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idCommande = parseInt(req.params.id, 10);
    if (isNaN(idCommande)) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const { statut_commande, code_tracking, note_admin } = req.body;

    try {
      const commande = await prisma.commande_web.findUnique({
        where: { id_cmd_web: idCommande },
        include: { lignes: true },
      });
      if (!commande) {
        return res.status(404).json({ message: "Commande introuvable." });
      }

      if (commande.statut_commande === "ANNULEE") {
        return res.status(400).json({
          message: "Une commande annulée ne peut plus changer de statut.",
        });
      }
      if (statut_commande === commande.statut_commande) {
        return res.status(400).json({
          message: "La commande est déjà dans ce statut.",
        });
      }
      if (
        statut_commande === "EXPEDIEE" &&
        !code_tracking &&
        !commande.code_tracking
      ) {
        return res.status(400).json({
          message: "Le code de suivi est obligatoire pour expédier une commande.",
        });
      }

      const commandeModifiee = await prisma.$transaction(async (tx) => {
        const dataToUpdate = { statut_commande };
        if (code_tracking !== undefined) {
          dataToUpdate.code_tracking = code_tracking;
        }
        if (note_admin !== undefined) {
          dataToUpdate.note_admin = note_admin;
        }
        if (statut_commande === "ANNULEE") {
          Object.assign(
            dataToUpdate,
            await appliquerAnnulation(tx, commande),
          );
        }
        if (statut_commande === "LIVREE") {
          Object.assign(
            dataToUpdate,
            await appliquerLivraison(tx, commande),
          );
        }

        return tx.commande_web.update({
          where: { id_cmd_web: idCommande },
          data: dataToUpdate,
          include: inclureCommande,
        });
      });

      if (
        statut_commande === "CONFIRMEE" &&
        yalidineConfigure() &&
        !commandeModifiee.code_tracking
      ) {
        try {
          const lignesAvecPoids = await Promise.all(
            commandeModifiee.lignes.map(async (ligne) => {
              const produit = await prisma.produit.findUnique({
                where: { id_prd: ligne.prd_id },
                select: { poids_grammes: true },
              });
              return {
                ...ligne,
                poids_grammes: produit?.poids_grammes || 500,
              };
            }),
          );
          const colis = await creerColisDepuisCommande(
            commandeModifiee,
            lignesAvecPoids,
          );
          await prisma.commande_web.update({
            where: { id_cmd_web: idCommande },
            data: { code_tracking: colis.tracking },
          });
          commandeModifiee.code_tracking = colis.tracking;
        } catch (erreur) {
          console.error(
            `Création du colis Yalidine impossible pour la commande ${idCommande} :`,
            erreur.message,
          );
        }
      }

      res.status(200).json(commandeModifiee);
    } catch (error) {
      if (error.message === "COMMANDE_DEJA_LIVREE") {
        return res.status(400).json({
          message: "La commande a déjà été enregistrée comme vente.",
        });
      }
      if (error.message === "LIGNES_DUPLIQUEES") {
        return res.status(400).json({
          message:
            "La commande contient deux fois le même produit, livraison impossible.",
        });
      }
      if (error.message === "CAISSE_NOT_FOUND") {
        return res.status(409).json({
          message: "Annulation impossible : Le compte 'Caisse' est introuvable.",
        });
      }
      if (
        error.message.includes("insuffisant") ||
        error.message.includes("Conflit") ||
        error.message.includes("Incohérence")
      ) {
        return res.status(409).json({ message: error.message });
      }

      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const annulerCommandeWeb = [
  body("note_admin")
    .optional()
    .isString()
    .withMessage("La note admin doit être une chaîne de caractères"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idCommande = parseInt(req.params.id, 10);
    if (isNaN(idCommande)) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const { note_admin } = req.body;

    try {
      const commande = await prisma.commande_web.findUnique({
        where: { id_cmd_web: idCommande },
        include: { lignes: true },
      });
      if (!commande) {
        return res.status(404).json({ message: "Commande introuvable." });
      }

      if (commande.statut_commande === "ANNULEE") {
        return res
          .status(400)
          .json({ message: "La commande est déjà annulée." });
      }

      const commandeAnnulee = await prisma.$transaction(async (tx) => {
        const dataToUpdate = { statut_commande: "ANNULEE" };
        Object.assign(
          dataToUpdate,
          await appliquerAnnulation(tx, commande),
        );
        if (note_admin !== undefined) {
          dataToUpdate.note_admin = note_admin;
        }

        return tx.commande_web.update({
          where: { id_cmd_web: idCommande },
          data: dataToUpdate,
          include: inclureCommande,
        });
      });

      res.status(200).json(commandeAnnulee);
    } catch (error) {
      if (error.message === "CAISSE_NOT_FOUND") {
        return res.status(409).json({
          message: "Annulation impossible : Le compte 'Caisse' est introuvable.",
        });
      }

      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];
