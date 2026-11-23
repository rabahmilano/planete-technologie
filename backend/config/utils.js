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
// Renvoie null si le poids réel est null : AUCUN repli en dur — l'appelant
// doit bloquer avec une erreur explicite (poids manquant).
export const calculerPoidsFactureKg = (
  poidsGrammes,
  longueurCm,
  largeurCm,
  hauteurCm,
) => {
  if (poidsGrammes === null || poidsGrammes === undefined) return null;
  const volumetriqueKg = calculerPoidsVolumetriqueKg(
    longueurCm,
    largeurCm,
    hauteurCm,
  );
  const reelKg = poidsGrammes / 1000;
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