import prisma from "./dbConfig.js";
import { arrondir } from "./utils.js";

// Charge les promotions actives (est_active + fenêtre de validité courante)
// avec leurs liaisons familles/produits.
export const chargerPromotionsActives = async () =>
  prisma.promotion.findMany({
    where: {
      est_active: true,
      date_debut: { lte: new Date() },
      date_fin: { gte: new Date() },
    },
    include: { familles: true, produits: true },
  });

// Construit une map id_famille -> id_famille_parente pour remonter la
// hiérarchie des familles sans requête par produit.
export const chargerMapParentesFamilles = async () => {
  const familles = await prisma.famille_produit.findMany({
    select: { id_famille: true, famille_parente_id: true },
  });
  return new Map(familles.map((f) => [f.id_famille, f.famille_parente_id]));
};

// Promotions applicables à un produit : périmètre TOUS, FAMILLES (famille
// du produit ou une de ses parentes) ou PRODUITS (liaison directe).
export const promotionsApplicables = (produit, promotions, parentsFamilles) => {
  const idsFamilles = [];
  let courant = produit.famille_id ?? null;
  let profondeur = 0;
  while (
    courant !== null &&
    courant !== undefined &&
    !idsFamilles.includes(courant) &&
    profondeur < 10
  ) {
    idsFamilles.push(courant);
    courant = parentsFamilles.get(courant) ?? null;
    profondeur += 1;
  }
  return promotions.filter(
    (promotion) =>
      promotion.perimetre === "TOUS" ||
      (promotion.perimetre === "FAMILLES" &&
        produit.famille_id !== null &&
        promotion.familles.some((f) => idsFamilles.includes(f.famille_id))) ||
      (promotion.perimetre === "PRODUITS" &&
        promotion.produits.some((p) => p.produit_id === produit.id_prd)),
  );
};

// Prix réduit appliqué par une promotion sur un prix de vente.
export const prixReduit = (prixVente, promotion) => {
  const base = parseFloat(prixVente);
  if (promotion.type_reduction === "POURCENTAGE") {
    return arrondir(base * (1 - parseFloat(promotion.valeur_reduction) / 100));
  }
  return arrondir(Math.max(0, base - parseFloat(promotion.valeur_reduction)));
};

// Meilleur prix promo d'un produit : la promotion donnant le prix le plus
// bas gagne (pas de cumul). Retourne null si aucune promotion applicable.
export const meilleurPrixPromotion = (prixVente, promos) => {
  if (prixVente === null || prixVente === undefined || promos.length === 0)
    return null;
  return promos
    .map((promotion) => ({ promotion, prix: prixReduit(prixVente, promotion) }))
    .sort((a, b) => a.prix - b.prix)[0];
};

// Contexte promotions chargé une fois par requête : promotions actives dans
// la fenêtre courante + map des parentés de familles pour l'héritage.
export const chargerContextePromotions = async () => {
  const [promotions, parentsFamilles] = await Promise.all([
    chargerPromotionsActives(),
    chargerMapParentesFamilles(),
  ]);
  return { promotions, parentsFamilles };
};

// Promotion gagnante d'un produit (prix le plus bas), ou null.
export const promoGagnante = (produit, contextePromotions) => {
  if (!contextePromotions) return null;
  const applicables = promotionsApplicables(
    produit,
    contextePromotions.promotions,
    contextePromotions.parentsFamilles,
  );
  return meilleurPrixPromotion(produit.prix_vente, applicables);
};
