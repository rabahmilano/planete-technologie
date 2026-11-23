// Tests unitaires du client Yalidine — fetch entièrement mocké : aucun appel
// réseau réel, aucun secret réel (identifiants factices).
import { jest, expect, describe, it, beforeEach, afterEach } from '@jest/globals';
import * as yalidine from '../config/yalidine.js';

const reponseMock = ({ status = 200, corps = null, entetes = {} }) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => corps,
  headers: { get: nom => entetes[nom.toLowerCase()] ?? null },
});

beforeEach(() => {
  process.env.YALIDINE_API_ID = 'id-test';
  process.env.YALIDINE_API_TOKEN = 'token-test';
  process.env.YALIDINE_FROM_WILAYA = '15';
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('estConfigure', () => {
  it('est faux sans identifiants, vrai avec', () => {
    const sauvegardeId = process.env.YALIDINE_API_ID;
    const sauvegardeToken = process.env.YALIDINE_API_TOKEN;
    delete process.env.YALIDINE_API_ID;
    delete process.env.YALIDINE_API_TOKEN;
    expect(yalidine.estConfigure()).toBe(false);
    process.env.YALIDINE_API_ID = 'id-test';
    process.env.YALIDINE_API_TOKEN = 'token-test';
    expect(yalidine.estConfigure()).toBe(true);
    expect(Boolean(sauvegardeId)).toBe(true);
    expect(Boolean(sauvegardeToken)).toBe(true);
  });
});

describe('appeler — gestion des erreurs', () => {
  it('429 + Retry-After : attend puis retente une fois avec succès', async () => {
    global.fetch
      .mockResolvedValueOnce(
        reponseMock({ status: 429, corps: null, entetes: { 'retry-after': '0' } }),
      )
      .mockResolvedValueOnce(reponseMock({ corps: { data: [], has_more: false } }));

    const evenements = await yalidine.getHistorique('yal-TEST');

    expect(evenements).toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('429 répété : échec clair après un seul nouvel essai', async () => {
    global.fetch.mockResolvedValue(
      reponseMock({ status: 429, corps: null, entetes: { 'retry-after': '0' } }),
    );

    await expect(yalidine.getHistorique('yal-TEST')).rejects.toMatchObject({
      code: 'YALIDINE_QUOTA',
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('4xx : échec immédiat sans nouvelle tentative', async () => {
    global.fetch.mockResolvedValue(
      reponseMock({ status: 400, corps: { error: { message: 'données invalides' } } }),
    );

    await expect(yalidine.getHistorique('yal-TEST')).rejects.toMatchObject({
      code: 'YALIDINE_ERREUR',
      message: 'données invalides',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('401 : code YALIDINE_AUTH', async () => {
    global.fetch.mockResolvedValue(
      reponseMock({ status: 401, corps: { error: { message: 'API ID and/or Token are wrong' } } }),
    );

    await expect(yalidine.getHistorique('yal-TEST')).rejects.toMatchObject({
      code: 'YALIDINE_AUTH',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('5xx : backoff exponentiel puis succès', async () => {
    global.fetch
      .mockResolvedValueOnce(reponseMock({ status: 500, corps: null }))
      .mockResolvedValueOnce(reponseMock({ status: 500, corps: null }))
      .mockResolvedValueOnce(
        reponseMock({
          corps: {
            data: [{ date_status: '2026-11-23 10:00:00', status: 'Ramassé' }],
            has_more: false,
          },
        }),
      );

    const evenements = await yalidine.getHistorique('yal-TEST');

    expect(evenements.map(e => e.status)).toEqual(['Ramassé']);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('5xx persistant : échec après 3 essais maximum', async () => {
    global.fetch.mockResolvedValue(reponseMock({ status: 502, corps: null }));

    await expect(yalidine.getHistorique('yal-TEST')).rejects.toMatchObject({
      code: 'YALIDINE_INDISPONIBLE',
    });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});

describe('getHistorique', () => {
  it('suit links.next, trie par date_status croissant et filtre les données personnelles', async () => {
    const ev2 = {
      date_status: '2026-11-23 09:00:00',
      status: 'En préparation',
      reason: null,
      center_name: null,
      wilaya_name: 'Tizi Ouzou',
      commune_name: null,
      // Champs personnels masqués par l'API : doivent être absents du résultat.
      firstname: 'T***',
      contact_phone: '05**',
      address: 'A***',
    };
    const ev1 = { date_status: '2026-11-23 08:00:00', status: 'En préparation' };

    global.fetch
      .mockResolvedValueOnce(
        reponseMock({
          corps: {
            data: [ev2],
            has_more: true,
            links: { next: 'https://api.yalidine.app/v1/histories/?tracking=yal-TEST&page=2' },
          },
        }),
      )
      .mockResolvedValueOnce(reponseMock({ corps: { data: [ev1], has_more: false } }));

    const evenements = await yalidine.getHistorique('yal-TEST');

    expect(evenements.map(e => e.date_status)).toEqual([
      '2026-11-23 08:00:00',
      '2026-11-23 09:00:00',
    ]);
    expect(Object.keys(evenements[1]).sort()).toEqual([
      'center_name',
      'commune_name',
      'date_status',
      'reason',
      'status',
      'wilaya_name',
    ]);
    expect(evenements[1].firstname).toBeUndefined();
    expect(
      global.fetch.mock.calls[1][0].endsWith('/v1/histories/?tracking=yal-TEST&page=2'),
    ).toBe(true);
  });

  it('tolère un links.next relatif', async () => {
    global.fetch
      .mockResolvedValueOnce(
        reponseMock({
          corps: {
            data: [{ date_status: '2026-11-23 08:00:00', status: 'A' }],
            has_more: true,
            links: { next: '/v1/histories/?tracking=yal-TEST&page=2' },
          },
        }),
      )
      .mockResolvedValueOnce(
        reponseMock({ corps: { data: [{ date_status: '2026-11-23 09:00:00', status: 'B' }], has_more: false } }),
      );

    const evenements = await yalidine.getHistorique('yal-TEST');

    expect(evenements.map(e => e.status)).toEqual(['A', 'B']);
    expect(
      global.fetch.mock.calls[1][0].endsWith('/v1/histories/?tracking=yal-TEST&page=2'),
    ).toBe(true);
  });

  it('links.next malformé : historique partiel conservé sans lever', async () => {
    global.fetch.mockResolvedValueOnce(
      reponseMock({
        corps: {
          data: [{ date_status: '2026-11-23 08:00:00', status: 'A' }],
          has_more: true,
          links: { next: 'http://%%' },
        },
      }),
    );

    const evenements = await yalidine.getHistorique('yal-TEST');

    expect(evenements.map(e => e.status)).toEqual(['A']);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('tolère les statuts inconnus futurs tels quels', async () => {
    global.fetch.mockResolvedValue(
      reponseMock({
        corps: {
          data: [{ date_status: '2027-01-01 00:00:00', status: 'Statut futur inconnu' }],
          has_more: false,
        },
      }),
    );

    const evenements = await yalidine.getHistorique('yal-TEST');

    expect(evenements[0].status).toBe('Statut futur inconnu');
  });
});

describe('garde « En préparation » (PATCH / DELETE)', () => {
  it('modifierColis : refuse hors « En préparation » et n’appelle jamais PATCH', async () => {
    global.fetch.mockResolvedValueOnce(
      reponseMock({
        corps: { data: [{ tracking: 'yal-TEST', last_status: 'Ramassé', firstname: 'T***' }] },
      }),
    );

    await expect(yalidine.modifierColis('yal-TEST', { weight: 2 })).rejects.toMatchObject({
      code: 'YALIDINE_NON_MODIFIABLE',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('supprimerColis : accepte tant que le colis est « En préparation »', async () => {
    global.fetch
      .mockResolvedValueOnce(
        reponseMock({ corps: { data: [{ tracking: 'yal-TEST', last_status: 'En préparation' }] } }),
      )
      .mockResolvedValueOnce(reponseMock({ corps: { 'yal-TEST': { deleted: true } } }));

    const resultat = await yalidine.supprimerColis('yal-TEST');

    expect(resultat['yal-TEST'].deleted).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][0]).toContain('/parcels/yal-TEST');
  });
});

describe('getFrais', () => {
  it('surpoids = (facturable − 5) × oversize_fee, sans arrondi au kg supérieur', async () => {
    global.fetch.mockResolvedValueOnce(
      reponseMock({
        corps: {
          zone: 1,
          retour_fee: 0,
          oversize_fee: '100.00',
          per_commune: { '16': { express_home: 650, express_desk: 500 } },
        },
      }),
    );

    const devis = await yalidine.getFrais({
      versWilayaId: 16,
      versCommuneId: null,
      estBureau: false,
      poidsKg: 6.5,
    });

    // 650 + 1.5 × 100 = 800 (l'ancien code avec Math.ceil aurait donné 850).
    expect(devis.prix).toBe(800);
    expect(devis.source).toBe('yalidine');
  });
});

describe('suivreColis', () => {
  it('n’expose que tracking / statut / label / paiement, jamais les données personnelles', async () => {
    global.fetch.mockResolvedValueOnce(
      reponseMock({
        corps: {
          data: [
            {
              tracking: 'yal-TEST',
              last_status: 'Expédié',
              label: 'https://exemple.app/bordereau.php?tracking=yal-TEST',
              payment_status: 'not-ready',
              firstname: 'T***',
              contact_phone: '05**',
              address: 'A***',
            },
          ],
        },
      }),
    );

    const suivi = await yalidine.suivreColis('yal-TEST');

    expect(suivi).toEqual({
      tracking: 'yal-TEST',
      statut: 'Expédié',
      label: 'https://exemple.app/bordereau.php?tracking=yal-TEST',
      paiement: 'not-ready',
    });
  });
});

describe('creerColisDepuisCommande — poids facturé et dimensions', () => {
  const commande = {
    id_cmd_web: 1,
    nom_client: 'Jean Dupont',
    telephone: '0550000000',
    adresse_exacte: 'Rue test',
    wilaya: 'Tizi Ouzou',
    commune: 'Tizi Ouzou',
    montant_total_final: 3000,
    type_livraison: 'DOMICILE',
  };

  it('poids null : bloque sans appeler Yalidine, erreur explicite en français', async () => {
    await expect(
      yalidine.creerColisDepuisCommande(commande, [
        { designation_facturee: 'Chargeur test', quantite: 1, poids_grammes: null },
      ]),
    ).rejects.toMatchObject({
      code: 'POIDS_MANQUANT',
      message: expect.stringContaining('Poids manquant pour le produit'),
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('poids volumétrique > poids réel : weight = volumétrique, vraies dimensions envoyées', async () => {
    global.fetch.mockResolvedValueOnce(
      reponseMock({ corps: { 'PT-1': { success: true, tracking: 'yal-TEST', label: null } } }),
    );

    const resultat = await yalidine.creerColisDepuisCommande(commande, [
      {
        designation_facturee: 'Carton test',
        quantite: 1,
        poids_grammes: 1000,
        longueur_cm: 50,
        largeur_cm: 40,
        hauteur_cm: 30,
      },
    ]);

    expect(resultat.tracking).toBe('yal-TEST');
    const envoye = JSON.parse(global.fetch.mock.calls[0][1].body)[0];
    // Volumétrique 50×40×30/5000 = 12 kg > réel 1 kg → facturé 12 kg.
    expect(envoye.weight).toBe(12);
    expect(envoye.length).toBe(50);
    expect(envoye.width).toBe(40);
    expect(envoye.height).toBe(30);
  });

  it('plusieurs lignes : poids facturés additionnés, boîte englobante envoyée', async () => {
    global.fetch.mockResolvedValueOnce(
      reponseMock({ corps: { 'PT-1': { success: true, tracking: 'yal-TEST', label: null } } }),
    );

    await yalidine.creerColisDepuisCommande(commande, [
      {
        designation_facturee: 'Petit carton',
        quantite: 2,
        poids_grammes: 1000,
        longueur_cm: 10,
        largeur_cm: 10,
        hauteur_cm: 10,
      },
      { designation_facturee: 'Produit lourd', quantite: 1, poids_grammes: 2000 },
    ]);

    const envoye = JSON.parse(global.fetch.mock.calls[0][1].body)[0];
    // Ligne 1 : max(1 kg, 0,2 kg) × 2 = 2 kg ; ligne 2 : 2 kg → total 4 kg.
    expect(envoye.weight).toBe(4);
    expect(envoye.length).toBe(10);
    expect(envoye.width).toBe(10);
    expect(envoye.height).toBe(20);
  });
});

describe('getFrais — supplément surpoids sur le poids facturé', () => {
  it('colis léger mais volumineux : surpoids calculé sur 12 kg facturés, pas 1 kg réel', async () => {
    global.fetch.mockResolvedValueOnce(
      reponseMock({
        corps: {
          zone: 1,
          retour_fee: 0,
          oversize_fee: '100.00',
          per_commune: { '16': { express_home: 650, express_desk: 500 } },
        },
      }),
    );

    const devis = await yalidine.getFrais({
      versWilayaId: 16,
      versCommuneId: null,
      estBureau: false,
      poidsKg: 12,
    });

    // 650 + (12 − 5) × 100 = 1350.
    expect(devis.prix).toBe(1350);
  });
});

describe('limiteur client', () => {
  it('départ limité à 5 requêtes par seconde glissante', async () => {
    global.fetch.mockResolvedValue(reponseMock({ corps: { data: [], has_more: false } }));

    const debut = Date.now();
    await Promise.all(Array.from({ length: 6 }, () => yalidine.getHistorique('yal-TEST')));
    const duree = Date.now() - debut;

    // 5 appels immédiats + 1 différé d'environ 1 s.
    expect(duree).toBeGreaterThanOrEqual(900);
    expect(global.fetch).toHaveBeenCalledTimes(6);
  });
});
