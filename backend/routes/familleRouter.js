import {
  addFamille,
  getAllFamilles,
  getFamilleById,
  updateFamille,
  deleteFamille,
} from "../controllers/familleController.js";

import { Router } from "express";

const router = Router();

router.post("/", addFamille);
router.get("/", getAllFamilles);
router.get("/:id", getFamilleById);
router.patch("/:id", updateFamille);
router.delete("/:id", deleteFamille);

export default router;
