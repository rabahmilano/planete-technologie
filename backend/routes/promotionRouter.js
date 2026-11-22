import {
  getPromotions,
  getPromotionById,
  addPromotion,
  updatePromotion,
  deletePromotion,
} from "../controllers/promotionController.js";

import { Router } from "express";

const router = Router();

router.post("/", addPromotion);
router.get("/", getPromotions);
router.get("/:id", getPromotionById);
router.patch("/:id", updatePromotion);
router.delete("/:id", deletePromotion);

export default router;
