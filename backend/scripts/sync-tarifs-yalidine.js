// Phases 1 et 3 — Script de récupération Yalidine.
//
// Appelle /wilayas, /communes, /centers et /fees (une route par wilaya de
// destination, départ fixe = YALIDINE_FROM_WILAYA, 15) puis produit un
// RAPPORT sur disque. SANS le flag --write : lecture seule, aucune écriture
// en base. AVEC --write : remplit commune_livraison et bureau_livraison
// (upsert par id Yalidine, sans doublon) puis supprime les lignes qui ont
// disparu de l'API (bureaux orphelins d'abord, communes ensuite — la FK
// bureau → commune est RESTRICT) et vérifie les comptages.
//
// Usage : node scripts/sync-tarifs-yalidine.js [--write]   (depuis backend/)
// Le rapport est écrit dans scripts/rapports/rapport-sync-tarifs-<horodatage>.md
//
// Quotas officiels : 5 req/s, 50/min, 1 000/h, 10 000/jour. Abus = bannissement
// définitif : ce script ne fait que les appels nécessaires à la synchro
// (~62 appels : 1 wilayas + 2 pages communes + 1 centres + 58 fees), avec un
// limiteur double fenêtre adaptatif (constat phase 1 : la limite réelle est
// plus stricte que la documentation) et les mêmes règles de retry que
// config/yalidine.js (429 Retry-After, backoff 5xx).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const BASE_URL = (
  process.env.YALIDINE_API_URL || "https://api.guepex.app/v1"
).replace(/\/$/, "");
const WILAYA_ORIGINE = parseInt(process.env.YALIDINE_FROM_WILAYA || "15", 10);
const TIMEOUT_MS = 15000;

const MAX_REQUETES_PAR_SECONDE = 4;
const MAX_REQUETES_PAR_MINUTE = 30; // marge sous la limite officielle (50/min)
const RETRY_AFTER_MAX_S = 60;
const ESSAIS_MAX_5XX = 3;

// Valeurs attendues (vérifiées manuellement le 27/11/2026 sur Alger, wilaya 16).
const ATTENDU_ALGER = {
  id: 16,
  nbCommunes: 57,
  tarifs: "650|500|500|400", // express_home|express_desk|economic_home|economic_desk
  zone: 1,
  oversize: 100,
};

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

// Mode écriture (--write) : remplit commune_livraison et bureau_livraison.
// Sans le flag, le script reste en lecture seule (comportement phase 1).
const ECRITURE = process.argv.includes("--write");

// Limiteur client double fenêtre glissante, ADAPTATIF : au premier 429 les
// plafonds locaux sont réduits (la limite réelle est plus stricte que la
// documentation — constaté en phase 1).
let limiteParSeconde = MAX_REQUETES_PAR_SECONDE;
let limiteParMinute = MAX_REQUETES_PAR_MINUTE;
const horodatagesRequetes = [];
const reserverRequete = async () => {
  for (;;) {
    const maintenant = Date.now();
    while (
      horodatagesRequetes.length &&
      maintenant - horodatagesRequetes[0] >= 60000
    ) {
      horodatagesRequetes.shift();
    }
    if (horodatagesRequetes.length >= limiteParMinute) {
      const attente = 60000 - (maintenant - horodatagesRequetes[0]) + 1;
      await attendre(attente);
      continue;
    }
    const dansLaSeconde = horodatagesRequetes.filter(
      (t) => maintenant - t < 1000,
    );
    if (dansLaSeconde.length < limiteParSeconde) {
      horodatagesRequetes.push(maintenant);
      return;
    }
    const attente = 1000 - (maintenant - dansLaSeconde[0]) + 1;
    await attendre(attente);
  }
};

// Lecture des quotas renvoyés par l'API (l'en-tête arrive sans préfixe x-
// sur le domaine Guepex, on accepte les deux formes comme config/yalidine.js).
const lireQuotas = (entetes) => {
  const lire = (nom) => {
    const brut = entetes.get(`x-${nom}`) ?? entetes.get(nom);
    if (brut === null || brut === undefined) return null;
    const valeur = parseInt(brut, 10);
    return Number.isFinite(valeur) ? valeur : null;
  };
  return {
    s: lire("second-quota-left"),
    m: lire("minute-quota-left"),
    h: lire("hour-quota-left"),
    j: lire("day-quota-left"),
  };
};

