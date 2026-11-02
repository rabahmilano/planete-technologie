import {
  addCompte,
  getAllComptes,
  crediterCompte,
  annulerCredit,
  getHistoriqueCredit,
  getBilanGlobal,
} from "../controllers/compteController.js";

import { Router } from "express";

const router = Router();

router.post("/addCompte", addCompte);
router.post("/crediterCompte", crediterCompte);
router.delete("/annuler-credit/:id", annulerCredit);
router.get("/allComptes", getAllComptes);
router.get("/historique-credit/:id", getHistoriqueCredit);
router.get("/bilan-global", getBilanGlobal);

export default router;
