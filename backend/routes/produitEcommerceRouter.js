import {
  getProduitEcommerce,
  updateProduitEcommerce,
  updatePrixProduit,
  getHistoriquePrixProduit,
  addImageProduit,
  uploadImageProduit,
  deleteImageProduit,
  setImagePrincipale,
  addPalier,
  updatePalier,
  deletePalier,
} from "../controllers/produitEcommerceController.js";

import { Router } from "express";

const router = Router();

router.get("/:id/ecommerce", getProduitEcommerce);
router.patch("/:id/ecommerce", updateProduitEcommerce);
router.patch("/:id/prix", updatePrixProduit);
router.get("/:id/historique-prix", getHistoriquePrixProduit);

router.post("/:id/images", addImageProduit);
router.post("/:id/images/upload", uploadImageProduit);
router.delete("/:id/images/:idImage", deleteImageProduit);
router.patch("/:id/images/:idImage/principale", setImagePrincipale);

router.post("/:id/paliers", addPalier);
router.patch("/:id/paliers/:idPalier", updatePalier);
router.delete("/:id/paliers/:idPalier", deletePalier);

export default router;
