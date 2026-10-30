import { Router } from "express";
import { creerAjustement, getAjustements, annulerAjustement } from "../controllers/ajustementCompteController.js";

const router = Router();

router.post("/", creerAjustement);
router.get("/", getAjustements);
router.delete("/:id", annulerAjustement);

export default router;
