import express from "express";
import rateLimit from "express-rate-limit";
import {
  getProduitsBoutique,
  getProduitBoutiqueParSlug,
  getFamillesBoutique,
  getWilayas,
  getCommunesBoutique,
  getBureauxBoutique,
  getTarifBoutique,
  verifierCodePromoBoutique,
  createCommandeBoutique,
  getSuiviCommandeBoutique,
} from "../controllers/boutiqueController.js";

const router = express.Router();

const limiteCommandes = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: "TOO_MANY_REQUESTS" },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/produits", getProduitsBoutique);
router.get("/produits/:slug", getProduitBoutiqueParSlug);
router.get("/familles", getFamillesBoutique);
router.get("/livraison/wilayas", getWilayas);
router.get("/livraison/communes", getCommunesBoutique);
router.get("/livraison/bureaux", getBureauxBoutique);
router.get("/livraison/tarif", getTarifBoutique);
router.post("/codes-promo/verifier", verifierCodePromoBoutique);
router.post("/commandes", limiteCommandes, createCommandeBoutique);
router.get("/commandes/:id", getSuiviCommandeBoutique);

export default router;
