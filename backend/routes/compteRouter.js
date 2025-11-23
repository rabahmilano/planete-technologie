import {
  addCompte,
  getAllComptes,
  crediterCompte,
  getComptesWithTauxChange,
} from "../controllers/compteController.js";

import { Router } from "express";

const router = Router();

router.post("/addCompte", addCompte);
router.post("/crediterCompte", crediterCompte);
router.get("/allComptes", getAllComptes);
// router.get("/allComptesTaux", getComptesWithTauxChange);

export default router;
