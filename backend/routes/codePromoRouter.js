import {
  addCodePromo,
  getAllCodesPromo,
  getCodePromoById,
  updateCodePromo,
  deleteCodePromo,
  verifyCodePromo,
} from "../controllers/codePromoController.js";

import { Router } from "express";

const router = Router();

router.post("/verifier", verifyCodePromo);
router.post("/", addCodePromo);
router.get("/", getAllCodesPromo);
router.get("/:id", getCodePromoById);
router.patch("/:id", updateCodePromo);
router.delete("/:id", deleteCodePromo);

export default router;
