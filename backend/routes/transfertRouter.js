import { executeTransfert } from "../controllers/transfertController.js";

import { Router } from "express";

const router = Router();

router.post("/createTransfert", executeTransfert);

export default router;
