import {
  addDevise,
  getAllDevises,
  addTauxDeChange,
  getAllDevisesDetails,
  getDevisesTaux,
} from "../controllers/deviseController.js";

import { Router } from "express";

const router = Router();

router.post("/addDevise", addDevise);
router.get("/allDevises", getAllDevises);
// router.get("/allDevisesDetails", getAllDevisesDetails);
// router.get("/allDevisesTaux", getDevisesComptes);

// router.post("/addTauxChange", addTauxDeChange);

export default router;
