import {
  getAllVoyages,
  getVoyageById,
  addVoyage,
  updateVoyage,
  deleteVoyage,
  changerStatutVoyage,
} from "../controllers/voyageController.js";

import { Router } from "express";

const router = Router();

// ==========================================
// ROUTES CRUD STANDARD
// ==========================================

// Récupérer la liste de tous les voyages
router.get("/", getAllVoyages);

// Récupérer les détails complets d'un voyage spécifique (avec ses dépenses et achats)
router.get("/:id", getVoyageById);

// Créer un nouveau voyage
router.post("/", addVoyage);

// Mettre à jour les infos d'un voyage (date, destination, etc.)
router.put("/:id", updateVoyage);

// Supprimer un voyage (uniquement s'il est vide)
router.delete("/:id", deleteVoyage);

// ==========================================
// ROUTES MÉTIERS SPÉCIFIQUES
// ==========================================

// Changer le statut du voyage (ex: passer EN_COURS ou CLOTURE pour calculer le coefficient)
router.put("/:id/statut", changerStatutVoyage);

export default router;
