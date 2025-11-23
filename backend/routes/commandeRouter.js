import { addCommande } from "../controllers/commandeController.js";

import { Router } from "express";

const router = Router();

router.post("/createCommande", addCommande);

export default router;
