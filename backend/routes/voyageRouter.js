import {
  getAllVoyages,
  getVoyageById,
  addVoyage,
  updateVoyage,
  deleteVoyage,
  changerStatutVoyage,
  addTransactionVoyage,
} from "../controllers/voyageController.js";

import { Router } from "express";

const router = Router();

router.get("/", getAllVoyages);

router.get("/:id", getVoyageById);

router.post("/", addVoyage);

router.put("/:id", updateVoyage);

router.delete("/:id", deleteVoyage);

router.put("/:id/statut", changerStatutVoyage);

router.post("/:id/addTransaction", addTransactionVoyage);

export default router;
