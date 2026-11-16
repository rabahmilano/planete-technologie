import {
  createCommandeWeb,
  getAllCommandesWeb,
  getCommandeWebById,
  updateCommandeWeb,
  updateStatutCommandeWeb,
  annulerCommandeWeb,
} from "../controllers/commandeWebController.js";

import { Router } from "express";

const router = Router();

router.post("/", createCommandeWeb);
router.get("/", getAllCommandesWeb);
router.get("/:id", getCommandeWebById);
router.patch("/:id", updateCommandeWeb);
router.patch("/:id/statut", updateStatutCommandeWeb);
router.patch("/:id/annuler", annulerCommandeWeb);

export default router;
