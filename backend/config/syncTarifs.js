// Synchro tarifaire Yalidine → base locale (phase 4, décisions D1-D4, D6-D8).
//
// D1/D2 : synchro automatique hebdomadaire (planifiée côté backend) +
// synchro globale manuelle depuis l'admin. D3 : synchro d'une wilaya seule
// (3 appels API : communes, centres, fees). D6 : la synchro ÉCRASE les prix
// en base (aucun ajustement manuel à préserver). D7 : chaque ligne écrite
// porte sa date_synchro (bannière « dernière synchronisation »).
//
// Le champ zone de l'API est ignoré (D5). Le journal des synchro est tenu en
// mémoire (les 20 dernières) : la donnée durable reste date_synchro en base.
import prisma from "./dbConfig.js";
import {
  estConfigure,
  getCommunesBrut,
  getCentresBrut,
  getFraisRouteBrut,
  getWilayasBrut,
} from "./yalidine.js";

// D1 : fréquence automatique hebdomadaire. La vérification tourne chaque
// heure et ne déclenche la synchro que si la dernière date_synchro dépasse
// ce seuil — un redémarrage du serveur ne consomme jamais le quota sans
// raison (aucun appel « pour voir »).
export const SEUIL_HEBDO_JOURS = 7;
const TAILLE_LOT = 100;
const JOURNAL_MAX = 20;

// Journal en mémoire (les plus récentes d'abord) : date, portée, périmètre,
// résultat. Utilisé par la page admin via GET /synchronisation/journal.
const journal = [];

const journaliser = (entree) => {
  journal.unshift(entree);
  if (journal.length > JOURNAL_MAX) journal.length = JOURNAL_MAX;
};

export const getJournalSynchronisation = () => [...journal];

// Verrou anti-concurrence : une seule synchro à la fois (2 admins qui
// cliquent en même temps, ou bouton + tâche hebdomadaire) — le quota API est
// trop précieux pour doubler un travail de ~62 appels.
let enCours = false;

export const estSynchronisationEnCours = () => enCours;

const avecVerrou = async (operation) => {
  if (enCours) {
    const erreur = new Error("SYNCHRO_DEJA_EN_COURS");
    erreur.code = "SYNCHRO_DEJA_EN_COURS";
    throw erreur;
  }
  enCours = true;
  try {
    return await operation();
  } finally {
    enCours = false;
  }
};

const tarif = (v) => (v === null || v === undefined ? null : parseFloat(v));

const executerLots = async (operations) => {
  for (let i = 0; i < operations.length; i += TAILLE_LOT) {
    await prisma.$transaction(operations.slice(i, i + TAILLE_LOT));
  }
};

/**
 * Écriture des données API récupérées : upserts par id Yalidine (communes
 * d'abord, bureaux ensuite — FK RESTRICT bureau → commune) puis purge des
 * lignes du périmètre qui ont disparu de l'API. `codeWilaya` borne le
 * périmètre (synchro d'une wilaya) : les autres wilayas ne sont jamais
 * touchées. Garde-fou : si l'API renvoie une liste vide, rien n'est purgé
 * (une panne momentanée ne doit pas vider le référentiel).
 */
