import {
  addCodePromo,
  updateCodePromo,
  deleteCodePromo,
  getAllCodesPromo,
  verifierCodePromo,
} from "../controllers/codePromoController.js";

import { Router } from "express";

const router = Router();

router.post("/addCodePromo", addCodePromo);
router.get("/allCodesPromo", getAllCodesPromo);
router.get("/verifier/:code", verifierCodePromo);
router.patch("/updateCodePromo/:id", updateCodePromo);
router.delete("/deleteCodePromo/:id", deleteCodePromo);

export default router;
