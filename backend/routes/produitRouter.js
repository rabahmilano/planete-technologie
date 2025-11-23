import {
  addCatProduit,
  getAllCategorie,
  getAllComptes,
  getNomSearch,
  addColis,
  getAllProduitDisponible,
  getMarchandiseDisponible,
  getColisEnRoute,
  updateColisEnRoute,
  cancelColis,
  getColisEnRouteStats,
  getAllColis,
  getAllColisStats,
  getChartDataByCategory,
  getChartDataByYear,
  getChartDataByAccount,
  getChartDataTopProducts,
  updateColisDetails,
  getProduitsForTable, // Nouvelle fonction
  getProduitsPageStats, // Nouvelle fonction
  getProduitDetails, // Nouvelle fonction
  getColisForProduit, // Nouvelle fonction
  // getDashboardChartData,
  getTransactionsChartData,
  getProduitsChartData,
} from "../controllers/produitController.js";

import { Router } from "express";

const router = Router();

router.post("/addCategorie", addCatProduit);
router.get("/allCategories", getAllCategorie);
router.get("/allComptes", getAllComptes); // Ajouté pour les filtres

router.get("/search", getNomSearch);

router.post("/addProduit", addColis);
router.get("/allProduitDisponible", getAllProduitDisponible);
router.get("/allMarchandiseDisponible", getMarchandiseDisponible);

// Routes pour les colis en attente
router.get("/colisEnRoute", getColisEnRoute);
router.get("/colisEnRoute/stats", getColisEnRouteStats);
router.patch("/colis/:id", updateColisEnRoute);
router.delete("/colis/:id", cancelColis);

// Routes pour l'historique des achats
router.get("/historique", getAllColis);
router.get("/historique/stats", getAllColisStats);
router.patch("/historique/:id", updateColisDetails); // NOUVELLE ROUTE POUR LA MISE À JOUR

// NOUVELLES ROUTES POUR LES GRAPHIQUES
router.get("/historique/charts/by-category", getChartDataByCategory);
router.get("/historique/charts/by-year", getChartDataByYear);
router.get("/historique/charts/by-account", getChartDataByAccount);
router.get("/historique/charts/top-products", getChartDataTopProducts);

// ====================================================================
// NOUVELLES ROUTES POUR LA PAGE "HISTORIQUE DES PRIX"
// ====================================================================

// Route pour la liste principale des produits (avec recherche, tri, pagination)
router.get("/historique-prix", getProduitsForTable);

// Route pour les KPIs de la page
router.get("/historique-prix/stats", getProduitsPageStats);

// Route pour les détails complets d'un seul produit (pour la modale)
router.get("/historique-prix/:id", getProduitDetails);

// Route pour la liste des colis d'un produit spécifique (pour la modale)
router.get("/historique-prix/:id/colis", getColisForProduit);

// ====================================================================
// NOUVELLE ROUTE POUR LE GRAPHIQUE DE LA PAGE D'ACCUEIL
// ====================================================================
// router.get("/dashboard/sales-purchases-chart", getDashboardChartData);
router.get("/dashboard/chart-transactions", getTransactionsChartData);
router.get("/dashboard/chart-produits", getProduitsChartData);

export default router;
