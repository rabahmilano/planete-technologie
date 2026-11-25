import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";
import {
  arrondir,
  getPrixEffectifProduit,
  verifierCodePromoValide,
  calculerReductionPromo,
  calculerPoidsFactureKg,
  POIDS_DEFAUT_GRAMMES,
} from "../config/utils.js";
import {
  chargerContextePromotions,
  promoGagnante,
} from "../config/promotions.js";
import { WILAYAS, nomWilaya } from "../config/wilayas.js";
import {
  estConfigure as yalidineConfigure,
  getCommunes,
  getCentres,
  getFrais,
  getHistorique,
} from "../config/yalidine.js";
import { envoyerNotificationCommande } from "../config/whatsapp.js";
import { creerCommandeWebInterne } from "./commandeWebController.js";

const TYPES_LIVRAISON = ["DOMICILE", "BUREAU"];
const TELEPHONE_DZ = /^0(5|6|7)[0-9]{8}$/;
const TRIS = ["pertinence", "prix_asc", "prix_desc", "nouveautes"];

// Fabrique : la fenêtre de validité est évaluée à chaque requête, pas au
// démarrage du serveur, pour refléter les promotions créées ou expirées
// pendant l'uptime.
const fenetrePromotionActive = () => ({
  est_active: true,
  date_debut: { lte: new Date() },
  date_fin: { gte: new Date() },
});

const formaterProduitBoutique = (produit, contextePromotions) => {
  const imagesTriees = [...(produit.images || [])].sort(
    (a, b) =>
      (b.est_principale ? 1 : 0) - (a.est_principale ? 1 : 0) ||
      a.ordre_image - b.ordre_image ||
      a.id_img - b.id_img,
  );
  const principale = imagesTriees[0] || null;
  const gagnante = promoGagnante(produit, contextePromotions);
  const enPromo = gagnante !== null;
  return {
    slug: produit.slug_prd,
    designation: produit.designation_prd,
    intitule_publication: produit.intitule_publication || null,
    description: produit.description,
    description_ar: produit.description_ar,
    prix_effectif: getPrixEffectifProduit(produit, produit.paliers, 1, gagnante),
    prix_vente:
      produit.prix_vente === null ? null : parseFloat(produit.prix_vente),
    prix_barre: enPromo ? parseFloat(produit.prix_vente) : null,
    prix_promo: enPromo ? gagnante.prix : null,
    debut_promo: enPromo ? gagnante.promotion.date_debut : null,
    fin_promo: enPromo ? gagnante.promotion.date_fin : null,
    promo_active: enPromo,
    image_principale: principale ? principale.url_image : null,
    images: imagesTriees.map((image) => ({
      url: image.url_image,
      est_principale: image.est_principale,
    })),
    famille: produit.famille
      ? {
          id: produit.famille.id_famille,
          nom: produit.famille.nom_famille,
          slug: produit.famille.slug_famille,
        }
      : null,
    en_stock: produit.qte_dispo - produit.qte_reservee > 0,
    est_mis_en_avant: produit.est_mis_en_avant,
    poids_grammes: produit.poids_grammes,
    paliers: (produit.paliers || []).map((palier) => ({
      quantite_min: palier.quantite_min,
      prix_unitaire: parseFloat(palier.prix_unitaire),
    })),
  };
};

const inclureProduitBoutique = {
  famille: {
    select: { id_famille: true, nom_famille: true, slug_famille: true },
  },
  images: { orderBy: [{ ordre_image: "asc" }, { id_img: "asc" }] },
  paliers: { orderBy: { quantite_min: "asc" } },
};

// Familles masquées en boutique : inactives + toute leur descendance.
// La table est minuscule (8 lignes) : lecture complète + calcul en JS,
// pas de jointure récursive en SQL. Les produits sans famille ne sont
// jamais masqués (famille_id null hors de l'ensemble).
const getIdsFamillesMasquees = async () => {
  const toutes = await prisma.famille_produit.findMany({
    select: {
      id_famille: true,
      est_active_famille: true,
      famille_parente_id: true,
    },
  });
  const enfantsParParent = new Map();
  for (const famille of toutes) {
    if (!enfantsParParent.has(famille.famille_parente_id)) {
      enfantsParParent.set(famille.famille_parente_id, []);
    }
    enfantsParParent.get(famille.famille_parente_id).push(famille);
  }
  const masquees = new Set();
  const masquerSousArbre = (famille) => {
    masquees.add(famille.id_famille);
    for (const enfant of enfantsParParent.get(famille.id_famille) || []) {
      masquerSousArbre(enfant);
    }
  };
  for (const famille of toutes) {
    if (!famille.est_active_famille) masquerSousArbre(famille);
  }
  return masquees;
};

