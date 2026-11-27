// Tests unitaires du module de synchro tarifaire (phase 4).
// fetch entièrement mocké (aucun appel réseau réel, aucun secret réel) ;
// l'écriture passe par la BDD de test locale avec des identifiants fantômes
// (wilaya 900, communes 900001+, bureaux 900100+) jamais en conflit avec les
// données réelles (wilayas 1-58, ids Yalidine réels), nettoyés à chaque test.
import "dotenv/config";
import { jest, expect, describe, it, beforeEach, afterEach, afterAll } from '@jest/globals';
import prisma from '../config/dbConfig.js';
import {
  synchroniserWilaya,
  synchroniserGlobale,
  estSynchronisationEnCours,
  getJournalSynchronisation,
} from '../config/syncTarifs.js';

const CODE_TEST = 900;
const COMMUNE_A = 900001;
const COMMUNE_B = 900002;
const BUREAU_A = 900100;

const communeAPI = (id, nom, extra = {}) => ({
  id,
  name: nom,
  wilaya_id: CODE_TEST,
  wilaya_name: 'Wilaya Test',
  has_stop_desk: extra.bureau ? 1 : 0,
  is_deliverable: extra.nonLivrable ? 0 : 1,
  delivery_time_parcel: 5,
  delivery_time_payment: 3,
});

const corpsFees = (idsCommunes) => ({
  from_wilaya_name: 'Tizi Ouzou',
  to_wilaya_name: 'Wilaya Test',
  zone: 1,
  retour_fee: 0,
  oversize_fee: 100,
  per_commune: Object.fromEntries(
    idsCommunes.map((id, rang) => [
      String(id),
      {
        commune_id: id,
        commune_name: rang === 0 ? 'Test Nord' : 'Test Sud',
        express_home: 650 + rang,
        express_desk: 500 + rang,
        economic_home: 500 + rang,
        economic_desk: 400 + rang,
      },
    ]),
  ),
});

// Réponses mockées selon la ressource demandée (style config/yalidine.js :
// chemins relatifs type « communes/?wilaya_id=900&page_size=1000 »).
const reponses = { communes: [], centres: [], fees: corpsFees([]), wilayas: [] };
// L'implémentation est (re)posée dans beforeEach : jest.resetAllMocks() la
// supprimerait sinon pour les tests suivants.
const fetchMock = jest.fn();

const nettoyer = async () => {
  await prisma.bureau_livraison.deleteMany({
    where: { commune: { code_wilaya_commune: CODE_TEST } },
  });
  await prisma.commune_livraison.deleteMany({
    where: { code_wilaya_commune: CODE_TEST },
  });
};

