import prisma from "../config/dbConfig.js";

export const getMaxValue = async (
  modelName,
  columnName,
  condition,
  defaultValue = 1
) => {
  const options = {
    _max: {
      [columnName]: true,
    },
  };
  if (condition) {
    options.where = condition;
  }

  const result = await prisma[modelName].aggregate(options);
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

export const arrondirPrix = (nombre) => {
  return Math.round((nombre + Number.EPSILON) * 100) / 100;
};

export const genererSlug = (texte) => {
  return texte
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
};

export const estEnPromotion = (produit, maintenant = new Date()) => {
  return (
    !!produit.prix_promo &&
    !!produit.debut_promo &&
    !!produit.fin_promo &&
    maintenant >= produit.debut_promo &&
    maintenant <= produit.fin_promo
  );
};

export const getPrixEffectif = (produit, quantite = 1, maintenant = new Date()) => {
  if (estEnPromotion(produit, maintenant)) {
    return parseFloat(produit.prix_promo);
  }

  const palierApplique = (produit.paliers || [])
    .filter((palier) => palier.quantite_min <= quantite)
    .sort((a, b) => b.quantite_min - a.quantite_min)[0];

  if (palierApplique) {
    return parseFloat(palierApplique.prix_unitaire);
  }

  return produit.prix_vente === null || produit.prix_vente === undefined
    ? null
    : parseFloat(produit.prix_vente);
};

export const estCodeUtilisable = (codePromo, montant = null) => {
  if (!codePromo) {
    return { utilisable: false, motif: "CODE_INTROUVABLE" };
  }
  if (!codePromo.est_actif_promo) {
    return { utilisable: false, motif: "CODE_DESACTIVE" };
  }
  const finJourneeExpiration = new Date(codePromo.date_expiration);
  finJourneeExpiration.setHours(23, 59, 59, 999);
  if (new Date() > finJourneeExpiration) {
    return { utilisable: false, motif: "CODE_EXPIRE" };
  }
  if (codePromo.utilisation_actuelle >= codePromo.utilisation_max) {
    return { utilisable: false, motif: "CODE_EPUISE" };
  }
  if (
    montant !== null &&
    codePromo.montant_min_promo !== null &&
    montant < parseFloat(codePromo.montant_min_promo)
  ) {
    return { utilisable: false, motif: "MONTANT_MIN_NON_ATTEINT" };
  }
  return { utilisable: true, motif: null };
};

export const calculerReduction = (codePromo, montantProduits) => {
  if (codePromo.type_reduction === "POURCENTAGE") {
    return arrondirPrix((montantProduits * parseFloat(codePromo.valeur_reduction)) / 100);
  }
  return arrondirPrix(Math.min(parseFloat(codePromo.valeur_reduction), montantProduits));
};