// `poidsKg` = poids FACTURÉ total de la commande (max(poids réel, poids
// volumétrique), voir calculerPoidsFactureKg) — c'est lui qui détermine le
// supplément surpoids côté Yalidine, pas le poids réel seul.
const calculerFraisLivraison = async ({
  codeWilaya,
  typeLivraison,
  poidsKg = 0,
  idCommune = null,
}) => {
  const estBureau = typeLivraison === "BUREAU";
  if (yalidineConfigure()) {
    try {
      const devis = await getFrais({
        versWilayaId: codeWilaya,
        versCommuneId: idCommune,
        estBureau,
        poidsKg,
      });
      return { prix: devis.prix, source: "yalidine" };
    } catch (erreur) {
      console.error(
        "Devis Yalidine indisponible, repli sur la grille locale :",
        erreur.message,
      );
    }
  }
  const tarif = await prisma.tarif_livraison.findFirst({
    where: {
      code_wilaya_tarif: codeWilaya,
      type_livraison_tarif: typeLivraison,
      actif_tarif: true,
    },
  });
  if (tarif) {
    return {
      prix: parseFloat(tarif.prix_livraison_tarif),
      source: "tarif_livraison",
    };
  }
  return { prix: 0, source: "indisponible" };
};

export const getProduitsBoutique = async (req, res) => {
  const {
    recherche = "",
    famille,
    prix_min,
    prix_max,
    promo,
    en_stock,
    tri = "pertinence",
    page = 1,
    limit = 24,
  } = req.query;

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = Math.min(parseInt(limit, 10) || 24, 100);
  const skip = (pageNum - 1) * limitNum;

  const whereClause = {
    statut_publication: "PUBLIE",
    prix_vente: { not: null },
  };
  if (recherche) {
    whereClause.OR = [
      { designation_prd: { contains: recherche } },
      { description: { contains: recherche } },
    ];
  }
  if (famille && !isNaN(parseInt(famille, 10))) {
    const idFamille = parseInt(famille, 10);
    const familleAvecEnfants = await prisma.famille_produit.findMany({
      where: {
        OR: [{ id_famille: idFamille }, { famille_parente_id: idFamille }],
      },
      select: { id_famille: true },
    });
    whereClause.famille_id = {
      in: familleAvecEnfants.map((f) => f.id_famille),
    };
  }
  if (prix_min !== undefined && !isNaN(parseFloat(prix_min))) {
    whereClause.prix_vente = {
      ...(whereClause.prix_vente || {}),
      gte: parseFloat(prix_min),
    };
  }
  if (prix_max !== undefined && !isNaN(parseFloat(prix_max))) {
    whereClause.prix_vente = {
      ...(whereClause.prix_vente || {}),
      lte: parseFloat(prix_max),
    };
  }
  if (promo === "true") {
    // Périmètre TOUS : une seule promotion active met tout le catalogue en
    // promo — pas besoin de filtrer par produit.
    const promoTous = await prisma.promotion.findFirst({
      where: { ...fenetrePromotionActive(), perimetre: "TOUS" },
      select: { id_promotion: true },
    });
    if (!promoTous) {
      whereClause.AND = [
        {
          OR: [
            {
              promotions: { some: { promotion: fenetrePromotionActive() } },
            },
            {
              famille: {
                promotions: { some: { promotion: fenetrePromotionActive() } },
              },
            },
            {
              famille: {
                famille_parente: {
                  promotions: { some: { promotion: fenetrePromotionActive() } },
                },
              },
            },
          ],
        },
      ];
    }
  }
  if (en_stock === "true") {
    const enStock = await prisma.$queryRaw`
      SELECT id_prd FROM produit
      WHERE statut_publication = 'PUBLIE' AND qte_dispo > qte_reservee
    `;
    whereClause.id_prd = { in: enStock.map((ligne) => ligne.id_prd) };
  }

  // Familles masquées : leurs produits ne sortent ni en liste, ni en
  // recherche, ni via le filtre `famille` (in + notIn = ensemble vide).
  const famillesMasquees = await getIdsFamillesMasquees();
  if (famillesMasquees.size > 0) {
    whereClause.famille_id = {
      ...(whereClause.famille_id || {}),
      notIn: [...famillesMasquees],
    };
  }

  const triChoisi = TRIS.includes(tri) ? tri : "pertinence";
  const orderBy =
    triChoisi === "prix_asc"
      ? [{ prix_vente: "asc" }]
      : triChoisi === "prix_desc"
        ? [{ prix_vente: "desc" }]
        : triChoisi === "nouveautes"
          ? [{ id_prd: "desc" }]
          : [{ est_mis_en_avant: "desc" }, { id_prd: "desc" }];

  try {
    const contextePromotions = await chargerContextePromotions();
    const [produits, total] = await prisma.$transaction([
      prisma.produit.findMany({
        where: whereClause,
        include: inclureProduitBoutique,
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.produit.count({ where: whereClause }),
    ]);

    res.status(200).json({
      produits: produits.map((produit) =>
        formaterProduitBoutique(produit, contextePromotions),
      ),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getProduitBoutiqueParSlug = async (req, res) => {
  const { slug } = req.params;
  if (!slug) {
    return res.status(400).json({ message: "Slug invalide." });
  }

  try {
    const contextePromotions = await chargerContextePromotions();
    const produit = await prisma.produit.findFirst({
      where: { slug_prd: slug, statut_publication: "PUBLIE" },
      include: inclureProduitBoutique,
    });
    if (!produit) {
      return res.status(404).json({ message: "Produit introuvable." });
    }

    // Famille masquée (ou ancêtre masqué) : la fiche n'existe pas côté
    // boutique. Les « produits liés » partagent la même famille, ils sont
    // donc exclus de fait par ce 404.
    const famillesMasquees = await getIdsFamillesMasquees();
    if (
      produit.famille_id !== null &&
      famillesMasquees.has(produit.famille_id)
    ) {
      return res.status(404).json({ message: "Produit introuvable." });
    }

    const lies = await prisma.produit.findMany({
      where: {
        statut_publication: "PUBLIE",
        prix_vente: { not: null },
        famille_id: produit.famille_id,
        slug_prd: { not: slug },
      },
      include: inclureProduitBoutique,
      orderBy: [{ est_mis_en_avant: "desc" }, { id_prd: "desc" }],
      take: 8,
    });

    res.status(200).json({
      ...formaterProduitBoutique(produit, contextePromotions),
      produits_lies: lies.map((produit) =>
        formaterProduitBoutique(produit, contextePromotions),
      ),
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getFamillesBoutique = async (req, res) => {
  try {
    const [racines, comptes] = await Promise.all([
      prisma.famille_produit.findMany({
        where: { famille_parente_id: null, est_active_famille: true },
        include: {
          sous_familles: {
            where: { est_active_famille: true },
            orderBy: [{ ordre_famille: "asc" }, { nom_famille: "asc" }],
          },
        },
        orderBy: [{ ordre_famille: "asc" }, { nom_famille: "asc" }],
      }),
      prisma.produit.groupBy({
        by: ["famille_id"],
        where: { statut_publication: "PUBLIE", famille_id: { not: null } },
        _count: { id_prd: true },
      }),
    ]);
    const nbParFamille = new Map(
      comptes.map((c) => [c.famille_id, c._count.id_prd]),
    );
    const formater = (famille) => {
      const enfants = (famille.sous_familles || []).map(formater);
      const nb =
        (nbParFamille.get(famille.id_famille) || 0) +
        enfants.reduce((total, enfant) => total + enfant.nb_produits, 0);
      return {
        id: famille.id_famille,
        nom: famille.nom_famille,
        slug: famille.slug_famille,
        image: famille.image_famille,
        ordre: famille.ordre_famille,
        nb_produits: nb,
        sous_familles: enfants,
      };
    };
    const arbre = racines
      .map(formater)
      .filter((famille) => famille.nb_produits > 0);
    res.status(200).json(arbre);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getWilayas = async (req, res) => {
  // Seules les 58 wilayas couvertes par la livraison sont proposées.
  // Les 11 nouvelles (59-69, a_venir) existent dans WILAYAS pour préparer
  // 2027, mais ne sont pas livrables tant que Yalidine ne les couvre pas.
  res.status(200).json(WILAYAS.filter((wilaya) => !wilaya.a_venir));
};

export const getCommunesBoutique = async (req, res) => {
  const codeWilaya = parseInt(req.query.wilaya, 10);
  if (isNaN(codeWilaya) || codeWilaya < 1 || codeWilaya > 58) {
    return res
      .status(400)
      .json({ message: "Le code wilaya doit être entre 1 et 58." });
  }
  if (!yalidineConfigure()) {
    return res.status(200).json({
      wilaya: codeWilaya,
      communes: [],
      disponible: false,
      source: "non_configure",
    });
  }
  try {
    const communes = await getCommunes(codeWilaya);
    res.status(200).json({
      wilaya: codeWilaya,
      communes,
      disponible: true,
      source: "yalidine",
    });
  } catch (error) {
    res.status(200).json({
      wilaya: codeWilaya,
      communes: [],
      disponible: false,
      source: "indisponible",
      message: error.message,
    });
  }
};

export const getBureauxBoutique = async (req, res) => {
  const codeWilaya = parseInt(req.query.wilaya, 10);
  if (isNaN(codeWilaya) || codeWilaya < 1 || codeWilaya > 58) {
    return res
      .status(400)
      .json({ message: "Le code wilaya doit être entre 1 et 58." });
  }
  const idCommune = req.query.commune
    ? parseInt(req.query.commune, 10)
    : null;
  if (!yalidineConfigure()) {
    return res.status(200).json({
      wilaya: codeWilaya,
      bureaux: [],
      disponible: false,
      source: "non_configure",
    });
  }
  try {
    const bureaux = await getCentres(codeWilaya, idCommune);
    res.status(200).json({
      wilaya: codeWilaya,
      bureaux,
      disponible: true,
      source: "yalidine",
    });
  } catch (error) {
    res.status(200).json({
      wilaya: codeWilaya,
      bureaux: [],
      disponible: false,
      source: "indisponible",
      message: error.message,
    });
  }
};

export const getTarifBoutique = async (req, res) => {
  const codeWilaya = parseInt(req.query.wilaya, 10);
  const typeLivraison = String(req.query.type || "")
    .trim()
    .toUpperCase();
  if (isNaN(codeWilaya) || codeWilaya < 1 || codeWilaya > 58) {
    return res
      .status(400)
      .json({ message: "Le code wilaya doit être entre 1 et 58." });
  }
  if (!TYPES_LIVRAISON.includes(typeLivraison)) {
    return res.status(400).json({
      message: `Le type de livraison doit être ${TYPES_LIVRAISON.join(", ")}.`,
    });
  }
  try {
    const frais = await calculerFraisLivraison({
      codeWilaya,
      typeLivraison,
    });
    res.status(200).json({
      wilaya: codeWilaya,
      nom_wilaya: nomWilaya(codeWilaya),
      type: typeLivraison,
      prix: frais.prix,
      disponible: frais.source !== "indisponible",
      source: frais.source,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const verifierCodePromoBoutique = [
  body("code")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le code promo est obligatoire"),
  body("montant_commande")
    .notEmpty()
    .withMessage("Le montant de la commande est obligatoire")
    .isFloat({ min: 0 })
    .withMessage("Le montant de la commande doit être un nombre positif ou nul"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code, montant_commande } = req.body;

    try {
      const codePromo = await prisma.code_promo.findUnique({
        where: { code: code.trim().toUpperCase() },
      });
      const montant = parseFloat(montant_commande);
      const verification = verifierCodePromoValide(codePromo, montant);
      if (!verification.valide) {
        return res
          .status(200)
          .json({ valide: false, message: verification.message });
      }
      res.status(200).json({
        valide: true,
        montant_reduction: calculerReductionPromo(codePromo, montant),
      });
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const createCommandeBoutique = [
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
  body("lignes")
    .isArray({ min: 1 })
    .withMessage("La commande doit contenir au moins une ligne"),
  body("lignes.*.slug")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Chaque ligne doit contenir le slug du produit"),
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
      lignes,
      code_promo,
    } = req.body;

    if (type_livraison === "BUREAU" && !bureau_livraison) {
      return res.status(400).json({
        message: "Le bureau de livraison est obligatoire pour une livraison au bureau.",
      });
    }

    try {
      const lignesAvecIds = [];
      let poidsFactureTotalKg = 0;
      for (const ligne of lignes) {
        const produit = await prisma.produit.findFirst({
          where: { slug_prd: ligne.slug.trim() },
          select: {
            id_prd: true,
            poids_grammes: true,
            longueur_cm: true,
            largeur_cm: true,
            hauteur_cm: true,
          },
        });
        if (!produit) {
          return res.status(404).json({
            message: `Produit introuvable : ${ligne.slug}.`,
          });
        }
        // Poids : un produit sans poids renseigné (publié avant ce
        // changement) reçoit le défaut (200 g), STOCKÉ sur le produit —
        // les frais sont ensuite calculés sur le poids stocké, jamais
        // dérivé.
        let poidsGrammes = produit.poids_grammes;
        if (poidsGrammes === null || poidsGrammes === undefined) {
          await prisma.produit.update({
            where: { id_prd: produit.id_prd },
            data: { poids_grammes: POIDS_DEFAUT_GRAMMES },
          });
          poidsGrammes = POIDS_DEFAUT_GRAMMES;
        }
        const poidsFactureKg = calculerPoidsFactureKg(
          poidsGrammes,
          produit.longueur_cm,
          produit.largeur_cm,
          produit.hauteur_cm,
        );
        lignesAvecIds.push({
          prd_id: produit.id_prd,
          quantite: parseInt(ligne.quantite, 10),
        });
        poidsFactureTotalKg +=
          poidsFactureKg * parseInt(ligne.quantite, 10);
      }

      const frais = await calculerFraisLivraison({
        codeWilaya: parseInt(code_wilaya, 10),
        typeLivraison: type_livraison,
        poidsKg: poidsFactureTotalKg,
      });

      const commandeCreee = await prisma.$transaction((tx) =>
        creerCommandeWebInterne(tx, {
          nom_client,
          telephone,
          wilaya,
          code_wilaya: parseInt(code_wilaya, 10),
          commune,
          adresse_exacte,
          type_livraison,
          bureau_livraison,
          frais_livraison: frais.prix,
          lignes: lignesAvecIds,
          code_promo,
        }),
      );

      const commandeComplete = await prisma.commande_web.findUnique({
        where: { id_cmd_web: commandeCreee.id_cmd_web },
        include: {
          lignes: {
            select: {
              quantite: true,
              prix_unitaire_facture: true,
              designation_facturee: true,
            },
            orderBy: { id_ligne: "asc" },
          },
          promo: { select: { code: true } },
        },
      });

      try {
        await envoyerNotificationCommande(commandeComplete);
      } catch (erreur) {
        console.error(
          "Notification WhatsApp impossible :",
          erreur.message,
        );
      }

      res.status(201).json({
        ...commandeComplete,
        frais_livraison_source: frais.source,
      });
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

export const getSuiviCommandeBoutique = async (req, res) => {
  const idCommande = parseInt(req.params.id, 10);
  const telephone = String(req.query.telephone || "").trim();
  if (isNaN(idCommande) || !TELEPHONE_DZ.test(telephone)) {
    return res.status(404).json({ message: "Commande introuvable." });
  }

  try {
    // Endpoint public : liste blanche explicite — jamais le nom du client,
    // l'adresse exacte ni d'autres champs internes.
    const commande = await prisma.commande_web.findUnique({
      where: { id_cmd_web: idCommande },
      select: {
        id_cmd_web: true,
        statut_commande: true,
        code_tracking: true,
        wilaya: true,
        telephone: true,
        frais_livraison: true,
        montant_produits: true,
        montant_reduction: true,
        montant_total_final: true,
        lignes: {
          select: {
            quantite: true,
            prix_unitaire_facture: true,
            designation_facturee: true,
          },
          orderBy: { id_ligne: "asc" },
        },
        promo: { select: { code: true } },
      },
    });
    if (!commande || commande.telephone !== telephone) {
      return res.status(404).json({ message: "Commande introuvable." });
    }

    // Timeline Yalidine : statuts / motifs / lieux uniquement (aucune donnée
    // personnelle — l'API masque noms, téléphones et adresses en lecture).
    // L'historique n'est jamais écrit en base ici. Si l'API est indisponible,
    // la commande est renvoyée sans timeline plutôt qu'en erreur.
    let colisYalidine = null;
    if (commande.code_tracking && yalidineConfigure()) {
      try {
        const historique = await getHistorique(commande.code_tracking);
        colisYalidine = {
          tracking: commande.code_tracking,
          statut_actuel: historique.length
            ? historique[historique.length - 1].status
            : null,
          historique,
        };
      } catch (erreur) {
        console.error(
          `Historique Yalidine indisponible pour ${commande.code_tracking} :`,
          erreur.message,
        );
      }
    }

    res.status(200).json({ ...commande, colis_yalidine: colisYalidine });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};
