import {
  addNatureDepense,
  addNewDepense,
  getAllNatDep,
  getDepensesFiltrees,
  getGlobalStats,
} from "../controllers/depenseController.js";

import { Router } from "express";

const router = Router();

router.post("/addDepense", addNewDepense);
router.get("/", getDepensesFiltrees);
router.get("/stats/global", getGlobalStats);

router.post("/addNatDepense", addNatureDepense);
router.get("/allNatDepense", getAllNatDep);

export default router;
