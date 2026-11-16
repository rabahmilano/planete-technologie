import { nomWilaya } from "./wilayas.js";

const BASE_URL = (
  process.env.YALIDINE_API_URL || "https://api.yalidine.app/v1"
).replace(/\/$/, "");
const TIMEOUT_MS = 15000;

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

export const estConfigure = () =>
  Boolean(process.env.YALIDINE_API_ID && process.env.YALIDINE_API_TOKEN);

class ErreurYalidine extends Error {
  constructor(message, code = "YALIDINE_INDISPONIBLE") {
    super(message);
    this.code = code;
  }
}

const appeler = async (chemin, options = {}) => {
  if (!estConfigure()) {
    throw new ErreurYalidine("Identifiants Yalidine non configurés.");
  }
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
    if (!reponse.ok) {
      const message =
        corps?.error?.message || `Yalidine a répondu ${reponse.status}.`;
      throw new ErreurYalidine(message, "YALIDINE_ERREUR");
    }
    return corps;
  } catch (erreur) {
    if (erreur instanceof ErreurYalidine) throw erreur;
    throw new ErreurYalidine(
      erreur.name === "AbortError"
        ? "Délai dépassé pour joindre Yalidine."
        : `Impossible de joindre Yalidine : ${erreur.message}`,
    );
  } finally {
    clearTimeout(delai);
  }
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
  if (poidsKg > 5 && corps?.oversize_fee) {
    frais += Math.ceil(poidsKg - 5) * parseFloat(corps.oversize_fee);
  }
  const resultat = {
    prix: frais,
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
  const corps = await appeler(`parcels/${tracking}`);
  const colis = (corps?.data || [])[0];
  if (!colis) {
    throw new ErreurYalidine("Colis introuvable chez Yalidine.");
  }
  return {
    tracking: colis.tracking,
    statut: colis.last_status || null,
    label: colis.label || null,
  };
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
  const poidsTotalGrammes = (lignes || []).reduce(
    (total, ligne) => total + (ligne.poids_grammes || 500) * ligne.quantite,
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
    weight: Math.ceil(poidsTotalGrammes / 1000),
    length: 0,
    width: 0,
    height: 0,
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
