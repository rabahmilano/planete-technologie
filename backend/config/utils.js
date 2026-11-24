import prisma from "../config/dbConfig.js";

export const getMaxValue = async (
  modelName,
  columnName,
  condition,
  defaultValue = 1,
  client = null
) => {
  const db = client ?? prisma;
  const options = {
    _max: {
      [columnName]: true,
    },
  };
  if (condition) {
    options.where = condition;
  }

  const result = await db[modelName].aggregate(options);
  return result._max[columnName] !== null
    ? result._max[columnName] + 1
    : defaultValue;
};

export const getSpecialDate = (interval = 0) => {
  const today = new Date();
  const date = new Date(today);
  date.setDate(date.getDate() + interval);
  date.setMinutes(date.getMinutes() + 60);

  return date;
};

export const arrondir = (nombre) => {
  // On utilise 10000 pour garder 4 chiffres après la virgule
  return Math.round((nombre + Number.EPSILON) * 10000) / 10000;
};

// Poids par défaut (grammes) appliqué à l'ÉCRITURE quand un produit n'a pas
// de poids renseigné : création du produit, modification via le modal Gérer,
// publication, création du colis. Le défaut est STOCKÉ sur le produit
// (poids_grammes) ; ensuite le colis et les frais lisent le poids stocké,
// sans repli ni dérivation. Une seule source de vérité : cette constante.
// Pour changer la valeur, modifier cette ligne — aucun réglage, aucune
// variable d'environnement (l'API Yalidine n'exige pas de variable ;
// décision RABAH 24/11/2026 : 500 g trop lourd pour les produits vendus,
// le poids est souvent absent des emballages).
export const POIDS_DEFAUT_GRAMMES = 200;

// Poids à stocker : la valeur saisie, ou le défaut si vide.
export const poidsAStockerGrammes = (poidsGrammes) =>
  poidsGrammes === null || poidsGrammes === undefined || poidsGrammes === ""
    ? POIDS_DEFAUT_GRAMMES
    : parseInt(poidsGrammes, 10);

// Poids volumétrique Yalidine (kg) : L × l × h (cm) / 5000. null si une
// dimension manque (poids volumétrique non calculable).
export const calculerPoidsVolumetriqueKg = (
  longueurCm,
  largeurCm,
  hauteurCm,
) => {
  if (!longueurCm || !largeurCm || !hauteurCm) return null;
  return (longueurCm * largeurCm * hauteurCm) / 5000;
};

// Poids facturé Yalidine (kg) = max(poids réel, poids volumétrique).
// Le poids est celui STOCKÉ sur le produit : les écritures en amont
// (création, modal Gérer, publication, colis) garantissent qu'il est
// renseigné — aucun repli ici. Poids null → 0 kg réel (seul le
// volumétrique compte alors, ou 0 sans dimensions).
export const calculerPoidsFactureKg = (
  poidsGrammes,
  longueurCm,
  largeurCm,
  hauteurCm,
) => {
  const volumetriqueKg = calculerPoidsVolumetriqueKg(
    longueurCm,
    largeurCm,
    hauteurCm,
  );
  const reelKg = (poidsGrammes ?? 0) / 1000;
  return volumetriqueKg === null ? reelKg : Math.max(reelKg, volumetriqueKg);
};

export const genererSlug = (texte) => {
  const base = texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "sans-nom";
};

export const getPrixEffectifProduit = (produit, paliers, quantite, promoGagnante) => {
  let prix = null;

  const promo =
    promoGagnante &&
    produit.prix_vente !== null &&
    produit.prix_vente !== undefined
      ? promoGagnante
      : null;

  if (promo) {
    prix = promo.prix;
  } else if (
    produit.prix_vente !== null &&
    produit.prix_vente !== undefined
  ) {
    prix = parseFloat(produit.prix_vente);
  }

  if (prix === null) return null;

  const palier = (paliers || [])
    .filter((p) => p.quantite_min <= quantite)
    .sort((a, b) => b.quantite_min - a.quantite_min)[0];

  if (palier) return parseFloat(palier.prix_unitaire);

  return prix;
};

export const verifierCodePromoValide = (codePromo, montantProduits) => {
  if (!codePromo) {
    return { valide: false, message: "Code promo introuvable." };
  }
  if (!codePromo.est_actif_promo) {
    return { valide: false, message: "Code promo désactivé." };
  }

  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);
  if (new Date(codePromo.date_expiration) < aujourdHui) {
    return { valide: false, message: "Code promo expiré." };
  }

  if (codePromo.utilisation_actuelle >= codePromo.utilisation_max) {
    return { valide: false, message: "Code promo épuisé." };
  }

  if (montantProduits !== undefined && montantProduits !== null) {
    const montantMin = parseFloat(codePromo.montant_min_promo || 0);
    if (montantProduits < montantMin) {
      return {
        valide: false,
        message: `Montant minimum de ${montantMin} DZD requis pour ce code promo.`,
      };
    }
  }

  return { valide: true };
};

export const calculerReductionPromo = (codePromo, montantProduits) => {
  if (codePromo.type_reduction === "POURCENTAGE") {
    return arrondir(
      Math.min(
        montantProduits,
        (montantProduits * parseFloat(codePromo.valeur_reduction)) / 100,
      ),
    );
  }
  return arrondir(
    Math.min(montantProduits, parseFloat(codePromo.valeur_reduction)),
  );
};