import {
  addEmprunt,
  addRemboursement,
  getAllEmprunts,
  deleteEmprunt,
  deleteRemboursement,
  updateEmprunt,
  updateRemboursement
} from "../controllers/empruntController.js";

import { Router } from "express";

const router = Router();

// Routes Emprunts
router.get("/allEmprunts", getAllEmprunts);
router.post("/addEmprunt", addEmprunt);
router.delete("/:id", deleteEmprunt); 
router.put("/:id", updateEmprunt);

// Routes Remboursements
router.post("/addRemboursement", addRemboursement);
router.delete("/remboursement/:id", deleteRemboursement);
router.put("/remboursement/:id", updateRemboursement);

export default router;