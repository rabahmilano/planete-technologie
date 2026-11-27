// E2E — Phase 5 : référentiel des wilayas, détail par wilaya et bannière D7.
// Les appels API sont interceptés (page.route) : aucun appel Yalidine réel,
// aucun quota consommé. Vérifiés : bannière « dernière synchronisation »
// (état normal + alerte > 14 jours) sur la page tarifs ET commandes web,
// liste des wilayas avec comptages et tarifs uniformes, dialog de détail
// full-screen avec filtre « communes avec bureau », bouton de synchronisation
// par wilaya.
const { test, expect } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

const REPO = path.resolve(__dirname, '..', '..', '..')
const CAPTURES = path.join(REPO, 'frontend', 'test-results', 'captures-phase5')

// Les requêtes mockées partent en cross-origin (dashboard → backend 3001) :
// le navigateur exige un preflight OPTIONS avec les en-têtes CORS et ces
// en-têtes SUR chaque réponse (voir synchronisation-tarifs.spec.js).
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}
const repondre = (route, corps, statut = 200) =>
  route.request().method() === 'OPTIONS'
    ? route.fulfill({ status: 204, headers: CORS })
    : route.fulfill({
        status: statut,
        contentType: 'application/json',
        headers: CORS,
        body: JSON.stringify(corps),
      })

const BANNIERE_OK = {
  date_derniere_synchro: '2026-11-27T19:27:47.423Z',
  jours_ecoules: 0,
  seuil_alerte_jours: 14,
  alerte: false,
}
const BANNIERE_ALERTE = {
  date_derniere_synchro: '2026-11-13T19:27:47.423Z',
  jours_ecoules: 14,
  seuil_alerte_jours: 14,
  alerte: true,
}

const REFERENCEL = {
  wilayas: [
    {
      code_wilaya: 15,
      nom_wilaya: 'Tizi Ouzou',
      livrable: true,
      nb_communes: 67,
      nb_communes_bureau: 8,
      nb_bureaux: 9,
      date_synchro: '2026-11-27T19:27:47.423Z',
      delai_livraison_jours: 5,
      tarifs_uniformes: [540, 400, 450, 350],
      oversize_fee: '100',
      retour_fee: '0',
    },
    {
      code_wilaya: 16,
      nom_wilaya: 'Alger',
      livrable: true,
      nb_communes: 57,
      nb_communes_bureau: 22,
      nb_bureaux: 25,
      date_synchro: '2026-11-27T19:27:47.423Z',
      delai_livraison_jours: 5,
      tarifs_uniformes: [650, 500, 500, 400],
      oversize_fee: '100',
      retour_fee: '0',
    },
  ],
}

const COMMUNES_16 = {
  wilaya: 16,
  communes: [
    {
      id_commune: 1601,
      nom_commune: 'Alger Centre',
      nom_wilaya_commune: 'Alger',
      livrable: true,
      a_bureau: true,
      delai_livraison_jours: 5,
      delai_paiement_jours: 2,
      express_home: '650',
      express_desk: '500',
      economic_home: '500',
      economic_desk: '400',
      retour_fee: '0',
      oversize_fee: '100',
      date_synchro: '2026-11-27T19:27:47.423Z',
      _count: { bureaux: 2 },
    },
    {
      id_commune: 1602,
      nom_commune: 'Aïn Benian',
      nom_wilaya_commune: 'Alger',
      livrable: true,
      a_bureau: true,
      delai_livraison_jours: 5,
      delai_paiement_jours: 2,
      express_home: '650',
      express_desk: '500',
      economic_home: '500',
      economic_desk: '400',
      retour_fee: '0',
      oversize_fee: '100',
      date_synchro: '2026-11-27T19:27:47.423Z',
      _count: { bureaux: 1 },
    },
    {
      id_commune: 1603,
      nom_commune: 'Aïn Taya',
      nom_wilaya_commune: 'Alger',
      livrable: false,
      a_bureau: false,
      delai_livraison_jours: 5,
      delai_paiement_jours: 2,
      express_home: '650',
      express_desk: '500',
      economic_home: '500',
      economic_desk: '400',
      retour_fee: '0',
      oversize_fee: '100',
      date_synchro: '2026-11-27T19:27:47.423Z',
      _count: { bureaux: 0 },
    },
  ],
}

