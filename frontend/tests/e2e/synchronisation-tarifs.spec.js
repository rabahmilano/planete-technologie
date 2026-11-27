// E2E — Phase 4 : déclencheurs de synchronisation Yalidine sur la page tarifs.
// Les appels API sont interceptés (page.route) : aucun backend ni appel
// Yalidine réel n'est nécessaire, aucun quota consommé (règle du quota API).
// Vérifiés : bouton « Synchroniser les tarifs » + dialog de confirmation,
// état « en cours », toasts, journal des synchronisations (rendu + mise à
// jour après synchro), cas d'erreur 409 (synchro déjà en cours).
const { test, expect } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

const REPO = path.resolve(__dirname, '..', '..', '..')
const CAPTURES = path.join(REPO, 'frontend', 'test-results', 'captures-phase4')

// Les requêtes mockées partent en cross-origin (dashboard → backend 3001) :
// le navigateur exige un preflight OPTIONS avec les en-têtes CORS et ces
// en-têtes SUR chaque réponse. Sans eux, axios rejette la requête et le
// AuthContext redirige vers /login (boucle constatée au 1er run).
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

const JOURNAL_AVANT = [
  {
    date: '2026-11-27T19:27:49.182Z',
    portee: 'AUTO',
    wilaya: null,
    ok: true,
    communes: 1541,
    bureaux: 199,
    purge_bureaux: 0,
    purge_communes: 0,
    wilayas_erreur: [],
    duree_ms: 67361,
  },
]
const JOURNAL_APRES = [
  {
    date: '2026-11-27T20:10:00.000Z',
    portee: 'MANUEL',
    wilaya: null,
    ok: true,
    communes: 1541,
    bureaux: 199,
    purge_bureaux: 0,
    purge_communes: 0,
    wilayas_erreur: [],
    duree_ms: 68000,
  },
  ...JOURNAL_AVANT,
]

test.describe('dashboard — synchronisation des tarifs Yalidine', () => {
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
    // Auth : mêmes clés localStorage que AuthContext (JWT factice — les API
    // sont mockées plus bas, aucun token réel n'est nécessaire).
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
    fs.mkdirSync(CAPTURES, { recursive: true })
  })

  test('la page affiche le bouton de synchro et le journal existant', async ({ page }) => {
    await page.route('**/api/tarifs-livraison/synchronisation/journal', route =>
      repondre(route, { journal: JOURNAL_AVANT, en_cours: false })
    )
    await page.goto('/ecommerce/tarifs-livraison')
    await expect(page.getByRole('heading', { name: 'Tarifs de livraison' })).toBeVisible()
    const bouton = page.getByRole('button', { name: 'Synchroniser les tarifs' })
    await expect(bouton).toBeVisible()
    await expect(bouton).toBeEnabled()
    // Le journal en mémoire au serveur est rendu (entrées + portée).
    await expect(page.getByText('Journal des synchronisations')).toBeVisible()
    await expect(page.getByText('Automatique (hebdomadaire)')).toBeVisible()
    await page.screenshot({ path: path.join(CAPTURES, 'phase4-page-tarifs-journal.png'), fullPage: true })
  })

  test('confirmation puis synchro globale réussie met à jour le journal', async ({ page }) => {
    let nbAppelsSynchro = 0
    let nbLecturesJournal = 0
    await page.route('**/api/tarifs-livraison/synchronisation/journal', route => {
      nbLecturesJournal++
      const journal = nbLecturesJournal > 1 ? JOURNAL_APRES : JOURNAL_AVANT
      return repondre(route, { journal, en_cours: false })
    })
    await page.route('**/api/tarifs-livraison/synchronisation/globale', route => {
      nbAppelsSynchro++
      expect(route.request().method()).toBe('POST')
      return repondre(route, {
        date_synchro: '2026-11-27T20:10:00.000Z',
        communes_ecrites: 1541,
        bureaux_ecrits: 199,
        purge_bureaux: 0,
        purge_communes: 0,
        ok: true,
        wilayas_total: 58,
        wilayas_erreur: [],
      })
    })

    await page.goto('/ecommerce/tarifs-livraison')
    await expect(page.getByRole('button', { name: 'Synchroniser les tarifs' })).toBeEnabled()
    await page.getByRole('button', { name: 'Synchroniser les tarifs' }).click()

    // Le dialog de confirmation explique le coût API avant de déclencher.
    await expect(page.getByText('Synchroniser tous les tarifs ?')).toBeVisible()
    await expect(page.getByRole('dialog').getByText(/58 wilayas/)).toBeVisible()
    await page.screenshot({ path: path.join(CAPTURES, 'phase4-dialog-confirmation.png') })

    await page.getByRole('button', { name: 'Synchroniser' }).click()
    await expect(page.getByText('Synchronisation terminée : 1541 communes, 199 bureaux')).toBeVisible()
    // Une seule requête réelle déclenchée, journal rechargé après coup.
    expect(nbAppelsSynchro).toBe(1)
    expect(nbLecturesJournal).toBeGreaterThanOrEqual(2)
    await page.screenshot({ path: path.join(CAPTURES, 'phase4-synchro-terminee-journal.png'), fullPage: true })
  })

  test('une synchro déjà en cours (409) affiche le message du serveur', async ({ page }) => {
    await page.route('**/api/tarifs-livraison/synchronisation/journal', route =>
      repondre(route, { journal: JOURNAL_AVANT, en_cours: true })
    )
    await page.route('**/api/tarifs-livraison/synchronisation/globale', route =>
      repondre(
        route,
        {
          message:
            'Une synchronisation est déjà en cours — attendez sa fin avant de relancer.',
        },
        409,
      )
    )
    await page.goto('/ecommerce/tarifs-livraison')
    await page.getByRole('button', { name: 'Synchroniser les tarifs' }).click()
    await page.getByRole('button', { name: 'Synchroniser' }).click()
    await expect(page.getByText('Une synchronisation est déjà en cours')).toBeVisible()
    await page.screenshot({ path: path.join(CAPTURES, 'phase4-erreur-409.png') })
  })
})
