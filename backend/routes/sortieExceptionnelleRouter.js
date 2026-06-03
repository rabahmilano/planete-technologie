import {
  declarerSortie,
  rembourserSortie,
  getSorties,
  refuserRemboursement,
  annulerDecision,
  supprimerSortie,
  modifierSortie,
} from "../controllers/sortieExceptionnelleController.js";
import { Router } from "express";

const router = Router();

router.get("/getSorties", getSorties);

router.post("/declarerSortie", declarerSortie);
router.post("/rembourserSortie/:id", rembourserSortie);

router.patch("/refuserRemboursement/:id", refuserRemboursement);
router.patch("/modifierSortie/:id", modifierSortie);
router.patch("/annulerDecision/:id", annulerDecision);

router.delete("/supprimerSortie/:id", supprimerSortie);

export default router;
