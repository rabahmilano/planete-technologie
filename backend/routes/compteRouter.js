import {
  addCompte,
  getAllComptes,
  crediterCompte,
  getHistoriqueCredit,
  getBilanGlobal,
} from "../controllers/compteController.js";

import { Router } from "express";

const router = Router();

router.post("/addCompte", addCompte);
router.post("/crediterCompte", crediterCompte);
router.get("/allComptes", getAllComptes);
router.get("/historique-credit/:id", getHistoriqueCredit);
router.get("/bilan-global", getBilanGlobal);

export default router;
