import {
  executeTransfert,
  getAllTransferts,
  deleteTransfert,
} from "../controllers/transfertController.js";
import { Router } from "express";

const router = Router();

router.post("/createTransfert", executeTransfert);
router.get("/getAllTransferts", getAllTransferts);
router.delete("/deleteTransfert/:id", deleteTransfert);

export default router;
