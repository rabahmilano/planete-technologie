import {
  declarerSortie,
  rembourserSortie,
  getSorties,
  refuserRemboursement,
} from "../controllers/sortieExceptionnelleController.js";
import { Router } from "express";

const router = Router();

router.post("/declarerSortie", declarerSortie);
router.get("/getSorties", getSorties);
router.post("/rembourserSortie/:id", rembourserSortie);
router.patch("/refuserRemboursement/:id", refuserRemboursement);

export default router;
