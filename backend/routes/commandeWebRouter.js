import {
  creerCommandeWeb,
  getAllCommandesWeb,
  getCommandeWebDetail,
  changerStatutCommandeWeb,
  annulerCommandeWeb,
} from "../controllers/commandeWebController.js";

import { Router } from "express";

const router = Router();

router.post("/addCommandeWeb", creerCommandeWeb);
router.get("/allCommandesWeb", getAllCommandesWeb);
router.get("/:id", getCommandeWebDetail);
router.patch("/statut/:id", changerStatutCommandeWeb);
router.patch("/annuler/:id", annulerCommandeWeb);

export default router;