class ErreurYalidine extends Error {
  constructor(message) {
    super(message);
    this.name = "ErreurYalidine";
  }
}

const appelerUneFois = async (chemin) => {
  await reserverRequete();
  const controleur = new AbortController();
  const delai = setTimeout(() => controleur.abort(), TIMEOUT_MS);
  try {
    const reponse = await fetch(`${BASE_URL}/${chemin}`, {
      signal: controleur.signal,
      headers: {
        "X-API-ID": process.env.YALIDINE_API_ID,
        "X-API-TOKEN": process.env.YALIDINE_API_TOKEN,
        Accept: "application/json",
      },
    });
    const corps = await reponse.json().catch(() => null);
    return { reponse, corps };
  } finally {
    clearTimeout(delai);
  }
};

// Mêmes règles que config/yalidine.js : 429 => attente Retry-After (une seule
// fois, ≤ 60 s) ; 5xx / réseau / délai dépassé => backoff 1 s, 2 s, 4 s ;
// autres 4xx => échec immédiat. Aucun secret n'est journalisé.
const appeler = async (chemin, profondeur = 0) => {
  if (!process.env.YALIDINE_API_ID || !process.env.YALIDINE_API_TOKEN) {
    throw new ErreurYalidine(
      "Identifiants Yalidine absents du .env (YALIDINE_API_ID / YALIDINE_API_TOKEN).",
    );
  }
  let reponse;
  let corps;
  try {
    ({ reponse, corps } = await appelerUneFois(chemin));
  } catch (erreur) {
    if (profondeur < ESSAIS_MAX_5XX - 1) {
      await attendre(1000 * 2 ** profondeur);
      return appeler(chemin, profondeur + 1);
    }
    throw new ErreurYalidine(
      `Impossible de joindre Yalidine (${chemin}) : ${erreur.message}`,
    );
  }
  if (reponse.ok) {
    if (chemin.startsWith("fees/")) {
      const q = lireQuotas(reponse.headers);
      console.log(`  quotas restants s:${q.s} m:${q.m} h:${q.h} j:${q.j}`);
    }
    return corps;
  }
  if (reponse.status === 429) {
    const q = lireQuotas(reponse.headers);
    const brut = reponse.headers.get("retry-after");
    const secondes = brut ? parseInt(brut, 10) : null;
    // Retry-After peut être négatif (bug constaté côté Guepex) : on le traite
    // comme une courte attente et on ralentit le limiteur local.
    const attenteS =
      Number.isFinite(secondes) && secondes > 0
        ? Math.min(secondes, RETRY_AFTER_MAX_S)
        : 2;
    if (profondeur === 0 && attenteS <= RETRY_AFTER_MAX_S) {
      console.warn(
        `429 sur ${chemin} (quotas s:${q.s} m:${q.m} h:${q.h} j:${q.j}, Retry-After : ${brut || "?"}) — attente ${attenteS}s puis nouvel essai.`,
      );
      limiteParMinute = Math.max(10, limiteParMinute - 5);
      limiteParSeconde = Math.max(2, limiteParSeconde - 1);
      console.warn(
        `Limiteur adaptatif réduit : ${limiteParSeconde}/s, ${limiteParMinute}/min.`,
      );
      await attendre(attenteS * 1000 + 250);
      return appeler(chemin, profondeur + 1);
    }
    throw new ErreurYalidine(
      `Quota dépassé sur ${chemin} (Retry-After : ${brut || "?"}).`,
    );
  }
  if (reponse.status >= 500 && profondeur < ESSAIS_MAX_5XX - 1) {
    await attendre(1000 * 2 ** profondeur);
    return appeler(chemin, profondeur + 1);
  }
  throw new ErreurYalidine(
    `Yalidine a répondu ${reponse.status} sur ${chemin}.`,
  );
};

