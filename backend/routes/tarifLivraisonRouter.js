import {
  lancerSynchronisationGlobale,
  lancerSynchronisationWilaya,
  lireJournalSynchronisation,
  getReferentielLivraison,
  getCommunesWilayaReferentiel,
  getDerniereSynchronisation,
} from "../controllers/tarifLivraisonController.js";

import { Router } from "express";

const router = Router();

// Phase 7 : le CRUD de la grille de secours tarif_livraison est supprimé.
// Ne restent que les déclencheurs et lectures de synchronisation (phases 4-5).
router.post("/synchronisation/globale", lancerSynchronisationGlobale);
router.post("/synchronisation/wilaya/:code", lancerSynchronisationWilaya);
router.get("/synchronisation/journal", lireJournalSynchronisation);
router.get("/synchronisation/referentiel", getReferentielLivraison);
router.get("/synchronisation/communes/:code", getCommunesWilayaReferentiel);
router.get("/synchronisation/derniere-synchro", getDerniereSynchronisation);

export default router;
