import {
  addEmprunt,
  addRemboursement,
  getAllEmprunts,
} from "../controllers/empruntController.js";

import { Router } from "express";

const router = Router();

// Routes pour la gestion des emprunts
router.get("/allEmprunts", getAllEmprunts);
router.post("/addEmprunt", addEmprunt);

// Route pour la gestion des remboursements
router.post("/addRemboursement", addRemboursement);

export default router;