// E2E — Timeline Yalidine : détail commande dashboard + suivi boutique.
// Les appels API sont interceptés (page.route) : aucun backend ni appel
// Yalidine réel n'est nécessaire, aucun quota consommé.
const { test, expect } = require('@playwright/test')

const COMMANDE_FIXTURE = {
  id_cmd_web: 1,
  nom_client: 'TEST YALIDINE',
  telephone: '0550123456',
  wilaya: 'Tizi Ouzou',
  code_wilaya: 15,
  commune: 'Tizi Ouzou',
  adresse_exacte: 'ADRESSE TEST - NE PAS LIVRER',
  type_livraison: 'DOMICILE',
  frais_livraison: '540.00',
  montant_produits: '1833.00',
  montant_reduction: '0.00',
  montant_total_final: '2373.00',
  statut_commande: 'EXPEDIEE',
  statut_paiement: 'NON_PAYE',
  code_tracking: 'yal-E2E-TEST',
  note_admin: null,
  date_creation: '2026-11-23T08:00:00.000Z',
  promo: null,
  commande_interne: null,
  lignes: [
    {
      id_ligne: 1,
      quantite: 1,
      prix_unitaire_facture: '1833.00',
      designation_facturee: 'Adaptateur USB-c to HDTV OTN-UC102',
      prd_id: 246,
      produit: {
        designation_prd: 'Adaptateur USB-c to HDTV OTN-UC102',
        slug_prd: 'adaptateur-otn-uc102',
      },
    },
  ],
  colis_yalidine: {
    tracking: 'yal-E2E-TEST',
    statut_actuel: 'Ramassé',
    label: 'https://exemple.app/bordereau.php?tracking=yal-E2E-TEST',
    paiement: 'not-ready',
    historique: [
      {
        date_status: '2026-11-23 08:00:00',
        status: 'En préparation',
        reason: null,
        center_name: null,
        wilaya_name: 'Tizi Ouzou',
        commune_name: null,
      },
      {
        date_status: '2026-11-23 09:30:00',
        status: 'Ramassé',
        reason: null,
        center_name: 'Agence de Tizi Ouzou',
        wilaya_name: 'Tizi Ouzou',
        commune_name: null,
      },
    ],
  },
}

const USER_FIXTURE = {
  id: 1,
  nom_complet: 'Admin Test',
  email: 'admin@local.test',
  role: 'ADMIN',
}

test.describe('dashboard — détail commande web', () => {
  test.beforeEach(async ({ context }) => {
    // JWT injecté en localStorage (même clés que AuthContext) : l'auth passe
    // sans login réel ; /auth/me est mocké plus bas.
    await context.addInitScript(() => {
      window.localStorage.setItem('accessToken', 'token-factice-e2e')
      window.localStorage.setItem('refreshToken', 'refresh-factice-e2e')
      window.localStorage.setItem(
        'userData',
        JSON.stringify({
          id: 1,
          nom_complet: 'Admin Test',
          email: 'admin@local.test',
          role: 'ADMIN',
        }),
      )
    })
  })

  test('affiche la timeline Yalidine et le lien bordereau', async ({ page }) => {
    await page.route('**/api/auth/me**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER_FIXTURE) }),
    )
    await page.route('**/api/commandes-web/1**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(COMMANDE_FIXTURE) }),
    )

    await page.goto('/ecommerce/commandes-web/1')

    await expect(page.getByText('Suivi Yalidine')).toBeVisible()
    await expect(page.getByText(/Statut colis : Ramassé/)).toBeVisible()
    await expect(page.getByText(/Paiement Yalidine : not-ready/)).toBeVisible()
    await expect(page.getByText('Agence de Tizi Ouzou')).toBeVisible()

    const bordereau = page.getByRole('link', { name: /Imprimer le bordereau/ })
    await expect(bordereau).toBeVisible()
    await expect(bordereau).toHaveAttribute('href', 'https://exemple.app/bordereau.php?tracking=yal-E2E-TEST')
  })

  test('sans colis Yalidine : message clair, pas de timeline', async ({ page }) => {
    await page.route('**/api/auth/me**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER_FIXTURE) }),
    )
    await page.route('**/api/commandes-web/1**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...COMMANDE_FIXTURE, code_tracking: null, colis_yalidine: null }),
      }),
    )

    await page.goto('/ecommerce/commandes-web/1')

    await expect(page.getByText(/Aucun colis Yalidine/)).toBeVisible()
    await expect(page.getByText(/Historique|Ramassé/)).toHaveCount(0)
  })
})

test.describe('boutique — page de suivi', () => {
  test('affiche l’historique du colis après recherche par numéro + téléphone', async ({ page }) => {
    await page.route('**/api/public/commandes/1**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(COMMANDE_FIXTURE) }),
    )

    await page.goto('http://localhost:3012/commande/confirmee')

    await page.fill('#champ-numero', '1')
    await page.fill('#champ-telephone-suivi', '0550123456')
    await page.getByRole('button', { name: /Voir ma commande/ }).click()

    await expect(page.getByText('Historique du colis')).toBeVisible()
    // Le rendu boutique affiche statut + commune/wilaya (pas center_name).
    await expect(page.getByText(/Ramassé/)).toBeVisible()
    // Code de suivi affiché en texte simple (décision propriétaire Q2).
    await expect(page.getByText('yal-E2E-TEST')).toBeVisible()
  })
})
