// E2E — Sections e-commerce : commandes web, codes promo, familles.
// Vérification contre le backend réel + BDD de test locale (MySQL
// ~/workspace/mysql-data, port 3306).
// - Commandes web : la liste charge sans erreur malgré une ligne orpheline
//   (prd_id inexistant, créée en beforeAll puis SUPPRIMÉE en afterAll) ; le
//   détail affiche « Produit supprimé » avec la désignation facturée.
// - Codes promo : date de début (À venir / Actif / sans date), validation
//   date_debut <= date_expiration, refus « pas encore actif » via la carte
//   « Vérifier un code ».
// - Familles : création racine + sous-famille via l'accordéon FamilleSelect,
//   avertissement slug (URL partagées), cycle refusé (API), suppression
//   avec produits refusée, aperçu local de l'image sans upload avant
//   Enregistrer (Cloudinary non configuré sur la VM : l'envoi réel à
//   l'enregistrement n'est pas vérifiable ici, comme pour le modal Gérer).
// Auth : JWT minté localement avec JWT_SECRET du backend/.env, pour un
// compte ADMIN réel de la BDD de test (aucun mot de passe manipulé).
// Captures : files/apercu-sections-ecommerce-2026-11-24/ (dossier du goal).
const { test, expect } = require('@playwright/test')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')

const REPO = path.resolve(__dirname, '..', '..', '..')
const BACKEND_ENV = fs.readFileSync(path.join(REPO, 'backend', '.env'), 'utf8')
const secret = nom => {
  const m = BACKEND_ENV.match(new RegExp(`^${nom}=(.+)$`, 'm'))
  if (!m) return null

  return m[1].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
}
const MYSQL = `mysql --socket=${process.env.HOME}/workspace/mysql-data/mysql.sock -uroot --default-character-set=utf8mb4 -N -B planete_tech_test`
const db = sql => execSync(`${MYSQL} -e ${JSON.stringify(sql)}`, { encoding: 'utf8' }).trim()
const dbJson = sql => {
  const out = db(sql)
  if (!out) return []

  return out
    .split('\n')
    .filter(l => l && !l.startsWith('PAGER set to'))
    .map(l => l.split('\t'))
}

const CAPTURES = '/home/hatch/workspace/goals/plan-te-tech-dashboard-and-e-commerce-platform/files/apercu-sections-ecommerce-2026-11-24'
const FIXTURES = '/tmp/sections-ecommerce-fixtures'
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

const CODES_TEST = ['TESTAVENIR', 'TESTPASSE2', 'TESTSANSDEBUT', 'TESTFUTUR', 'TESTPASSE']
const SLUGS_TEST = ['test-racine-e2e', 'test-racine-e2e-v2', 'test-enfant-e2e']

let adminId = null
const tokenApi = () =>
  jwt.sign({ id: adminId, role: 'ADMIN' }, secret('JWT_SECRET'), { expiresIn: '15m' })
