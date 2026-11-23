import { nomWilaya } from "./wilayas.js";
import { calculerPoidsFactureKg } from "./utils.js";

const BASE_URL = (
  process.env.YALIDINE_API_URL || "https://api.yalidine.app/v1"
).replace(/\/$/, "");
const TIMEOUT_MS = 15000;

// Limites officielles du compte : 5 requêtes/s, 50/min, 1 000/h, 10 000/jour.
// Le limiteur client cible la fenêtre la plus stricte (5/s) ; les seuils
// d'alerte correspondent à 20 % restants sur chaque fenêtre.
const MAX_REQUETES_PAR_SECONDE = 5;
const FENETRE_LIMITEUR_MS = 1000;
const SEUILS_ALERTE_QUOTA = {
  seconde: 1,
  minute: 10,
  heure: 200,
  jour: 2000,
};
const RETRY_AFTER_MAX_S = 60;
const ESSAIS_MAX_5XX = 3;
const PAGES_HISTORIQUE_MAX = 50;

const cache = new Map();

const lireCache = (cle, ttlMs) => {
  const entree = cache.get(cle);
  if (!entree) return null;
  if (Date.now() - entree.date > ttlMs) {
    cache.delete(cle);
    return null;
  }
  return entree.valeur;
};

const ecrireCache = (cle, valeur) => {
  cache.set(cle, { valeur, date: Date.now() });
};

const attendre = (ms) => new Promise((resolution) => setTimeout(resolution, ms));

// Limiteur client en mémoire (même style Map que le cache) : jamais plus de
// MAX_REQUETES_PAR_SECONDE départs de requête par fenêtre glissante d'1 s.
const horodatagesRequetes = [];
const reserverRequete = async () => {
  for (;;) {
    const maintenant = Date.now();
    while (
      horodatagesRequetes.length &&
      maintenant - horodatagesRequetes[0] >= FENETRE_LIMITEUR_MS
    ) {
      horodatagesRequetes.shift();
    }
    if (horodatagesRequetes.length < MAX_REQUETES_PAR_SECONDE) {
      horodatagesRequetes.push(maintenant);
      return;
    }
    const attente = FENETRE_LIMITEUR_MS - (maintenant - horodatagesRequetes[0]) + 1;
    await attendre(attente);
  }
};

export const estConfigure = () =>
  Boolean(process.env.YALIDINE_API_ID && process.env.YALIDINE_API_TOKEN);

class ErreurYalidine extends Error {
  constructor(message, code = "YALIDINE_INDISPONIBLE") {
    super(message);
    this.code = code;
  }
}

// Lecture des quotas retournés après chaque appel. Le document officiel nomme
// les en-têtes x-second-quota-left… mais l'API (domaine Guepex) les renvoie
// sans préfixe : on accepte les deux formes (testé 23/11/2026).
const lireQuotas = (entetes) => {
  const lire = (nom) => {
    const brut = entetes.get(`x-${nom}`) ?? entetes.get(nom);
    if (brut === null || brut === undefined) return null;
    const valeur = parseInt(brut, 10);
    return Number.isFinite(valeur) ? valeur : null;
  };
  return {
    seconde: lire("second-quota-left"),
    minute: lire("minute-quota-left"),
    heure: lire("hour-quota-left"),
    jour: lire("day-quota-left"),
  };
};

const avertirQuotasBas = (quotas, contexte) => {
  for (const [fenetre, restant] of Object.entries(quotas)) {
    const seuil = SEUILS_ALERTE_QUOTA[fenetre];
    if (typeof restant === "number" && typeof seuil === "number" && restant <= seuil) {
      console.warn(
        `Yalidine : quota ${fenetre} bas (${restant} restants) — ${contexte}`,
      );
    }
  }
};

// Retry-After accepte les deux formes HTTP : secondes (entier) ou date au
// format RFC 1123. Renvoie null si absent ou illisible.
const lireRetryApres = (entetes) => {
  const brut = entetes.get("retry-after");
  if (!brut) return null;
  const secondes = parseInt(brut, 10);
  if (Number.isFinite(secondes)) return secondes;
  const date = Date.parse(brut);
  if (Number.isFinite(date)) {
    return Math.max(0, Math.ceil((date - Date.now()) / 1000));
  }
  return null;
};