test.describe('dashboard — référentiel tarifs Yalidine (phase 5)', () => {
  test.beforeEach(async ({ page }) => {

  // Catch-all (évalué en DERNIER — LIFO) : les appels du layout non liés au
  // test (stats dashboard, analytics…) partent sinon au backend RÉEL et leur
  // 403 déclenche le refresh-token factice → logout en boucle. Un 404 CORS
  // est sans effet : seul le 403 déclenche la déconnexion côté axios.
  await page.route('**/api/**', route =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: CORS })
      : route.fulfill({
          status: 404,
          headers: CORS,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'endpoint non utilisé par ce test' }),
        }),
  )
    await page.addInitScript(() => {
      window.localStorage.setItem('accessToken', 'token-factice-e2e')
      window.localStorage.setItem('refreshToken', 'refresh-factice-e2e')
      window.localStorage.setItem(
        'userData',
        JSON.stringify({ id: 1, nom_complet: 'Admin Test', role: 'ADMIN' })
      )
    })
    await page.route('**/api/auth/me', route => repondre(route, { id: 1, nom_complet: 'Admin Test', role: 'ADMIN' }))
    await page.route('**/api/tarifs-livraison?', route => repondre(route, []))
    await page.route('**/api/tarifs-livraison/synchronisation/journal', route =>
      repondre(route, { journal: [], en_cours: false })
    )
    await page.route('**/api/tarifs-livraison/synchronisation/referentiel', route =>
      repondre(route, REFERENCEL)
    )
    await page.route('**/api/tarifs-livraison/synchronisation/communes/*', route =>
      repondre(route, COMMUNES_16)
    )
    fs.mkdirSync(CAPTURES, { recursive: true })
  })

  test('bannière D7 normale + liste des wilayas avec comptages', async ({ page }) => {
    await page.route('**/api/tarifs-livraison/synchronisation/derniere-synchro', route =>
      repondre(route, BANNIERE_OK)
    )
    await page.goto('/ecommerce/tarifs-livraison')
    // Bannière : date et écart en jours visibles.
    await expect(page.getByText(/Dernière synchronisation des tarifs de livraison/)).toBeVisible()
    await expect(page.getByText(/il y a moins d'un jour/)).toBeVisible()
    // Liste des wilayas : comptages + tarifs uniformes + boutons par wilaya.
    await expect(page.getByText('Wilayas du référentiel Yalidine')).toBeVisible()
    const ligneAlger = page.getByRole('row', { name: /Alger/ })
    await expect(ligneAlger).toBeVisible()
    await expect(ligneAlger.getByText('57', { exact: true })).toBeVisible()
    await expect(ligneAlger.getByText('650 / 500 / 500 / 400 DZD')).toBeVisible()
    await expect(ligneAlger.locator('button')).toHaveCount(2)
    await page.screenshot({ path: path.join(CAPTURES, 'phase5-banniere-referentiel.png'), fullPage: true })
  })

  test('bannière en alerte au-delà du seuil (14 jours)', async ({ page }) => {
    await page.route('**/api/tarifs-livraison/synchronisation/derniere-synchro', route =>
      repondre(route, BANNIERE_ALERTE)
    )
    await page.goto('/ecommerce/tarifs-livraison')
    await expect(page.getByText(/Seuil d'alerte de 14 jours dépassé/)).toBeVisible()
    await page.screenshot({ path: path.join(CAPTURES, 'phase5-banniere-alerte.png') })
  })

  test('bannière visible aussi sur la page commandes web', async ({ page }) => {
    await page.route('**/api/commandes-web*', route =>
      repondre(route, { commandes: [], total: 0, page: 1, totalPages: 0 })
    )
    await page.route('**/api/tarifs-livraison/synchronisation/derniere-synchro', route =>
      repondre(route, BANNIERE_OK)
    )
    await page.goto('/ecommerce/commandes-web')
    await expect(page.getByText(/Dernière synchronisation des tarifs de livraison/)).toBeVisible()
    await page.screenshot({ path: path.join(CAPTURES, 'phase5-banniere-commandes-web.png') })
  })

  test('dialog de détail : communes triées, filtre bureau, tarifs par commune', async ({ page }) => {
    await page.route('**/api/tarifs-livraison/synchronisation/derniere-synchro', route =>
      repondre(route, BANNIERE_OK)
    )
    await page.goto('/ecommerce/tarifs-livraison')
    await page.getByRole('row', { name: /Alger/ }).locator('button').nth(1).click()
    // Dialog full-screen : surpoids et retour affichés, 3 communes triées par nom.
    await expect(page.getByText(/Wilaya 16 — Alger/)).toBeVisible()
    await expect(page.getByText(/Supplément surpoids : 100 DZD/)).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Alger Centre' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Aïn Benian' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Aïn Taya' })).toBeVisible()
    // Commune avec 2 bureaux : le nombre est affiché.
    await expect(page.getByText('Oui (2 bureaux)')).toBeVisible()
    // Filtre bureau : Aïn Taya (sans bureau) disparaît.
    await page.getByRole('checkbox').check()
    await expect(page.getByRole('cell', { name: 'Aïn Taya' })).toHaveCount(0)
    await expect(page.getByRole('cell', { name: 'Alger Centre' })).toBeVisible()
    await page.screenshot({ path: path.join(CAPTURES, 'phase5-dialog-detail-filtre-bureau.png'), fullPage: true })
  })

  test('synchronisation d\'une wilaya depuis la liste', async ({ page }) => {
    await page.route('**/api/tarifs-livraison/synchronisation/derniere-synchro', route =>
      repondre(route, BANNIERE_OK)
    )
    let nbSynchroWilaya = 0
    await page.route('**/api/tarifs-livraison/synchronisation/wilaya/*', route => {
      nbSynchroWilaya++
      expect(route.request().method()).toBe('POST')
      return repondre(route, {
        date_synchro: '2026-11-27T20:30:00.000Z',
        communes_ecrites: 57,
        bureaux_ecrits: 25,
        purge_bureaux: 0,
        purge_communes: 0,
        ok: true,
        wilaya: 16,
      })
    })
    await page.goto('/ecommerce/tarifs-livraison')
    // 1er bouton de la ligne Alger = « Synchroniser cette wilaya ».
    await page.getByRole('row', { name: /Alger/ }).locator('button').nth(0).click()
    await expect(page.getByText('Wilaya 16 synchronisée : 57 communes, 25 bureaux')).toBeVisible()
    expect(nbSynchroWilaya).toBe(1)
  })
})