// Clé d'un groupe de tarifs : les 4 valeurs (les null deviennent "—").
const cleGroupeTarifs = (c) =>
  [
    c.express_home,
    c.express_desk,
    c.economic_home,
    c.economic_desk,
  ]
    .map((v) => (v === null || v === undefined ? "—" : v))
    .join("|");

// Phase 3 — écriture en base : DÉLÉGUÉE au module de synchro du serveur
// (config/syncTarifs.js) pour n'avoir qu'UNE implémentation des upserts et
// de la purge, partagée avec les déclencheurs admin/hebdomadaire (phase 4).
// Le script ajoute ensuite ses vérifications de conformité pour le rapport.
// tarif_livraison n'est jamais touchée ici.
const ecrireEnBase = async (communes, centres, feesParWilaya) => {
  const { ecrireDonnees } = await import("../config/syncTarifs.js");
  const resultat = await ecrireDonnees({ communes, centres, feesParWilaya });
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  const [totalCommunes, nonLivrables, avecBureau, totalBureaux, wilayas] =
    await Promise.all([
      prisma.commune_livraison.count(),
      prisma.commune_livraison.count({ where: { livrable: false } }),
      prisma.commune_livraison.count({ where: { a_bureau: true } }),
      prisma.bureau_livraison.count(),
      prisma.commune_livraison.groupBy({
        by: ["code_wilaya_commune"],
        _count: { id_commune: true },
      }),
    ]);
  const communesAlger = await prisma.commune_livraison.findMany({
    where: { code_wilaya_commune: ATTENDU_ALGER.id },
    select: {
      express_home: true,
      express_desk: true,
      economic_home: true,
      economic_desk: true,
    },
  });
  const groupesAlger = [
    ...new Set(
      communesAlger.map((c) =>
        [c.express_home, c.express_desk, c.economic_home, c.economic_desk]
          .map((v) => (v === null ? "—" : String(v)))
          .join("|"),
      ),
    ),
  ];
  const verifs = {
    totalCommunes,
    totalWilayas: wilayas.length,
    nonLivrables,
    avecBureau,
    totalBureaux,
    purgeBureaux: resultat.purge_bureaux,
    purgeCommunes: resultat.purge_communes,
    communesAlger: communesAlger.length,
    groupesAlger,
  };
  await prisma.$disconnect();
  return verifs;
};

