import {
  addDevise,
  getAllDevises,
} from "../controllers/deviseController.js";

import { Router } from "express";

const router = Router();

router.post("/addDevise", addDevise);
router.get("/allDevises", getAllDevises);

export default router;
