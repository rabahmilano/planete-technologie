import {
  declarerSortie,
  rembourserSortie,
  getSorties,
} from "../controllers/sortieExceptionnelleController.js";
import { Router } from "express";

const router = Router();

router.post("/declarerSortie", declarerSortie);
router.get("/getSorties", getSorties);
router.post("/rembourserSortie/:id", rembourserSortie);

export default router;