beforeEach(async () => {
  process.env.YALIDINE_API_ID = 'id-test';
  process.env.YALIDINE_API_TOKEN = 'token-test';
  process.env.YALIDINE_FROM_WILAYA = '15';
  fetchMock.mockImplementation(async (url) => {
    const chemin = url.replace(/^https?:\/\/[^/]+\/v1\//, '');
    let corps = { has_more: false, data: [] };
    if (chemin.startsWith('communes/')) corps = { has_more: false, data: reponses.communes };
    else if (chemin.startsWith('centers/')) corps = { has_more: false, data: reponses.centres };
    else if (chemin.startsWith('wilayas/')) corps = { has_more: false, data: reponses.wilayas };
    else if (chemin.startsWith('fees/')) {
      const to = chemin.match(/to_wilaya_id=(\d+)/);
      if (reponses.feesErreur?.includes(parseInt(to?.[1], 10))) {
        return { ok: false, status: 500, json: async () => null, headers: { get: () => null } };
      }
      corps = reponses.fees;
    }
    return { ok: true, status: 200, json: async () => corps, headers: { get: () => null } };
  });
  global.fetch = fetchMock;
  reponses.communes = [];
  reponses.centres = [];
  reponses.fees = corpsFees([]);
  reponses.feesErreur = null;
  reponses.wilayas = [];
  await nettoyer();
});

afterEach(async () => {
  await nettoyer();
  jest.resetAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('synchroniserWilaya — écriture du périmètre d\'une wilaya', () => {
  it('écrit communes + bureaux avec tarifs, flags et date_synchro', async () => {
    reponses.communes = [
      communeAPI(COMMUNE_A, 'Test Nord', { bureau: true }),
      communeAPI(COMMUNE_B, 'Test Sud', { nonLivrable: true }),
    ];
    reponses.centres = [
      {
        center_id: BUREAU_A,
        name: 'Bureau Test',
        address: 'Rue de test',
        commune_id: COMMUNE_A,
        wilaya_id: CODE_TEST,
      },
    ];
    reponses.fees = corpsFees([COMMUNE_A, COMMUNE_B]);

    const resultat = await synchroniserWilaya(CODE_TEST, 'TEST');
    expect(resultat.ok).toBe(true);
    expect(resultat.communes_ecrites).toBe(2);
    expect(resultat.bureaux_ecrits).toBe(1);

    const [communeA, communeB] = await Promise.all([
      prisma.commune_livraison.findUnique({ where: { id_commune: COMMUNE_A } }),
      prisma.commune_livraison.findUnique({ where: { id_commune: COMMUNE_B } }),
    ]);
    expect(communeA.livrable).toBe(true);
    expect(communeA.a_bureau).toBe(true);
    expect(Number(communeA.express_home)).toBe(650);
    expect(Number(communeA.economic_desk)).toBe(400);
    expect(Number(communeA.retour_fee)).toBe(0);
    expect(Number(communeA.oversize_fee)).toBe(100);
    expect(communeA.date_synchro).not.toBeNull();
    // D4 : le stockage est par commune — chaque ligne porte SES tarifs.
    expect(Number(communeB.express_home)).toBe(651);
    expect(communeB.livrable).toBe(false);

    const bureau = await prisma.bureau_livraison.findUnique({
      where: { id_centre: BUREAU_A },
      include: { commune: true },
    });
    expect(bureau.nom_centre).toBe('Bureau Test');
    expect(bureau.commune.id_commune).toBe(COMMUNE_A);
  });

  it('purge les lignes disparues de l\'API (bureaux d\'abord, communes ensuite)', async () => {
    // 1re synchro : 2 communes + 1 bureau.
    reponses.communes = [
      communeAPI(COMMUNE_A, 'Test Nord', { bureau: true }),
      communeAPI(COMMUNE_B, 'Test Sud'),
    ];
    reponses.centres = [{ center_id: BUREAU_A, name: 'Bureau Test', address: null, commune_id: COMMUNE_A, wilaya_id: CODE_TEST }];
    reponses.fees = corpsFees([COMMUNE_A, COMMUNE_B]);
    await synchroniserWilaya(CODE_TEST, 'TEST');

    // 2e synchro : une seule commune, aucun bureau.
    reponses.communes = [communeAPI(COMMUNE_A, 'Test Nord')];
    reponses.centres = [];
    reponses.fees = corpsFees([COMMUNE_A]);
    const resultat = await synchroniserWilaya(CODE_TEST, 'TEST');
    expect(resultat.purge_communes).toBe(1);
    expect(resultat.purge_bureaux).toBe(1);

    expect(await prisma.commune_livraison.count({ where: { code_wilaya_commune: CODE_TEST } })).toBe(1);
    expect(await prisma.bureau_livraison.count({ where: { commune: { code_wilaya_commune: CODE_TEST } } })).toBe(0);
  });

  it('ne purge RIEN si l\'API renvoie une liste vide (garde-fou)', async () => {
    reponses.communes = [communeAPI(COMMUNE_A, 'Test Nord')];
    reponses.fees = corpsFees([COMMUNE_A]);
    await synchroniserWilaya(CODE_TEST, 'TEST');

    reponses.communes = [];
    reponses.centres = [];
    const resultat = await synchroniserWilaya(CODE_TEST, 'TEST');
    expect(resultat.communes_ecrites).toBe(0);
    expect(await prisma.commune_livraison.count({ where: { code_wilaya_commune: CODE_TEST } })).toBe(1);
  });

  it('échoue sans écrire si l\'appel fees échoue', async () => {
    reponses.communes = [communeAPI(COMMUNE_A, 'Test Nord')];
    reponses.centres = [];
    reponses.feesErreur = [CODE_TEST];
    await expect(synchroniserWilaya(CODE_TEST, 'TEST')).rejects.toThrow();
    expect(await prisma.commune_livraison.count({ where: { code_wilaya_commune: CODE_TEST } })).toBe(0);
    const entree = getJournalSynchronisation()[0];
    expect(entree.ok).toBe(false);
  });

  it('refuse deux synchronisations simultanées (verrou anti-concurrence)', async () => {
    reponses.communes = [communeAPI(COMMUNE_A, 'Test Nord')];
    reponses.fees = corpsFees([COMMUNE_A]);
    const premiere = synchroniserWilaya(CODE_TEST, 'TEST');
    await expect(synchroniserWilaya(CODE_TEST, 'TEST')).rejects.toThrow('SYNCHRO_DEJA_EN_COURS');
    await premiere;
    expect(estSynchronisationEnCours()).toBe(false);
  });
});

describe('synchroniserGlobale — wilayas en erreur conservées telles quelles', () => {
  it('n\'écrase pas les tarifs d\'une wilaya dont fees échoue', async () => {
    // Synchro par wilaya d'abord : la commune A existe en base avec ses tarifs.
    reponses.communes = [communeAPI(COMMUNE_A, 'Test Nord')];
    reponses.fees = corpsFees([COMMUNE_A]);
    await synchroniserWilaya(CODE_TEST, 'TEST');

    // Synchro globale : fees échoue pour la wilaya de test → commune non réécrite.
    reponses.wilayas = [{ id: CODE_TEST, name: 'Wilaya Test', is_deliverable: 1 }];
    reponses.feesErreur = [CODE_TEST];
    const resultat = await synchroniserGlobale('TEST');
    expect(resultat.ok).toBe(false);
    expect(resultat.wilayas_erreur.map((e) => e.wilaya)).toContain(CODE_TEST);

    const commune = await prisma.commune_livraison.findUnique({ where: { id_commune: COMMUNE_A } });
    expect(commune).not.toBeNull();
    expect(Number(commune.express_home)).toBe(650);
  });
});