const appelerUneFois = async (chemin, options) => {
  await reserverRequete();
  const controleur = new AbortController();
  const delai = setTimeout(() => controleur.abort(), TIMEOUT_MS);
  try {
    const reponse = await fetch(`${BASE_URL}/${chemin}`, {
      ...options,
      signal: controleur.signal,
      headers: {
        "X-API-ID": process.env.YALIDINE_API_ID,
        "X-API-TOKEN": process.env.YALIDINE_API_TOKEN,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const corps = await reponse.json().catch(() => null);
    return { reponse, corps };
  } finally {
    clearTimeout(delai);
  }
};

/**
 * Appel HTTP vers l'API Yalidine/Guepex avec gestion des erreurs :
 * - 429 : attente des secondes indiquées par Retry-After puis UN seul nouvel
 *   essai (au-delà de 60 s d'attente, échec immédiat avec un message clair) ;
 * - 5xx / délai dépassé / erreur réseau : nouvel essai avec backoff
 *   exponentiel 1 s, 2 s, 4 s (3 essais au total) ;
 * - les autres 4xx sont des erreurs de données : échec immédiat, jamais de
 *   nouvel essai (401 => code YALIDINE_AUTH).
 * Les quotas restants sont lus après chaque appel et un avertissement est
 * émis sous 20 % restants. Aucun secret n'est journalisé.
 */
const appeler = async (chemin, options = {}, profondeur = 0) => {
  if (!estConfigure()) {
    throw new ErreurYalidine("Identifiants Yalidine non configurés.");
  }
  let reponse;
  let corps;
  try {
    ({ reponse, corps } = await appelerUneFois(chemin, options));
  } catch (erreur) {
    const delaiDepasse = erreur.name === "AbortError";
    if (profondeur < ESSAIS_MAX_5XX - 1) {
      await attendre(1000 * 2 ** profondeur);
      return appeler(chemin, options, profondeur + 1);
    }
    throw new ErreurYalidine(
      delaiDepasse
        ? "Délai dépassé pour joindre Yalidine."
        : `Impossible de joindre Yalidine : ${erreur.message}`,
    );
  }

  avertirQuotasBas(lireQuotas(reponse.headers), chemin);

  if (reponse.ok) {
    return corps;
  }

  const statut = reponse.status;
  const messageDistant = corps?.error?.message || null;

  if (statut === 429) {
    const retryApres = lireRetryApres(reponse.headers);
    if (
      profondeur === 0 &&
      retryApres !== null &&
      retryApres >= 0 &&
      retryApres <= RETRY_AFTER_MAX_S
    ) {
      console.warn(
        `Yalidine 429 sur ${chemin} — attente de ${retryApres}s (Retry-After) puis nouvel essai.`,
      );
      await attendre(retryApres * 1000 + 250);
      return appeler(chemin, options, profondeur + 1);
    }
    throw new ErreurYalidine(
      retryApres !== null && retryApres > RETRY_AFTER_MAX_S
        ? `Quota Yalidine dépassé : nouvel essai possible dans ${retryApres}s.`
        : "Quota Yalidine dépassé (429). Réessayer plus tard.",
      "YALIDINE_QUOTA",
    );
  }

  if (statut >= 500) {
    if (profondeur < ESSAIS_MAX_5XX - 1) {
      await attendre(1000 * 2 ** profondeur);
      return appeler(chemin, options, profondeur + 1);
    }
    throw new ErreurYalidine(
      messageDistant || `Yalidine a répondu ${statut}.`,
      "YALIDINE_INDISPONIBLE",
    );
  }

  // 4xx hors 429 : données invalides ou identifiants — ne jamais réessayer.
  throw new ErreurYalidine(
    messageDistant || `Yalidine a répondu ${statut}.`,
    statut === 401 ? "YALIDINE_AUTH" : "YALIDINE_ERREUR",
  );
};

const normaliserLieu = (element) => ({
  id: element.id,
  nom: element.name || element.nom || element.commune_name || element.wilaya_name,
  code: element.id,
});

export const getWilayas = async () => {
  const enCache = lireCache("wilayas", 6 * 60 * 60 * 1000);
  if (enCache) return enCache;
  const corps = await appeler("wilayas/?page_size=1000");
  const wilayas = (corps?.data || [])
    .filter((w) => w.is_deliverable !== 0)
    .map(normaliserLieu);
  ecrireCache("wilayas", wilayas);
  return wilayas;
};

export const getCommunes = async (codeWilaya) => {
  const cle = `communes:${codeWilaya}`;
  const enCache = lireCache(cle, 6 * 60 * 60 * 1000);
  if (enCache) return enCache;
  const corps = await appeler(
    `communes/?wilaya_id=${codeWilaya}&page_size=1000`,
  );
  const communes = (corps?.data || [])
    .filter((c) => c.is_deliverable !== 0)
    .map(normaliserLieu);
  ecrireCache(cle, communes);
  return communes;
};

export const getCentres = async (codeWilaya, idCommune) => {
  const cle = `centres:${codeWilaya}:${idCommune || ""}`;
  const enCache = lireCache(cle, 6 * 60 * 60 * 1000);
  if (enCache) return enCache;
  const requete = idCommune
    ? `centers/?wilaya_id=${codeWilaya}&commune_id=${idCommune}`
    : `centers/?wilaya_id=${codeWilaya}`;
  const corps = await appeler(requete);
  const centres = (corps?.data || []).map((c) => ({
    id: c.center_id,
    nom: c.name,
    adresse: c.address || null,
    commune_id: c.commune_id,
    wilaya_id: c.wilaya_id,
  }));
  ecrireCache(cle, centres);
  return centres;
};

export const getFrais = async ({
  versWilayaId,
  versCommuneId,
  estBureau,
  poidsKg = 0,
}) => {
  const origine = process.env.YALIDINE_FROM_WILAYA
    ? parseInt(process.env.YALIDINE_FROM_WILAYA, 10)
    : null;
  if (!origine) {
    throw new ErreurYalidine("Wilaya d'origine Yalidine non configurée.");
  }
  const cle = `frais:${origine}:${versWilayaId}:${versCommuneId || ""}:${estBureau}:${poidsKg}`;
  const enCache = lireCache(cle, 60 * 60 * 1000);
  if (enCache) return enCache;
  const corps = await appeler(
    `fees/?from_wilaya_id=${origine}&to_wilaya_id=${versWilayaId}`,
  );
  const entree = versCommuneId
    ? corps?.per_commune?.[String(versCommuneId)]
    : Object.values(corps?.per_commune || {})[0];
  if (!entree) {
    throw new ErreurYalidine("Aucun tarif Yalidine pour cette destination.");
  }
  let frais = parseFloat(
    estBureau
      ? (entree.express_desk ?? entree.express_stopdesk)
      : entree.express_home,
  );
  if (Number.isNaN(frais)) {
    throw new ErreurYalidine("Aucun tarif Yalidine pour ce mode de livraison.");
  }
  // `poidsKg` est le poids FACTURÉ (max(poids réel, poids volumétrique
  // L×l×h/5000), calculé par l'appelant à partir des dimensions produit —
  // voir calculerPoidsFactureKg dans config/utils.js et boutiqueController).
  // Le supplément surpoids utilise donc ce poids facturé, pas le poids réel :
  // un colis léger mais volumineux est facturé sur son volume.
  //
  // Formule COD tranchée par le test réel du 23/11/2026 (colis yal-WP21ZX,
  // 15 -> 15, price/declared_value 2373, freeshipping) : delivery_fee renvoyé
  // par l'API = frais de base exactement (540 = express_home intra-wilaya),
  // soit une part COD nulle. La formule (a) cod_percentage × max(price,
  // declared_value) donne aussi 0 sur ce compte (cod_percentage = 0 dans
  // /fees) ; la formule (b) taxe_percentage × price / 100 n'est pas évaluable
  // via /fees (champs absents). Le prix facturé au client reste donc
  // base + surpoids, sans composante COD ajoutée.
  const supplementSurpoids = parseFloat(corps?.oversize_fee);
  if (poidsKg > 5 && Number.isFinite(supplementSurpoids)) {
    // Référence officielle : supplément = (facturable − 5) × oversize_fee,
    // sans arrondi au kg supérieur (corrigé 23/11/2026).
    frais += (poidsKg - 5) * supplementSurpoids;
  }
  const resultat = {
    prix: Math.round(frais * 100) / 100,
    retour: corps?.retour_fee ? parseFloat(corps.retour_fee) : null,
    source: "yalidine",
  };
  ecrireCache(cle, resultat);
  return resultat;
};

export const creerColis = async (colis) => {
  const corps = await appeler("parcels/", {
    method: "POST",
    body: JSON.stringify([colis]),
  });
  const resultat = corps?.[colis.order_id];
  if (!resultat?.success) {
    throw new ErreurYalidine(
      resultat?.message || "Yalidine a refusé la création du colis.",
      "YALIDINE_REFUS",
    );
  }
  return { tracking: resultat.tracking, label: resultat.label || null };
};

export const suivreColis = async (tracking) => {
  const corps = await appeler(`parcels/${encodeURIComponent(tracking)}`);
  const colis = (corps?.data || [])[0];
  if (!colis) {
    throw new ErreurYalidine("Colis introuvable chez Yalidine.");
  }
  return {
    tracking: colis.tracking,
    statut: colis.last_status || null,
    label: colis.label || null,
    // Statut de paiement Yalidine (not-ready/ready/receivable/payed) :
    // donnée utile à l'admin, jamais écrite en base par ce lecteur.
    paiement: colis.payment_status || null,
  };
};

/**
 * Historique d'un colis : GET /v1/histories/:tracking, en suivant links.next
 * tant que has_more est vrai (l'ordre d'arrivée n'est pas garanti). Renvoie
 * les événements triés par date_status croissant, avec uniquement des données
 * non personnelles (statut, motif, lieu) — jamais de nom/téléphone/adresse
 * (données masquées par l'API en lecture). Les statuts inconnus futurs sont
 * renvoyés tels quels.
 */
export const getHistorique = async (tracking) => {
  const evenements = [];
  const urlsVisitees = new Set();
  let chemin = `histories/${encodeURIComponent(tracking)}`;
  for (let page = 0; page < PAGES_HISTORIQUE_MAX; page++) {
    if (urlsVisitees.has(chemin)) break;
    urlsVisitees.add(chemin);
    const corps = await appeler(chemin);
    const donnees = Array.isArray(corps?.data)
      ? corps.data
      : Array.isArray(corps)
        ? corps
        : [];
    for (const evenement of donnees) {
      evenements.push({
        date_status: evenement.date_status ?? null,
        status: evenement.status ?? null,
        reason: evenement.reason ?? null,
        center_name: evenement.center_name ?? null,
        wilaya_name: evenement.wilaya_name ?? null,
        commune_name: evenement.commune_name ?? null,
      });
    }
    const suivant = corps?.links?.next;
    if (!corps?.has_more || !suivant) break;
    // links.next peut être une URL absolue ou relative ; en cas de lien
    // illisible on conserve l'historique déjà récupéré plutôt que d'échouer.
    let relatif = null;
    try {
      const url = new URL(suivant, `${BASE_URL}/`);
      const prefixe = url.pathname.startsWith("/v1/")
        ? url.pathname.slice(4)
        : url.pathname.replace(/^\//, "");
      relatif = `${prefixe}${url.search}`;
    } catch (erreur) {
      console.warn(
        `Yalidine : links.next illisible (${suivant}) — historique partiel conservé.`,
      );
      break;
    }
    if (!relatif || urlsVisitees.has(relatif)) break;
    chemin = relatif;
  }
  evenements.sort((a, b) =>
    String(a.date_status ?? "").localeCompare(String(b.date_status ?? "")),
  );
  return evenements;
};

// Un colis n'est modifiable / supprimable que tant que last_status vaut
// « En préparation » (documentation officielle). Au-delà, PATCH/DELETE
// échouent côté API : c'est un état normal, pas un bug — on le refuse en
// amont avec un message clair (code YALIDINE_NON_MODIFIABLE).
const verifierModifiable = async (tracking) => {
  const corps = await appeler(`parcels/${encodeURIComponent(tracking)}`);
  const colis = (corps?.data || [])[0];
  if (!colis) {
    throw new ErreurYalidine(
      "Colis introuvable chez Yalidine.",
      "YALIDINE_INTROUVABLE",
    );
  }
  if (colis.last_status !== "En préparation") {
    throw new ErreurYalidine(
      `Colis non modifiable : statut actuel « ${colis.last_status} ». Un colis n'est modifiable que tant qu'il est « En préparation » chez Yalidine.`,
      "YALIDINE_NON_MODIFIABLE",
    );
  }
  return colis;
};

/**
 * PATCH d'un colis. La réponse de l'API masque les données personnelles
 * (nom, téléphone, adresse) : la fonction n'expose AUCUNE valeur de la
 * réponse — elle applique les changements et confirme seulement.
 */
export const modifierColis = async (tracking, donnees) => {
  await verifierModifiable(tracking);
  await appeler(`parcels/${encodeURIComponent(tracking)}`, {
    method: "PATCH",
    body: JSON.stringify(donnees),
  });
  return { applique: true };
};

/** DELETE d'un colis, avec la même garde « En préparation ». */
export const supprimerColis = async (tracking) => {
  await verifierModifiable(tracking);
  return appeler(`parcels/${encodeURIComponent(tracking)}`, {
    method: "DELETE",
  });
};

const decouperNom = (nomComplet) => {
  const parties = nomComplet.trim().split(/\s+/);
  if (parties.length === 1) return { firstname: parties[0], familyname: parties[0] };
  return {
    firstname: parties[0],
    familyname: parties.slice(1).join(" "),
  };
};

export const creerColisDepuisCommande = async (commande, lignes) => {
  const { firstname, familyname } = decouperNom(commande.nom_client);
  const origine = process.env.YALIDINE_FROM_WILAYA
    ? parseInt(process.env.YALIDINE_FROM_WILAYA, 10)
    : null;
  if (!origine) {
    throw new ErreurYalidine("Wilaya d'origine Yalidine non configurée.");
  }
  // Poids : AUCUN repli en dur. Un produit sans poids bloque la création
  // du colis avec une erreur explicite à l'admin (décision coordinateur
  // 23/11/2026) — jamais de colis créé avec un poids inventé.
  for (const ligne of lignes || []) {
    if (ligne.poids_grammes === null || ligne.poids_grammes === undefined) {
      throw new ErreurYalidine(
        `Poids manquant pour le produit « ${ligne.designation_facturee || "sans désignation"} » : renseignez le poids avant de créer le colis.`,
        "POIDS_MANQUANT",
      );
    }
  }
  // Poids facturé total (kg) = Σ max(poids réel, poids volumétrique) × quantité.
  const poidsFactureKg = (lignes || []).reduce(
    (total, ligne) =>
      total +
      calculerPoidsFactureKg(
        ligne.poids_grammes,
        ligne.longueur_cm,
        ligne.largeur_cm,
        ligne.hauteur_cm,
      ) *
        ligne.quantite,
    0,
  );
  // Dimensions envoyées : boîte englobante — plus grande longueur / largeur,
  // hauteurs empilées (× quantité). 0 si aucune dimension en base.
  const longueurColis = Math.max(
    0,
    ...(lignes || []).map((ligne) => ligne.longueur_cm || 0),
  );
  const largeurColis = Math.max(
    0,
    ...(lignes || []).map((ligne) => ligne.largeur_cm || 0),
  );
  const hauteurColis = (lignes || []).reduce(
    (total, ligne) => total + (ligne.hauteur_cm || 0) * ligne.quantite,
    0,
  );
  const colis = {
    order_id: `PT-${commande.id_cmd_web}`,
    firstname,
    familyname,
    contact_phone: commande.telephone,
    address: commande.adresse_exacte || commande.commune,
    from_wilaya_name: nomWilaya(origine),
    to_wilaya_name: commande.wilaya,
    to_commune_name: commande.commune,
    product_list: (lignes || [])
      .map((ligne) => `${ligne.designation_facturee} x${ligne.quantite}`)
      .join(", "),
    price: parseFloat(commande.montant_total_final),
    declared_value: parseFloat(commande.montant_total_final),
    do_insurance: false,
    freeshipping: true,
    has_exchange: false,
    weight: Math.ceil(poidsFactureKg),
    length: longueurColis,
    width: largeurColis,
    height: hauteurColis,
    is_stopdesk: commande.type_livraison === "BUREAU",
  };
  if (
    commande.type_livraison === "BUREAU" &&
    commande.bureau_livraison &&
    /^\d+$/.test(String(commande.bureau_livraison).trim())
  ) {
    colis.stopdesk_id = parseInt(commande.bureau_livraison, 10);
  }
  return creerColis(colis);
};
