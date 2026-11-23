// Aide à la décision produit — KPI achat / vente partagés.
//
// Le calcul vivait dans getProduitDetails (produitController.js) ; il est
// extrait ici pour être réutilisé tel quel par l'endpoint e-commerce
// GET /:id/ecommerce?aide_decision=1, SANS duplication. Les moyennes sont
// pondérées par les quantités, exactement comme dans l'historique des prix.
// Les KPI vides valent 0 ici (comportement historique de getProduitDetails) :
// c'est formaterAideDecision qui les convertit en null pour l'API publique
// (0 DZD serait trompeur côté boutique).
// Aucun champ pays : il n'existe pas en base (ni colis, ni compte, ni devise).
import prisma from "./dbConfig.js";
import { arrondir } from "./utils.js";

export const calculerAideDecisionProduit = async (idProduit) => {
  const [colisAchats, lignesDeCommande] = await Promise.all([
    prisma.colis.findMany({
      where: { prd_id: idProduit },
      select: {
        qte_achat: true,
        pu_dev: true,
        pu_dzd_ttc: true,
        date_achat: true,
        compte: { select: { devise: { select: { symbole_dev: true } } } },
      },
      orderBy: { date_achat: "desc" },
    }),
    prisma.ligne_commande.findMany({ where: { prd_id: idProduit } }),
  ]);

  // --- KPI ACHAT (moyenne pondérée) ---
  const totalQteAchetee = colisAchats.reduce(
    (somme, colis) => somme + colis.qte_achat,
    0,
  );
  const totalCoutAchatDZD = colisAchats.reduce(
    (somme, colis) => somme + parseFloat(colis.pu_dzd_ttc) * colis.qte_achat,
    0,
  );
  const totalCoutAchatDev = colisAchats.reduce(
    (somme, colis) => somme + parseFloat(colis.pu_dev) * colis.qte_achat,
    0,
  );
  const kpisAchat =
    colisAchats.length > 0
      ? {
          minDev: Math.min(...colisAchats.map((c) => parseFloat(c.pu_dev))),
          maxDev: Math.max(...colisAchats.map((c) => parseFloat(c.pu_dev))),
          avgDev:
            totalQteAchetee > 0
              ? arrondir(totalCoutAchatDev / totalQteAchetee)
              : 0,
          minDzd: Math.min(
            ...colisAchats.map((c) => parseFloat(c.pu_dzd_ttc)),
          ),
          maxDzd: Math.max(
            ...colisAchats.map((c) => parseFloat(c.pu_dzd_ttc)),
          ),
          avgDzd:
            totalQteAchetee > 0
              ? arrondir(totalCoutAchatDZD / totalQteAchetee)
              : 0,
        }
      : { minDev: 0, maxDev: 0, avgDev: 0, minDzd: 0, maxDzd: 0, avgDzd: 0 };

  // --- KPI VENTE (moyenne pondérée) ---
  const totalVenteDZD = arrondir(
    lignesDeCommande.reduce(
      (somme, ligne) => somme + parseFloat(ligne.pu_vente) * ligne.qte_cde,
      0,
    ),
  );
  const totalQteCde = lignesDeCommande.reduce(
    (somme, ligne) => somme + ligne.qte_cde,
    0,
  );
  const kpisVente =
    lignesDeCommande.length > 0
      ? {
          minDa: Math.min(
            ...lignesDeCommande.map((l) => parseFloat(l.pu_vente)),
          ),
          maxDa: Math.max(
            ...lignesDeCommande.map((l) => parseFloat(l.pu_vente)),
          ),
          avgDa: totalQteCde > 0 ? arrondir(totalVenteDZD / totalQteCde) : 0,
        }
      : { minDa: 0, maxDa: 0, avgDa: 0 };

  // Symbole de la devise de l'achat le plus récent (colis triés par
  // date_achat décroissante) ; null sans achat.
  const deviseAchatSymbole =
    colisAchats[0]?.compte?.devise?.symbole_dev ?? null;

  return {
    kpisAchat,
    kpisVente,
    totalQteAchetee,
    nbAchats: colisAchats.length,
    nbVentes: lignesDeCommande.length,
    totalVenteDZD,
    totalQteCde,
    deviseAchatSymbole,
  };
};

// Forme publique de l'aide à la décision (endpoint e-commerce).
// Cas vide (aucun achat ET aucune vente) : null, jamais 0. Les KPI d'un
// côté vide (achats ou ventes) sont null ; qte_achetee / nb_achats restent
// des compteurs réels (0 si aucun achat mais des ventes).
export const formaterAideDecision = (kpis) => {
  if (kpis.nbAchats === 0 && kpis.nbVentes === 0) return null;
  const achats = kpis.nbAchats > 0 ? kpis.kpisAchat : null;
  const ventes = kpis.nbVentes > 0 ? kpis.kpisVente : null;
  return {
    prix_achat_dzd_moyen: achats?.avgDzd ?? null,
    prix_achat_dev_moyen: achats?.avgDev ?? null,
    devise_achat_symbole: kpis.deviseAchatSymbole,
    prix_achat_dzd_min: achats?.minDzd ?? null,
    prix_achat_dzd_max: achats?.maxDzd ?? null,
    prix_vente_moyen: ventes?.avgDa ?? null,
    prix_vente_min: ventes?.minDa ?? null,
    prix_vente_max: ventes?.maxDa ?? null,
    qte_achetee: kpis.totalQteAchetee,
    nb_achats: kpis.nbAchats,
  };
};
