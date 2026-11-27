// E2E — Phase 7 : parcours complet de la boutique (panier → checkout →
// confirmation) contre l'instance E2E locale (3012), API interceptée :
// aucun appel backend réel, aucun appel Yalidine, AUCUNE écriture dans la
// base de démo (une commande réelle réserverait le stock). Les intégrations
// réelles (devis référentiel, surpoids, repli) sont vérifiées séparément
// contre le backend de dev.
//
// Le panier est INJECTÉ au localStorage (même clé que CartContext) : la fiche
// produit fait du getServerSideProps (fetch côté serveur Node, non
// interceptable par page.route) et le produit de la fixture est BROUILLON
// dans la base de démo — côté client, le flux complet reste vérifié.
// Vérifiés : poids facturé transmis au devis (D8), id de commune (D4),
// filtre des communes avec bureau (D10), page de confirmation.
const { test, expect } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

const REPO = path.resolve(__dirname, '..', '..', '..')
const CAPTURES = path.join(REPO, 'frontend', 'test-results', 'captures-phase7')
const BOUTIQUE = 'http://localhost:3012'

// Les requêtes mockées partent en cross-origin (boutique → backend 3001) :
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

// Article avec poids et dimensions : 0,5 kg réel vs 10×5×3/5000 = 0,03 kg
// volumétrique → poids facturé 0,5 kg → 1000 g pour 2 unités.
const ARTICLE = {
  slug: 'adaptateur-otn-uc102',
  designation: 'Adaptateur USB-C vers HDMI',
  prix: 1833,
  image: null,
  quantite: 2,
  poids_grammes: 500,
  longueur_cm: 10,
  largeur_cm: 5,
  hauteur_cm: 3,
}

const WILAYAS = [
  { code: 15, nom: 'Tizi Ouzou' },
  { code: 16, nom: 'Alger' },
]

const COMMUNES_15 = {
  wilaya: 15,
  disponible: true,
  source: 'referentiel',
  communes: [
    { id: 1501, nom: 'Azazga', code: 1501, a_bureau: true },
    { id: 1502, nom: 'Tizi Ouzou', code: 1502, a_bureau: true },
    { id: 1503, nom: 'Aït Chafaa', code: 1503, a_bureau: false },
  ],
}

const BUREAUX_15 = {
  wilaya: 15,
  disponible: true,
  source: 'referentiel',
  bureaux: [{ id: 15101, nom: 'Agence de Tizi Ouzou', adresse: 'Centre-ville', commune_id: 1502 }],
}