const api = (methode, chemin, corps) => {
  const donnees = corps ? `-H 'Content-Type: application/json' -d ${JSON.stringify(JSON.stringify(corps))}` : ''
  return execSync(
    `curl -s -X ${methode} http://localhost:3001/api${chemin} -H "Authorization: Bearer ${tokenApi()}" ${donnees}`,
    { encoding: 'utf8' }
  )
}
const dateISO = decalageJours =>
  new Date(Date.now() + decalageJours * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

test.beforeAll(async () => {
  fs.mkdirSync(CAPTURES, { recursive: true })
  fs.mkdirSync(FIXTURES, { recursive: true })
  fs.writeFileSync(path.join(FIXTURES, 'test-famille.png'), PNG_1X1)
  const admins = dbJson(
    "SELECT id_user FROM utilisateurs WHERE role = 'ADMIN' AND statut = 'ACTIF' LIMIT 1"
  )
  if (!admins.length) throw new Error('Aucun compte ADMIN actif dans la BDD de test')
  adminId = parseInt(admins[0][0], 10)
  // Ligne orpheline : prd_id inexistant sur la commande web 29 (ANNULEE,
  // commande de test). La FK impose FOREIGN_KEY_CHECKS=0 pour l'insertion —
  // c'est exactement comme ça que le vieux dump a créé les siennes.
  // id_ligne 900035 : hors de la séquence normale, pour ne jamais entrer en
  // collision avec les lignes créées par les tests (ex. la conversion crée
  // la ligne 35/36 sur le produit 257). SET + INSERT + SET dans UNE SEULE
  // invocation mysql : FOREIGN_KEY_CHECKS est un réglage de session, perdu
  // entre deux appels séparés.
  db(
    `SET FOREIGN_KEY_CHECKS=0; INSERT INTO ligne_commande_web (id_ligne, quantite, prix_unitaire_facture, designation_facturee, cmd_web_id, prd_id) VALUES (900035, 1, 1000.00, 'Produit test orphelin (supprimé)', 29, 999999) ON DUPLICATE KEY UPDATE prd_id = 999999, designation_facturee = 'Produit test orphelin (supprimé)'; SET FOREIGN_KEY_CHECKS=1;`
  )
})

test.afterAll(async () => {
  // Nettoyage : codes de test, familles de test (enfants d'abord), ligne
  // orpheline. Best-effort : ne pas faire échouer le rapport.
  for (const code of CODES_TEST) {
    try {
      const trouve = JSON.parse(api('GET', `/codes-promo`)).find(c => c.code === code)
      if (trouve) api('DELETE', `/codes-promo/${trouve.id_code}`)
    } catch (e) {
      // best-effort
    }
  }
  try {
    const enfants = dbJson(
      `SELECT id_famille FROM famille_produit WHERE slug_famille IN ('${SLUGS_TEST.join("','")}') AND famille_parente_id IS NOT NULL`
    )
    const racines = dbJson(
      `SELECT id_famille FROM famille_produit WHERE slug_famille IN ('${SLUGS_TEST.join("','")}') AND famille_parente_id IS NULL`
    )
    for (const [id] of [...enfants, ...racines]) {
      try {
        api('DELETE', `/familles/${id}`)
      } catch (e) {
        // best-effort
      }
    }
  } catch (e) {
    // best-effort
  }
  try {
    db('DELETE FROM ligne_commande_web WHERE id_ligne = 900035 AND prd_id = 999999')
  } catch (e) {
    // best-effort
  }
})

test.beforeEach(async ({ context }) => {
  const accessToken = jwt.sign({ id: adminId, role: 'ADMIN' }, secret('JWT_SECRET'), { expiresIn: '15m' })
  const refreshToken = jwt.sign({ id: adminId }, secret('JWT_REFRESH_SECRET'), { expiresIn: '7d' })
  await context.addInitScript(
    ({ accessToken, refreshToken, adminId }) => {
      window.localStorage.setItem('accessToken', accessToken)
      window.localStorage.setItem('refreshToken', refreshToken)
      window.localStorage.setItem(
        'userData',
        JSON.stringify({ id: adminId, role: 'ADMIN', nom_complet: 'Admin Test E2E' })
      )
    },
    { accessToken, refreshToken, adminId }
  )
})

// Ouvre le dialogue de création d'un code promo et remplit les champs.
// `dates` = { debut, expiration } au format YYYY-MM-DD (ou '').
// Les champs sont ciblés dans le dialogue : la carte « Vérifier un code »
// a elle aussi un champ « Code » sur la même page.
const remplirCodePromo = async (page, { code, valeur = '10', debut = '', expiration = '' }) => {
  await page.getByRole('button', { name: 'Nouveau code' }).click()
  const dialogue = page.getByRole('dialog')
  // { exact: true } : sans lui, « Code » résout aussi le switch « Code actif ».
  await dialogue.getByLabel('Code', { exact: true }).fill(code)
  await dialogue.getByLabel('Valeur (%)').fill(valeur)
  if (debut) await dialogue.getByLabel('Date de début').fill(debut)
  await dialogue.getByLabel("Date d'expiration").fill(expiration)
  await dialogue.getByLabel('Utilisation maximum').fill('5')
}

test.describe('sections e-commerce — commandes web, codes promo, familles', () => {
  test('commandes web : la liste charge sans erreur malgré la ligne orpheline', async ({ page }) => {
    const toastsErreur = []
    page.on('console', msg => {
      if (msg.type() === 'error') toastsErreur.push(msg.text())
    })
    await page.goto('/ecommerce/commandes-web')
    await expect(page.getByText('Commandes web').first()).toBeVisible()
    // La liste affiche les commandes (29 en base) au lieu de l'erreur Prisma.
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Aucune commande web.')).toHaveCount(0)
    await expect(page.getByText(/a échoué/)).toHaveCount(0)
    await page.screenshot({ path: path.join(CAPTURES, '01-commandes-web-liste.png') })
  })

  test('commandes web : le détail affiche « Produit supprimé »', async ({ page }) => {
    await page.goto('/ecommerce/commandes-web/29')
    await expect(page.getByText('Commande web #29')).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Produit supprimé')).toBeVisible()
    await expect(page.getByText('Produit test orphelin (supprimé)')).toBeVisible()
    await page.screenshot({ path: path.join(CAPTURES, '02-commandes-web-detail-produit-supprime.png') })
  })

  test('commandes web : LIVRÉE ne crée rien, « Convertir en vente » crée la vente, ANNULÉE annule tout', async ({
    page,
  }) => {
    // Commande web de test via l'API (produit 257, 1 pièce) — la création réserve le stock.
    const stockAvant = dbJson('SELECT qte_dispo, qte_reservee FROM produit WHERE id_prd = 257')[0]
    const creee = JSON.parse(
      api('POST', '/commandes-web', {
        nom_client: 'Client Test Conversion',
        telephone: '0550123456',
        wilaya: 'Tizi Ouzou',
        code_wilaya: 15,
        commune: 'Tizi Ouzou',
        type_livraison: 'DOMICILE',
        frais_livraison: 400,
        lignes: [{ prd_id: 257, quantite: 1 }],
      })
    )
    const idCmd = creee.id_cmd_web
    expect(creee.statut_commande).toBe('NOUVELLE')
    let stock = dbJson('SELECT qte_dispo, qte_reservee FROM produit WHERE id_prd = 257')[0]
    expect(stock[1]).toBe('1') // réservation posée à la création

    // Passage à LIVRÉE : AUCUNE commande interne, réservation inchangée.
    api('PATCH', `/commandes-web/${idCmd}/statut`, { statut_commande: 'LIVREE' })
    let cmd = dbJson(
      `SELECT statut_commande, commande_interne_id FROM commande_web WHERE id_cmd_web = ${idCmd}`
    )[0]
    expect(cmd[0]).toBe('LIVREE')
    expect(cmd[1]).toBe('NULL')
    stock = dbJson('SELECT qte_dispo, qte_reservee FROM produit WHERE id_prd = 257')[0]
    expect(stock[1]).toBe('1')

    // Conversion via le bouton dans le détail.
    await page.goto(`/ecommerce/commandes-web/${idCmd}`)
    await expect(page.getByText('Commande web #' + idCmd)).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('À convertir')).toBeVisible()
    await page.getByRole('button', { name: 'Convertir en vente' }).click()
    await expect(page.getByText('Vente créée', { exact: true })).toBeVisible({ timeout: 20000 })
    await expect(page.getByRole('button', { name: 'Convertir en vente' })).toHaveCount(0)

    // Vérifications base : commande interne créée, réservation libérée, stock vendu.
    cmd = dbJson(`SELECT commande_interne_id FROM commande_web WHERE id_cmd_web = ${idCmd}`)[0]
    expect(cmd[0]).not.toBe('NULL')
    const idInterne = parseInt(cmd[0], 10)
    expect(dbJson(`SELECT id_cde FROM commande WHERE id_cde = ${idInterne}`)).toHaveLength(1)
    stock = dbJson('SELECT qte_dispo, qte_reservee FROM produit WHERE id_prd = 257')[0]
    expect(stock[1]).toBe('0')
    expect(stock[0]).toBe(String(parseInt(stockAvant[0], 10) - 1))
    await page.screenshot({ path: path.join(CAPTURES, '08-commandes-web-vente-creee.png') })

    // Annulation : la commande interne est supprimée, le stock restauré.
    api('PATCH', `/commandes-web/${idCmd}/statut`, { statut_commande: 'ANNULEE' })
    cmd = dbJson(
      `SELECT statut_commande, commande_interne_id FROM commande_web WHERE id_cmd_web = ${idCmd}`
    )[0]
    expect(cmd[0]).toBe('ANNULEE')
    expect(cmd[1]).toBe('NULL')
    expect(dbJson(`SELECT id_cde FROM commande WHERE id_cde = ${idInterne}`)).toHaveLength(0)
    stock = dbJson('SELECT qte_dispo, qte_reservee FROM produit WHERE id_prd = 257')[0]
    expect(stock).toEqual(stockAvant)
  })

  test('codes promo : date de début future → « À venir » et refusé à la vérification', async ({ page }) => {
    await page.goto('/ecommerce/codes-promo')
    await expect(page.getByText('Codes promo').first()).toBeVisible()
    await remplirCodePromo(page, {
      code: 'TESTAVENIR',
      debut: dateISO(1),
      expiration: dateISO(30)
    })
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    const ligne = page.locator('tr', { hasText: 'TESTAVENIR' })
    await expect(ligne.getByText('À venir')).toBeVisible({ timeout: 20000 })
    // Date affichée : même fuseau que le navigateur (même machine).
    await expect(ligne.getByText(new Date(dateISO(1)).toLocaleDateString('fr-FR'))).toBeVisible()
    // Vérification via la carte « Vérifier un code » : refusé, pas encore actif.
    await page.getByLabel('Code', { exact: true }).first().fill('TESTAVENIR')
    await page.getByLabel('Montant de la commande (DZD)').fill('10000')
    await page.getByRole('button', { name: 'Vérifier' }).click()
    await expect(page.getByText('Invalide — Code promo pas encore actif.')).toBeVisible({ timeout: 20000 })
    await page.screenshot({ path: path.join(CAPTURES, '03-codes-promo-a-venir.png') })
  })

  test('codes promo : date passée et sans date → « Actif » ; dates incohérentes → Enregistrer bloqué', async ({ page }) => {
    await page.goto('/ecommerce/codes-promo')
    await expect(page.getByText('Codes promo').first()).toBeVisible()
    await remplirCodePromo(page, {
      code: 'TESTPASSE2',
      debut: dateISO(-30),
      expiration: dateISO(30)
    })
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.locator('tr', { hasText: 'TESTPASSE2' }).getByText('Actif')).toBeVisible({ timeout: 20000 })

    await remplirCodePromo(page, { code: 'TESTSANSDEBUT', expiration: dateISO(30) })
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    const ligneSansDebut = page.locator('tr', { hasText: 'TESTSANSDEBUT' })
    await expect(ligneSansDebut.getByText('Actif')).toBeVisible({ timeout: 20000 })

    // Dates incohérentes : message clair et bouton bloqué.
    await page.getByRole('button', { name: 'Nouveau code' }).click()
    const dialogue = page.getByRole('dialog')
    await dialogue.getByLabel('Code', { exact: true }).fill('TESTBAD')
    await dialogue.getByLabel('Valeur (%)').fill('10')
    await dialogue.getByLabel('Date de début').fill(dateISO(20))
    await dialogue.getByLabel("Date d'expiration").fill(dateISO(10))
    await dialogue.getByLabel('Utilisation maximum').fill('5')
    await expect(
      page.getByText("La date de début doit être antérieure ou égale à la date d'expiration")
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
    await page.getByRole('button', { name: 'Annuler' }).click()
    await page.screenshot({ path: path.join(CAPTURES, '04-codes-promo-statuts.png') })
  })

  test('familles : racine puis sous-famille via l’accordéon parent', async ({ page }) => {
    await page.goto('/ecommerce/familles')
    await expect(page.getByText('Familles de produits').first()).toBeVisible()
    // Racine : « Aucune (famille racine) » par défaut.
    await page.getByRole('button', { name: 'Nouvelle famille' }).click()
    await page.getByLabel('Nom de la famille').fill('Test Racine E2E')
    await page.getByLabel('Slug').fill('test-racine-e2e')
    await expect(page.getByTestId('selecteur-famille').locator('input')).toHaveValue('')
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.getByText('Test Racine E2E')).toBeVisible({ timeout: 20000 })

    // Sous-famille : l'accordéon propose la racine comme parente.
    await page.getByRole('button', { name: 'Nouvelle famille' }).click()
    await page.getByLabel('Nom de la famille').fill('Test Enfant E2E')
    await page.getByLabel('Slug').fill('test-enfant-e2e')
    await page.getByTestId('selecteur-famille').click()
    const racineId = dbJson(`SELECT id_famille FROM famille_produit WHERE slug_famille = 'test-racine-e2e'`)[0][0]
    await expect(page.getByTestId(`option-famille-${racineId}`)).toBeVisible()
    await page.screenshot({ path: path.join(CAPTURES, '05-familles-accordeon-parent.png') })
    await page.getByTestId(`option-famille-${racineId}`).click()
    await expect(page.getByTestId('selecteur-famille').locator('input')).toHaveValue('Test Racine E2E')
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.getByText('Test Enfant E2E')).toBeVisible({ timeout: 20000 })
    await page.screenshot({ path: path.join(CAPTURES, '06-familles-arbre.png') })
  })

  test('familles : modifier un slug avertit sur les URL partagées', async ({ page }) => {
    await page.goto('/ecommerce/familles')
    await expect(page.getByText('Test Racine E2E')).toBeVisible({ timeout: 20000 })
    await page.getByRole('button', { name: 'Modifier Test Racine E2E' }).click()
    await page.getByLabel('Slug').fill('test-racine-e2e-v2')
    await expect(page.getByText(/casse les URL partagées/)).toBeVisible()
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.getByText('test-racine-e2e-v2')).toBeVisible({ timeout: 20000 })
  })

  test('familles : cycle refusé et suppression avec produits refusée', async ({ page }) => {
    // Cycle : la racine ne peut pas prendre sa propre descendante comme parente.
    const racineId = dbJson(`SELECT id_famille FROM famille_produit WHERE slug_famille = 'test-racine-e2e-v2'`)[0][0]
    const enfantId = dbJson(`SELECT id_famille FROM famille_produit WHERE slug_famille = 'test-enfant-e2e'`)[0][0]
    const reponseCycle = api('PATCH', `/familles/${racineId}`, { famille_parente_id: parseInt(enfantId, 10) })
    expect(reponseCycle).toContain('descendante')
    // Suppression refusée : la famille 7 (Chargeurs et câbles) a des produits.
    await page.goto('/ecommerce/familles')
    await expect(page.getByText('Chargeurs et câbles')).toBeVisible({ timeout: 20000 })
    await page.getByRole('button', { name: 'Supprimer Chargeurs et câbles' }).click()
    await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
    await expect(page.getByText('Impossible de supprimer une famille à laquelle des produits sont rattachés.')).toBeVisible({ timeout: 20000 })
  })

  test('familles : aperçu local de l’image, zéro upload avant Enregistrer', async ({ page }) => {
    const appelsUpload = []
    page.on('request', req => {
      if (req.url().includes('/familles/image/upload')) appelsUpload.push(req.url())
    })
    await page.goto('/ecommerce/familles')
    await expect(page.getByText('Familles de produits').first()).toBeVisible()
    await page.getByRole('button', { name: 'Nouvelle famille' }).click()
    await page.getByLabel('Nom de la famille').fill('Test Image E2E')
    await page.getByLabel('Slug').fill('test-image-e2e')
    await page.locator('input[type="file"]').setInputFiles(path.join(FIXTURES, 'test-famille.png'))
    await expect(page.getByText(/Aperçu local/)).toBeVisible()
    expect(appelsUpload).toHaveLength(0)
    await page.screenshot({ path: path.join(CAPTURES, '07-familles-apercu-local.png') })
    await page.getByRole('button', { name: 'Annuler' }).click()
    expect(appelsUpload).toHaveLength(0)
  })
})