export const ecrireDonnees = async ({
  communes,
  centres,
  feesParWilaya,
  codeWilaya = null,
}) => {
  const dateSynchro = new Date();

  // Tarifs par commune + valeurs de route par wilaya (retour_fee et
  // oversize_fee valent pour toute la route, dupliqués sur chaque ligne).
  const tarifsParCommune = new Map();
  const routeParWilaya = new Map();
  for (const [idWilaya, corps] of feesParWilaya) {
    routeParWilaya.set(idWilaya, {
      retour: corps?.retour_fee ?? null,
      oversize: corps?.oversize_fee ?? null,
    });
    for (const [idCommune, c] of Object.entries(corps?.per_commune || {})) {
      tarifsParCommune.set(parseInt(idCommune, 10), c);
    }
  }

  // Communes écrites : celles du périmètre ET dont la wilaya a un retour
  // fees (garde-fou D6 : une wilaya dont l'appel fees a échoué garde ses
  // tarifs en base — jamais d'écrasement par des tarifs vides).
  const communesAPrendre = communes.filter(
    (c) =>
      (codeWilaya === null || c.wilaya_id === codeWilaya) &&
      routeParWilaya.has(c.wilaya_id),
  );
  const centresAPrendre = centres.filter(
    (c) => codeWilaya === null || c.wilaya_id === codeWilaya,
  );

  const upsertCommunes = communesAPrendre.map((c) => {
    const t = tarifsParCommune.get(c.id) || {};
    const route = routeParWilaya.get(c.wilaya_id) || {};
    const donnees = {
      code_wilaya_commune: c.wilaya_id,
      nom_wilaya_commune: c.wilaya_name || "?",
      nom_commune: c.name,
      livrable: c.is_deliverable !== 0,
      a_bureau: c.has_stop_desk !== 0,
      delai_livraison_jours: c.delivery_time_parcel ?? null,
      delai_paiement_jours: c.delivery_time_payment ?? null,
      express_home: tarif(t.express_home),
      express_desk: tarif(t.express_desk),
      economic_home: tarif(t.economic_home),
      economic_desk: tarif(t.economic_desk),
      retour_fee: tarif(route.retour),
      oversize_fee: tarif(route.oversize),
      date_synchro: dateSynchro,
    };
    return prisma.commune_livraison.upsert({
      where: { id_commune: c.id },
      create: { id_commune: c.id, ...donnees },
      update: donnees,
    });
  });
  const upsertBureaux = centresAPrendre.map((c) => {
    const donnees = {
      commune_id: c.commune_id,
      nom_centre: c.name,
      adresse: c.address || null,
    };
    return prisma.bureau_livraison.upsert({
      where: { id_centre: c.center_id },
      create: { id_centre: c.center_id, ...donnees },
      update: donnees,
    });
  });

  await executerLots(upsertCommunes);
  await executerLots(upsertBureaux);

  // Purge bornée au périmètre, uniquement si l'API a renvoyé quelque chose.
  let purgeBureaux = 0;
  let purgeCommunes = 0;
  if (communesAPrendre.length > 0) {
    if (codeWilaya === null) {
      purgeBureaux = (
        await prisma.bureau_livraison.deleteMany({
          where: { id_centre: { notIn: centres.map((c) => c.center_id) } },
        })
      ).count;
      purgeCommunes = (
        await prisma.commune_livraison.deleteMany({
          where: { id_commune: { notIn: communes.map((c) => c.id) } },
        })
      ).count;
    } else {
      const idsBureauxWilaya = centresAPrendre.map((c) => c.center_id);
      const idsCommunesWilaya = communesAPrendre.map((c) => c.id);
      purgeBureaux = (
        await prisma.bureau_livraison.deleteMany({
          where: {
            commune: { code_wilaya_commune: codeWilaya },
            ...(idsBureauxWilaya.length > 0
              ? { id_centre: { notIn: idsBureauxWilaya } }
              : {}),
          },
        })
      ).count;
      purgeCommunes = (
        await prisma.commune_livraison.deleteMany({
          where: {
            code_wilaya_commune: codeWilaya,
            ...(idsCommunesWilaya.length > 0
              ? { id_commune: { notIn: idsCommunesWilaya } }
              : {}),
          },
        })
      ).count;
    }
  }

  return {
    date_synchro: dateSynchro,
    communes_ecrites: communesAPrendre.length,
    bureaux_ecrits: centresAPrendre.length,
    purge_bureaux: purgeBureaux,
    purge_communes: purgeCommunes,
  };
};

/**
 * Synchro d'UNE wilaya (D3) : 3 appels API (communes, centres, fees) puis
 * upserts + purge de ce périmètre. Si l'appel fees échoue, AUCUNE écriture :
 * la wilaya garde ses données existantes plutôt que d'être écrasée par des
 * tarifs vides.
 */
export const synchroniserWilaya = async (codeWilaya, portee = "MANUEL") => {
  const debut = Date.now();
  return avecVerrou(async () => {
    if (!estConfigure()) {
      throw new Error("Identifiants Yalidine non configurés.");
    }
    const communes = await getCommunesBrut(codeWilaya);
    const centres = await getCentresBrut(codeWilaya);
    let corpsFees;
    try {
      corpsFees = await getFraisRouteBrut(codeWilaya);
    } catch (erreur) {
      journaliser({
        date: new Date(),
        portee,
        wilaya: codeWilaya,
        ok: false,
        message: erreur.message,
        communes: 0,
        bureaux: 0,
        duree_ms: Date.now() - debut,
      });
      throw erreur;
    }
    const feesParWilaya = new Map([[codeWilaya, corpsFees]]);
    const resultat = await ecrireDonnees({
      communes,
      centres,
      feesParWilaya,
      codeWilaya,
    });
    journaliser({
      date: new Date(),
      portee,
      wilaya: codeWilaya,
      ok: true,
      communes: resultat.communes_ecrites,
      bureaux: resultat.bureaux_ecrits,
      purge_bureaux: resultat.purge_bureaux,
      purge_communes: resultat.purge_communes,
      duree_ms: Date.now() - debut,
    });
    return { ...resultat, ok: true, wilaya: codeWilaya };
  });
};