test.describe('boutique — parcours complet devis → commande → confirmation', () => {
  const captures = nom => path.join(CAPTURES, nom)
  let parametresDevisCheckout = []

  test.beforeEach(async ({ page }) => {
    parametresDevisCheckout = []
    fs.mkdirSync(CAPTURES, { recursive: true })
    // Panier injecté : 2 unités → poids facturé 1000 g (D8).
    await page.addInitScript(article => {
      window.localStorage.setItem(
        'ptech-panier',
        JSON.stringify({ articles: [article], codePromo: null }),
      )
    }, ARTICLE)
    // Catch-all : tout appel boutique→backend non prévu ici répond 404 CORS
    // (sans effet ; seul un 403 déclencherait la boucle refresh/logout).
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

    await page.route('**/api/public/livraison/wilayas', route =>
      repondre(route, WILAYAS)
    )
    await page.route('**/api/public/livraison/communes*', route => {
      const url = new URL(route.request().url())
      if (url.searchParams.get('wilaya') === '15') {
        return repondre(route, COMMUNES_15)
      }
      return repondre(route, { wilaya: 15, communes: [], disponible: false })
    })
    await page.route('**/api/public/livraison/bureaux*', route =>
      repondre(route, BUREAUX_15)
    )
    await page.route('**/api/public/livraison/tarif*', route => {
      const url = new URL(route.request().url())
      const type = url.searchParams.get('type')
      parametresDevisCheckout.push({
        commune: url.searchParams.get('commune'),
        poids_grammes: url.searchParams.get('poids_grammes'),
        type,
      })
      const prix = type === 'BUREAU' ? 400 : 540
      return repondre(route, {
        wilaya: 15,
        nom_wilaya: 'Tizi Ouzou',
        type,
        prix,
        disponible: true,
        source: 'referentiel',
      })
    })
    await page.route('**/api/public/commandes', route => {
      if (route.request().method() === 'POST') {
        const corps = route.request().postDataJSON()
        // La boutique transmet l'id de commune (D4) et le mode de livraison.
        expect(corps.commune_id).toBe(1502)
        expect(corps.type_livraison).toBe('DOMICILE')
        expect(corps.code_wilaya).toBe(15)
        expect(corps.lignes).toEqual([{ slug: 'adaptateur-otn-uc102', quantite: 2 }])
        return repondre(route, { id_cmd_web: 9999, statut_commande: 'NOUVELLE' }, 201)
      }
      return route.fulfill({ status: 405, body: '' })
    })
    await page.route('**/api/public/commandes/9999*', route =>
      repondre(route, {
        id_cmd_web: 9999,
        statut_commande: 'NOUVELLE',
        wilaya: 'Tizi Ouzou',
        frais_livraison: '540.00',
        montant_produits: '3666.00',
        montant_reduction: '0.00',
        montant_total_final: '4206.00',
        lignes: [{ quantite: 2, prix_unitaire_facture: '1833.00', designation_facturee: 'Adaptateur USB-C vers HDMI' }],
        promo: null,
        colis_yalidine: null,
      })
    )
  })

  test('panier → devis avec poids et commune → checkout → confirmation', async ({ page }) => {
    // 1. Panier : l'article injecté s'affiche.
    await page.goto(`${BOUTIQUE}/panier`)
    await expect(page.getByText('Adaptateur USB-C vers HDMI').first()).toBeVisible()
    await page.screenshot({ path: captures('phase7-panier.png'), fullPage: true })

    // 2. Checkout étape 1 : coordonnées + wilaya/commune.
    await page.goto(`${BOUTIQUE}/commande`)
    await page.getByLabel(/Nom complet/).fill('Client Test E2E')
    await page.getByLabel(/Téléphone/).fill('0550000000')
    await page.getByLabel(/Wilaya/).click()
    await page.getByRole('option', { name: /Tizi Ouzou/ }).click()
    await page.getByLabel(/Commune/).click()
    await page.getByRole('option', { name: 'Tizi Ouzou', exact: true }).click()
    // D4/D8 : les requêtes de devis portent l'id de commune ET le poids du
    // panier (1000 g pour 2 unités) — le useEffect en fait 3 (frais courant
    // + les deux modes pour les libellés radio) : on vérifie le DOMICILE.
    const devisDomicile = parametresDevisCheckout
      .filter(p => p.type === 'DOMICILE')
      .pop()
    await expect(devisDomicile).toEqual({
      commune: '1502',
      poids_grammes: '1000',
      type: 'DOMICILE',
    })
    const devisBureau = parametresDevisCheckout
      .filter(p => p.type === 'BUREAU')
      .pop()
    await expect(devisBureau).toEqual({
      commune: '1502',
      poids_grammes: '1000',
      type: 'BUREAU',
    })
    await page.screenshot({ path: captures('phase7-checkout-etape1.png'), fullPage: true })
    await page.getByRole('button', { name: 'Continuer' }).click()

    // 3. Étape 2 : adresse + mode de livraison (devis affichés par mode).
    await page.getByLabel(/Adresse exacte/).fill('Rue de test, 1')
    await page.screenshot({ path: captures('phase7-checkout-etape2.png'), fullPage: true })
    await page.getByRole('button', { name: 'Continuer' }).click()

    // 4. Récapitulatif puis confirmation → page de confirmation.
    await expect(page.getByText('Vérifiez votre commande')).toBeVisible()
    await page.screenshot({ path: captures('phase7-checkout-recap.png'), fullPage: true })
    await page.getByRole('button', { name: /Confirmer ma commande/ }).click()
    await page.waitForURL('**/commande/confirmee')
    await expect(page.getByText('Merci pour votre commande !')).toBeVisible()
    await page.screenshot({ path: captures('phase7-confirmation.png'), fullPage: true })
  })

  test('mode BUREAU : seules les communes avec bureau sont proposées (D10)', async ({ page }) => {
    await page.goto(`${BOUTIQUE}/panier`)
    await page.goto(`${BOUTIQUE}/commande`)
    await page.getByLabel(/Nom complet/).fill('Client Test E2E')
    await page.getByLabel(/Téléphone/).fill('0550000000')
    await page.getByLabel(/Wilaya/).click()
    await page.getByRole('option', { name: /Tizi Ouzou/ }).click()
    // En mode DOMICILE (défaut) : 3 communes, dont Aït Chafaa sans bureau.
    await page.getByLabel(/Commune/).click()
    await expect(page.getByRole('option', { name: 'Aït Chafaa', exact: true })).toBeVisible()
    await page.getByRole('option', { name: 'Aït Chafaa', exact: true }).click()
    await page.getByRole('button', { name: 'Continuer' }).click()
    // Bascule vers BUREAU : la validation refuse la commune sans bureau
    // (message racine, prioritaire sur « choisissez un bureau »).
    await page.getByRole('radio', { name: /Au bureau/ }).check()
    await page.getByRole('button', { name: 'Continuer' }).click()
    await expect(page.getByText(/Cette commune n'a pas de bureau de livraison/)).toBeVisible()
    await page.screenshot({ path: captures('phase7-erreur-commune-sans-bureau.png'), fullPage: true })
    // Retour à l'étape 1 : la liste des communes exclut désormais Aït Chafaa.
    await page.getByRole('button', { name: 'Retour' }).click()
    await page.getByLabel(/Commune/).click()
    await expect(page.getByRole('option', { name: 'Aït Chafaa', exact: true })).toHaveCount(0)
    await expect(page.getByRole('option', { name: 'Azazga', exact: true })).toBeVisible()
    await page.screenshot({ path: captures('phase7-filtre-bureau-communes.png'), fullPage: true })
  })
})
