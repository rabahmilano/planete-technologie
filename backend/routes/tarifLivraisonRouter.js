import {
  addTarifLivraison,
  getAllTarifsLivraison,
  getTarifLivraisonById,
  updateTarifLivraison,
  deleteTarifLivraison,
} from "../controllers/tarifLivraisonController.js";

import { Router } from "express";

const router = Router();

router.post("/", addTarifLivraison);
router.get("/", getAllTarifsLivraison);
router.get("/:id", getTarifLivraisonById);
router.patch("/:id", updateTarifLivraison);
router.delete("/:id", deleteTarifLivraison);

export default router;
