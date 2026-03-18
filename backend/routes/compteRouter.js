import {
  addCompte,
  getAllComptes,
  crediterCompte,
} from "../controllers/compteController.js";

import { Router } from "express";

const router = Router();

router.post("/addCompte", addCompte);
router.post("/crediterCompte", crediterCompte);
router.get("/allComptes", getAllComptes);

export default router;