const principal = async () => {
  const debut = Date.now();
  let nbAppels = 0;
  const compterAppel = () => nbAppels++;

  // Empaquetage : chaque listerTout/appeler incrémente le compteur d'appels.
  const appelerCompte = async (chemin) => {
    compterAppel();
    return appeler(chemin);
  };
  const listerToutCompte = async (ressource, filtre = "") => {
    const elements = [];
    let chemin = `${ressource}/?${filtre}${filtre ? "&" : ""}page_size=1000`;
    const visites = new Set();
    for (;;) {
      if (visites.has(chemin)) break;
      visites.add(chemin);
      const corps = await appelerCompte(chemin);
      elements.push(...(corps?.data || []));
      const suivant = corps?.links?.next;
      if (!corps?.has_more || !suivant) break;
      try {
        const url = new URL(suivant, `${BASE_URL}/`);
        const prefixe = url.pathname.startsWith("/v1/")
          ? url.pathname.slice(4)
          : url.pathname.replace(/^\//, "");
        chemin = `${prefixe}${url.search}`;
      } catch {
        console.warn(`links.next illisible (${suivant}) — liste partielle.`);
        break;
      }
    }
    return elements;
  };

  console.log(`Récupération wilayas / communes / centres (base : ${BASE_URL})...`);
  const wilayas = await listerToutCompte("wilayas");
  const communes = await listerToutCompte("communes");
  const centres = await listerToutCompte("centers");
  console.log(
    `  ${wilayas.length} wilayas, ${communes.length} communes, ${centres.length} centres.`,
  );

  // Fees : une route par wilaya de destination (les 58 identifiés par l'API).
  const idsWilayas = [...new Set(wilayas.map((w) => w.id))].sort((a, b) => a - b);
  const feesParWilaya = new Map();
  for (const idWilaya of idsWilayas) {
    const corps = await appelerCompte(
      `fees/?from_wilaya_id=${WILAYA_ORIGINE}&to_wilaya_id=${idWilaya}`,
    );
    feesParWilaya.set(idWilaya, corps);
    if (idWilaya % 10 === 0) {
      console.log(`  fees ${idWilaya}/${idsWilayas.length}...`);
    }
  }

  // Phase 3 : écriture en base si --write (avant les stats et le rapport).
  let verifsEcriture = null;
  if (ECRITURE) {
    console.log("Écriture en base (upsert par id)...");
    verifsEcriture = await ecrireEnBase(communes, centres, feesParWilaya);
    console.log(
      `  ${verifsEcriture.totalCommunes} communes (${verifsEcriture.totalWilayas} wilayas), ${verifsEcriture.totalBureaux} bureaux en base.`,
    );
  }

  // ---- Statistiques -----------------------------------------------------
  const wilayasLivrables = wilayas.filter((w) => w.is_deliverable !== 0);
  const wilayasNonLivrables = wilayas.filter((w) => w.is_deliverable === 0);
  const communesAvecBureau = communes.filter((c) => c.has_stop_desk !== 0);
  const communesNonLivrables = communes.filter((c) => c.is_deliverable === 0);
  const communesSansDelai = communes.filter(
    (c) =>
      c.delivery_time_parcel === null || c.delivery_time_parcel === undefined,
  );
  const centresHorsCommunes = centres.filter(
    (c) => !communes.some((com) => com.id === c.commune_id),
  );

  const lignesFees = [];
  let nbWilayasEconomicNull = 0;
  for (const idWilaya of idsWilayas) {
    const corps = feesParWilaya.get(idWilaya) || {};
    const parCommune = Object.values(corps?.per_commune || {});
    const groupes = new Map(); // clé tarifs -> { nb, communes[0] }
    let economicNull = 0;
    for (const commune of parCommune) {
      const cle = cleGroupeTarifs(commune);
      if (!groupes.has(cle)) {
        groupes.set(cle, { nb: 0, exemple: commune.commune_name, ids: [] });
      }
      groupes.get(cle).nb++;
      groupes.get(cle).ids.push(commune.commune_id);
      if (commune.economic_home === null || commune.economic_desk === null) {
        economicNull++;
      }
    }
    if (economicNull > 0) nbWilayasEconomicNull++;
    const communesWilaya = communes.filter((c) => c.wilaya_id === idWilaya);
    const idsTarifees = new Set(parCommune.map((c) => c.commune_id));
    const sansTarif = communesWilaya.filter((c) => !idsTarifees.has(c.id));
    lignesFees.push({
      id: idWilaya,
      nom: corps?.to_wilaya_name || communesWilaya[0]?.wilaya_name || "?",
      zone: corps?.zone ?? null,
      retour: corps?.retour_fee ?? null,
      oversize: corps?.oversize_fee ?? null,
      cod: corps?.cod_percentage ?? null,
      assurance: corps?.insurance_percentage ?? null,
      nbCommunesApi: communesWilaya.length,
      nbCommunesFees: parCommune.length,
      sansTarif: sansTarif.map((c) => c.name),
      nbGroupes: groupes.size,
      groupes: [...groupes.entries()].map(([cle, g]) => ({ tarifs: cle, ...g })),
      economicNull,
    });
  }

  // Vérification connue : Alger (16) = 57 communes, 650/500/500/400,
  // zone 1, oversize 100.
  const alger = lignesFees.find((l) => l.id === ATTENDU_ALGER.id) || null;
  const communesAlger = communes.filter(
    (c) => c.wilaya_id === ATTENDU_ALGER.id,
  );
  const verifsAlger = alger
    ? [
        {
          nom: `Nombre de communes (attendu ${ATTENDU_ALGER.nbCommunes})`,
          obtenu: communesAlger.length,
          ok: communesAlger.length === ATTENDU_ALGER.nbCommunes,
        },
        {
          nom: `Groupe de tarifs unique (attendu ${ATTENDU_ALGER.tarifs} : domicile|bureau express, domicile|bureau économique)`,
          obtenu:
            alger.nbGroupes === 1
              ? `${alger.groupes[0].tarifs} sur ${alger.groupes[0].nb} communes`
              : `${alger.nbGroupes} groupes distincts`,
          ok:
            alger.nbGroupes === 1 &&
            alger.groupes[0].tarifs === ATTENDU_ALGER.tarifs,
        },
        {
          nom: `Zone (attendue ${ATTENDU_ALGER.zone})`,
          obtenu: alger.zone,
          ok: alger.zone === ATTENDU_ALGER.zone,
        },
        {
          nom: `Oversize_fee (attendu ${ATTENDU_ALGER.oversize})`,
          obtenu: alger.oversize,
          ok: Number(alger.oversize) === ATTENDU_ALGER.oversize,
        },
      ]
    : null;

  const dureeS = Math.round((Date.now() - debut) / 1000);
  const horodatage = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dossierRapports = path.join(__dirname, "rapports");
  fs.mkdirSync(dossierRapports, { recursive: true });
  const cheminRapport = path.join(
    dossierRapports,
    `rapport-sync-tarifs-${horodatage}.md`,
  );

  const lignesMd = [];
  const ecrire = (...lignes) => lignesMd.push(...lignes);

  ecrire(
    `# Rapport de récupération Yalidine (lecture seule) — ${new Date().toLocaleString("fr-FR")}`,
    "",
    `- Base API : \`${BASE_URL}\` (aucune clé affichée)`,
    `- Wilaya d'origine (from_wilaya_id) : **${WILAYA_ORIGINE}**`,
    `- Durée totale : **${dureeS} s** — appels API : **${nbAppels}** (limiteur adaptatif, 4/s et ${MAX_REQUETES_PAR_MINUTE}/min au départ)`,
    ECRITURE
      ? "- Mode : **--write** — commune_livraison et bureau_livraison remplies (upsert par id), ligne tarif_livraison non touchée."
      : "- Aucune écriture en base (lecture seule).",
    "",
    "## 1. Wilayas",
    "",
    `- Total renvoyé par l'API : **${wilayas.length}**`,
    `- Livrables (is_deliverable) : **${wilayasLivrables.length}**`,
    `- Non livrables : **${wilayasNonLivrables.length}**${
      wilayasNonLivrables.length
        ? " — " +
          wilayasNonLivrables.map((w) => `${w.id} ${w.name}`).join(", ")
        : ""
    }`,
    `- Identifiant le plus élevé : **${Math.max(...wilayas.map((w) => w.id))}** (les 11 wilayas 59-69 attendues au 01/01/2027 ne sont pas encore dans l'API)`,
    "",
    "## 2. Communes",
    "",
    `- Total renvoyé par l'API : **${communes.length}** (attendu : 1541)`,
    `- Livrables : **${communes.length - communesNonLivrables.length}** — non livrables : **${communesNonLivrables.length}**`,
    `- Avec bureau (has_stop_desk) : **${communesAvecBureau.length}**`,
    `- Sans délai (delivery_time_parcel null) : **${communesSansDelai.length}**`,
    "",
    "## 3. Centres (bureaux stop-desk)",
    "",
    `- Total renvoyé par l'API : **${centres.length}** (attendu : 99)`,
    `- Rattachés à une commune existante : **${centres.length - centresHorsCommunes.length}**`,
    `- Commune introuvable pour un centre : **${centresHorsCommunes.length}**${
      centresHorsCommunes.length
        ? " — " +
          centresHorsCommunes
            .map((c) => `${c.center_id} (${c.name}, commune_id ${c.commune_id})`)
            .join(", ")
        : ""
    }`,
    "",
    "## 4. Tarifs par wilaya de destination (fees, départ " +
      WILAYA_ORIGINE +
      ")",
    "",
    "Format des groupes : `express_home|express_desk|economic_home|economic_desk` (`—` = null).",
    "",
    "| Id | Wilaya | Zone | Retour | Oversize | COD % | Assur. % | Comm. API | Comm. fees | Groupes | Répartition | Econ. null | Sans tarif |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  );
  for (const l of lignesFees) {
    ecrire(
      `| ${l.id} | ${l.nom} | ${l.zone ?? "?"} | ${l.retour ?? "?"} | ${l.oversize ?? "?"} | ${l.cod ?? "?"} | ${l.assurance ?? "?"} | ${l.nbCommunesApi} | ${l.nbCommunesFees} | ${l.nbGroupes} | ${l.groupes
        .map((g) => `${g.tarifs} ×${g.nb}`)
        .join(" ; ")} | ${l.economicNull} | ${l.sansTarif.join(", ") || "—"} |`,
    );
  }
  ecrire(
    "",
    `- Wilayas où au moins une commune a economic_* null : **${nbWilayasEconomicNull} / ${lignesFees.length}**`,
    "",
    "## 5. Vérification des valeurs connues — Alger (16)",
    "",
  );
  if (verifsAlger) {
    for (const v of verifsAlger) {
      ecrire(`- ${v.ok ? "✅" : "❌"} ${v.nom} → obtenu : **${v.obtenu}**`);
    }
  } else {
    ecrire("- ❌ Aucun retour /fees pour la wilaya 16 (Alger) !");
  }
  ecrire(
    "",
    "## 6. Synthèse pour le modèle (D4/D5/D10)",
    "",
    `- Wilayas avec un seul groupe de tarifs : **${lignesFees.filter((l) => l.nbGroupes === 1).length} / ${lignesFees.length}**`,
    `- Wilayas avec plusieurs groupes (les tarifs VARIENT par commune → stockage par commune obligatoire, D4) : **${lignesFees.filter((l) => l.nbGroupes > 1).length}**`,
    `- Somme des communes tarifées toutes wilayas : **${lignesFees.reduce((t, l) => t + l.nbCommunesFees, 0)}**`,
  );
  if (verifsEcriture) {
    const v = verifsEcriture;
    ecrire(
      "",
      "## 7. Vérifications après écriture en base (--write)",
      "",
      `- commune_livraison : **${v.totalCommunes}** lignes, **${v.totalWilayas}** wilayas distinctes (attendu 58)`,
      `- Non livrables : **${v.nonLivrables}** (attendu 75) — avec bureau : **${v.avecBureau}** (attendu 155)`,
      `- bureau_livraison : **${v.totalBureaux}** lignes (attendu 199), toutes rattachées à leur commune (FK RESTRICT appliquée par MySQL/InnoDB)`,
      `- Purge : **${v.purgeBureaux}** bureaux et **${v.purgeCommunes}** communes disparues de l'API supprimés`,
      `- Alger (16) : **${v.communesAlger}** communes (attendu 57), groupes de tarifs en base : ${v.groupesAlger.join(" ; ") || "aucun"} (attendu 650|500|500|400)`,
    );
  }
  ecrire(
    "",
    ECRITURE
      ? "_Fin du rapport — écriture en base réalisée (upsert par id Yalidine)._"
      : "_Fin du rapport — script exécuté en lecture seule, aucune ligne écrite en base._",
  );

  fs.writeFileSync(cheminRapport, lignesMd.join("\n"), "utf8");
  console.log(`\nRapport écrit : ${cheminRapport}`);
  console.log(
    `Synthèse : ${wilayasLivrables.length} wilayas livrables, ${communes.length} communes (attendu 1541), ${communesAvecBureau.length} avec bureau, ${centres.length} centres (attendu 99).`,
  );
  if (verifsAlger) {
    for (const v of verifsAlger) {
      console.log(`${v.ok ? "✅" : "❌"} Alger : ${v.nom} → ${v.obtenu}`);
    }
  }
};

principal().catch((erreur) => {
  console.error("ÉCHEC de la récupération :", erreur.message);
  process.exit(1);
});
