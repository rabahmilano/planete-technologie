import { addCommande, getAllCommandes, deleteCommande, getCommandesStats } from "../controllers/commandeController.js";

import { Router } from "express";

const router = Router();

router.get("/stats", getCommandesStats);
router.get("/", getAllCommandes);
router.post("/createCommande", addCommande);
router.delete("/:id", deleteCommande);

export default router;
