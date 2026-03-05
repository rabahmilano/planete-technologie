import { addCommande, getAllCommandes, deleteCommande } from "../controllers/commandeController.js";

import { Router } from "express";

const router = Router();

router.get("/", getAllCommandes);
router.post("/createCommande", addCommande);
router.delete("/:id", deleteCommande);

export default router;
