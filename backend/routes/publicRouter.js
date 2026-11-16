import express from "express";
import rateLimit from "express-rate-limit";
import {
  getProduitsPublics,
  getProduitPublicParSlug,
  getFamillesPubliques,
  getWilayas,
  getCommunesPubliques,
  getBureauxPublics,
  getTarifPublic,
  verifierCodePromoPublic,
  createCommandePublique,
  getSuiviCommandePublique,
} from "../controllers/publicController.js";

const router = express.Router();

const limiteCommandes = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: "TOO_MANY_REQUESTS" },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/produits", getProduitsPublics);
router.get("/produits/:slug", getProduitPublicParSlug);
router.get("/familles", getFamillesPubliques);
router.get("/livraison/wilayas", getWilayas);
router.get("/livraison/communes", getCommunesPubliques);
router.get("/livraison/bureaux", getBureauxPublics);
router.get("/livraison/tarif", getTarifPublic);
router.post("/codes-promo/verifier", verifierCodePromoPublic);
router.post("/commandes", limiteCommandes, createCommandePublique);
router.get("/commandes/:id", getSuiviCommandePublique);

export default router;
