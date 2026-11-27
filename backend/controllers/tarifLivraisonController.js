// Phase 7 (28/11/2026) : la grille de secours tarif_livraison est supprimée
// (schéma, table et CRUD) — le devis lit désormais commune_livraison en
// premier, avec repli Yalidine en direct (voir boutiqueController). Ce
// contrôleur ne garde que les déclencheurs et les lectures de synchronisation.
import {
  synchroniserGlobale,
  synchroniserWilaya,
  getJournalSynchronisation,
  estSynchronisationEnCours,
} from "../config/syncTarifs.js";
import prisma from "../config/dbConfig.js";

// D2 : synchro globale forcée depuis l'admin (~62 appels API, ~2 min).
export const lancerSynchronisationGlobale = async (req, res) => {
  try {
    const resultat = await synchroniserGlobale("MANUEL");
    res.status(200).json(resultat);
  } catch (error) {
    if (error.code === "SYNCHRO_DEJA_EN_COURS") {
      return res.status(409).json({
        message:
          "Une synchronisation est déjà en cours — attendez sa fin avant de relancer.",
      });
    }
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

// D3 : synchro d'une wilaya seule (3 appels API).
export const lancerSynchronisationWilaya = async (req, res) => {
  const codeWilaya = parseInt(req.params.code, 10);
  if (isNaN(codeWilaya) || codeWilaya < 1 || codeWilaya > 58) {
    return res
      .status(400)
      .json({ message: "Le code wilaya doit être entre 1 et 58." });
  }
  try {
    const resultat = await synchroniserWilaya(codeWilaya, "MANUEL");
    res.status(200).json(resultat);
  } catch (error) {
    if (error.code === "SYNCHRO_DEJA_EN_COURS") {
      return res.status(409).json({
        message:
          "Une synchronisation est déjà en cours — attendez sa fin avant de relancer.",
      });
    }
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

// Journal des synchro (en mémoire, les 20 dernières) + état en cours.
export const lireJournalSynchronisation = async (req, res) => {
  res.status(200).json({
    journal: getJournalSynchronisation(),
    en_cours: estSynchronisationEnCours(),
  });
};

// ---- Lecture du référentiel commune/bureau (phase 5) -----------------------

// D7 : seuil d'alerte de la bannière « dernière synchronisation » (proposé,
// à confirmer par le propriétaire). Exposé aussi côté API pour que le
// dashboard et le backend restent d'accord.
export const SEUIL_ALERTE_JOURS = 14;

// Liste des wilayas du référentiel en base : une ligne par wilaya avec les
// comptages, la date de dernière synchro et, si la wilaya est uniforme, son
// groupe de tarifs unique (cas Alger : 650/500/500/400).
export const getReferentielLivraison = async (req, res) => {
  try {
    const communes = await prisma.commune_livraison.findMany({
      select: {
        id_commune: true,
        code_wilaya_commune: true,
        nom_wilaya_commune: true,
        nom_commune: true,
        livrable: true,
        a_bureau: true,
        delai_livraison_jours: true,
        express_home: true,
        express_desk: true,
        economic_home: true,
        economic_desk: true,
        retour_fee: true,
        oversize_fee: true,
        date_synchro: true,
        _count: { select: { bureaux: true } },
      },
      orderBy: [{ code_wilaya_commune: "asc" }, { nom_commune: "asc" }],
    });

    const parWilaya = new Map();
    for (const c of communes) {
      if (!parWilaya.has(c.code_wilaya_commune)) {
        parWilaya.set(c.code_wilaya_commune, []);
      }
      parWilaya.get(c.code_wilaya_commune).push(c);
    }

    const wilayas = [...parWilaya.entries()]
      .map(([code, liste]) => {
        const groupesTarifs = new Set(
          liste.map((c) =>
            [
              c.express_home,
              c.express_desk,
              c.economic_home,
              c.economic_desk,
            ]
              .map((v) => (v === null ? "—" : String(v)))
              .join("|"),
          ),
        );
        const tarifsUniformes =
          groupesTarifs.size === 1
            ? [...groupesTarifs][0].split("|").map((v) =>
                v === "—" ? null : parseFloat(v),
              )
            : null;
        return {
          code_wilaya: code,
          nom_wilaya: liste[0]?.nom_wilaya_commune || `Wilaya ${code}`,
          livrable: liste.every((c) => c.livrable),
          nb_communes: liste.length,
          nb_communes_bureau: liste.filter((c) => c.a_bureau).length,
          nb_bureaux: liste.reduce((t, c) => t + (c._count?.bureaux || 0), 0),
          date_synchro: liste
            .map((c) => c.date_synchro)
            .filter(Boolean)
            .sort((a, b) => b - a)[0] || null,
          delai_livraison_jours:
            [...new Set(liste.map((c) => c.delai_livraison_jours))].length === 1
              ? liste[0].delai_livraison_jours
              : null,
          tarifs_uniformes: tarifsUniformes,
          oversize_fee: liste[0]?.oversize_fee ?? null,
          retour_fee: liste[0]?.retour_fee ?? null,
        };
      })
      .sort((a, b) => a.code_wilaya - b.code_wilaya);

    res.status(200).json({ wilayas });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

// Détail d'une wilaya : toutes ses communes triées par nom (livrable ou
// non, délai, bureau + nombre de bureaux, les 4 tarifs, valeurs de route).
export const getCommunesWilayaReferentiel = async (req, res) => {
  const codeWilaya = parseInt(req.params.code, 10);
  if (isNaN(codeWilaya) || codeWilaya < 1 || codeWilaya > 69) {
    return res
      .status(400)
      .json({ message: "Le code wilaya doit être entre 1 et 69." });
  }
  try {
    const communes = await prisma.commune_livraison.findMany({
      where: { code_wilaya_commune: codeWilaya },
      select: {
        id_commune: true,
        nom_commune: true,
        nom_wilaya_commune: true,
        livrable: true,
        a_bureau: true,
        delai_livraison_jours: true,
        delai_paiement_jours: true,
        express_home: true,
        express_desk: true,
        economic_home: true,
        economic_desk: true,
        retour_fee: true,
        oversize_fee: true,
        date_synchro: true,
        _count: { select: { bureaux: true } },
      },
      orderBy: [{ nom_commune: "asc" }],
    });
    res.status(200).json({ wilaya: codeWilaya, communes });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

// Donnée légère pour la bannière D7 (page tarifs ET page commandes web) :
// la date de dernière synchro vient de la BASE (robuste au redémarrage du
// serveur, contrairement au journal en mémoire).
export const getDerniereSynchronisation = async (req, res) => {
  try {
    const derniere = await prisma.commune_livraison.aggregate({
      _max: { date_synchro: true },
    });
    const dateDerniere = derniere?._max?.date_synchro || null;
    const jours =
      dateDerniere !== null
        ? Math.floor((Date.now() - dateDerniere.getTime()) / 86400000)
        : null;
    res.status(200).json({
      date_derniere_synchro: dateDerniere,
      jours_ecoules: jours,
      seuil_alerte_jours: SEUIL_ALERTE_JOURS,
      alerte: jours === null || jours > SEUIL_ALERTE_JOURS,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};
