import {
  addEmprunt,
  addRemboursement,
  getAllEmprunts,
  deleteEmprunt,
  deleteRemboursement 
} from "../controllers/empruntController.js";

import { Router } from "express";

const router = Router();

// Routes Emprunts
router.get("/allEmprunts", getAllEmprunts);
router.post("/addEmprunt", addEmprunt);
router.delete("/:id", deleteEmprunt); 

// Routes Remboursements
router.post("/addRemboursement", addRemboursement);
router.delete("/remboursement/:id", deleteRemboursement); // <-- Route de suppression remboursement

export default router;