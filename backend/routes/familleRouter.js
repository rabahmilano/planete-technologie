import {
  addFamille,
  getAllFamilles,
  updateFamille,
  deleteFamille,
  attribuerFamilleProduit,
} from "../controllers/familleController.js";

import { Router } from "express";

const router = Router();

router.post("/addFamille", addFamille);
router.get("/allFamilles", getAllFamilles);
router.patch("/updateFamille/:id", updateFamille);
router.delete("/deleteFamille/:id", deleteFamille);
router.patch("/attribuer/:idPrd", attribuerFamilleProduit);

export default router;