/**
 * Synchro GLOBALE (D2) : wilayas + communes + centres + fees de chaque
 * wilaya de destination (~62 appels, ~2 min avec le limiteur). Une wilaya
 * dont l'appel fees échoue n'est PAS réécrite (ses tarifs en base sont
 * conservés) et l'erreur est remontée dans le résultat.
 */
export const synchroniserGlobale = async (portee = "MANUEL") => {
  const debut = Date.now();
  return avecVerrou(async () => {
    if (!estConfigure()) {
      throw new Error("Identifiants Yalidine non configurés.");
    }
    const wilayas = await getWilayasBrut();
    const idsWilayas = [...new Set(wilayas.map((w) => w.id))].sort(
      (a, b) => a - b,
    );
    const communes = await getCommunesBrut();
    const centres = await getCentresBrut();

    const feesParWilaya = new Map();
    const wilayasEnErreur = [];
    for (const idWilaya of idsWilayas) {
      try {
        const corps = await getFraisRouteBrut(idWilaya);
        feesParWilaya.set(idWilaya, corps);
      } catch (erreur) {
        wilayasEnErreur.push({ wilaya: idWilaya, message: erreur.message });
        console.warn(
          `Synchro : fees échoué pour la wilaya ${idWilaya} (${erreur.message}) — tarifs en base conservés.`,
        );
      }
    }

    const resultat = await ecrireDonnees({
      communes,
      centres,
      feesParWilaya,
    });
    const entree = {
      date: new Date(),
      portee,
      wilaya: null,
      ok: wilayasEnErreur.length === 0,
      communes: resultat.communes_ecrites,
      bureaux: resultat.bureaux_ecrits,
      purge_bureaux: resultat.purge_bureaux,
      purge_communes: resultat.purge_communes,
      wilayas_erreur: wilayasEnErreur,
      duree_ms: Date.now() - debut,
    };
    journaliser(entree);
    return { ...resultat, ok: entree.ok, wilayas_total: idsWilayas.length, wilayas_erreur: wilayasEnErreur };
  });
};

/**
 * D1 : planification hebdomadaire. Vérification chaque heure (et 20 s après
 * le démarrage) : la synchro globale ne part que si la dernière date_synchro
 * dépasse SEUIL_HEBDO_JOURS — jamais d'appel superflu après un redémarrage.
 */
export const planifierSynchroHebdomadaire = () => {
  const verifierEtSynchroniser = async () => {
    try {
      const derniere = await prisma.commune_livraison.aggregate({
        _max: { date_synchro: true },
      });
      const dateDerniere = derniere?._max?.date_synchro;
      const ageMs = dateDerniere
        ? Date.now() - dateDerniere.getTime()
        : Number.POSITIVE_INFINITY;
      // Diagnostic du déclenchement (quota API) : chaque vérification est
      // tracée avec la date vue et son âge calculé.
      console.log(
        `Synchro hebdomadaire : vérification — dernière date_synchro : ${dateDerniere?.toISOString() ?? "aucune"} | âge : ${Number.isFinite(ageMs) ? `${Math.round(ageMs / 60000)} min` : "infini (base vide)"}`,
      );
      if (ageMs <= SEUIL_HEBDO_JOURS * 24 * 60 * 60 * 1000) return;
      console.log(
        "Synchro hebdomadaire : dernière synchro dépassant le seuil de",
        `${SEUIL_HEBDO_JOURS} jours — lancement.`,
      );
      await synchroniserGlobale("AUTO");
    } catch (erreur) {
      if (erreur.code === "SYNCHRO_DEJA_EN_COURS") return;
      console.warn("Synchro hebdomadaire impossible :", erreur.message);
    }
  };
  setTimeout(verifierEtSynchroniser, 20000);
  setInterval(verifierEtSynchroniser, 60 * 60 * 1000);
};
