import {
  addNatureDepense,
  addNewDepense,
  getAllNatDep,
  getDepensesFiltrees,
  getGlobalStats,
  updateDepense,
  deleteDepense
} from "../controllers/depenseController.js";

import { Router } from "express";

const router = Router();

router.post("/addDepense", addNewDepense);
router.get("/", getDepensesFiltrees);
router.get("/stats/global", getGlobalStats);
router.patch("/:id", updateDepense); 
router.delete("/:id", deleteDepense);

router.post("/addNatDepense", addNatureDepense);
router.get("/allNatDepense", getAllNatDep);

export default router;
