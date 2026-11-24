// E2E — Modal « Gérer » (11 points) : vérification contre le backend réel
// + BDD de test locale (MySQL ~/workspace/mysql-data, port 3306).
// ⚠ Ne pas lancer en parallèle avec modal-gerer-upload-echec.spec.js :
// les deux specs mutent le même produit (257, seul avec >= 2 images).
// Un produit BROUILLON est muté temporairement (intitulé NULL, poids 6000,
// dimensions NULL) puis RESTAURÉ en afterAll ; les images téléversées par
// le test sont supprimées via l'API (donc aussi de Cloudinary).
// Auth : JWT minté localement avec JWT_SECRET du backend/.env, pour un
// compte ADMIN réel de la BDD de test (aucun mot de passe manipulé).
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
  // dotenv déguillemette les valeurs : on fait pareil (sinon le JWT est
  // signé avec les guillemets et refusé par le backend).
  return m[1].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
}
const MYSQL = `mysql --socket=${process.env.HOME}/workspace/mysql-data/mysql.sock -uroot --default-character-set=utf8mb4 -N -B planete_tech_test`
const db = sql => execSync(`${MYSQL} -e ${JSON.stringify(sql)}`, { encoding: 'utf8' }).trim()
const dbJson = sql => {
  const out = db(sql)
  if (!out) return []
  // Le client mysql peut émettre des lignes parasites (« PAGER set to … »)
  // quand la requête contient des retours à la ligne : on les ignore.
  return out
    .split('\n')
    .filter(l => l && !l.startsWith('PAGER set to'))
    .map(l => l.split('\t'))
}

const FIXTURES = '/tmp/modal-gerer-fixtures'
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

let produit = null // { id, designation, originaux: {...} }
let adminId = null
let idsImagesAvant = []

test.beforeAll(async () => {
  fs.mkdirSync(FIXTURES, { recursive: true })
  fs.writeFileSync(path.join(FIXTURES, 'test-1.png'), PNG_1X1)
  fs.writeFileSync(path.join(FIXTURES, 'test-2.png'), PNG_1X1)
  const admins = dbJson(
    "SELECT id_user FROM utilisateurs WHERE role = 'ADMIN' AND statut = 'ACTIF' LIMIT 1"
  )
  if (!admins.length) throw new Error('Aucun compte ADMIN actif dans la BDD de test')
  adminId = parseInt(admins[0][0], 10)
  // Produit complet (description, famille, slug, prix) avec >= 2 images,
  // de préférence BROUILLON ; à défaut un PUBLIE, remis BROUILLON pour le
  // test puis restauré (statut compris) en afterAll.
  const lignes = dbJson(
    "SELECT p.id_prd, p.designation_prd, p.statut_publication FROM produit p WHERE p.description IS NOT NULL AND p.description <> '' AND p.famille_id IS NOT NULL AND p.slug_prd IS NOT NULL AND p.prix_vente IS NOT NULL AND (SELECT COUNT(*) FROM image_produit i WHERE i.prd_id = p.id_prd) >= 2 ORDER BY p.statut_publication = 'BROUILLON' DESC, p.id_prd LIMIT 1"
  )
  if (!lignes.length) throw new Error('Aucun produit complet avec >= 2 images trouvé pour le test')
  const id = parseInt(lignes[0][0], 10)
  const orig = dbJson(
    `SELECT intitule_publication, poids_grammes, longueur_cm, largeur_cm, hauteur_cm, famille_id, description, description_ar, est_mis_en_avant FROM produit WHERE id_prd = ${id}`
  )[0]
  produit = {
    id,
    designation: lignes[0][1],
    statutOrigine: lignes[0][2],
    originaux: {
      intitule: orig[0] === 'NULL' ? null : orig[0],
      poids: orig[1],
      longueur: orig[2],
      largeur: orig[3],
      hauteur: orig[4],
      famille: orig[5],
      description: orig[6] === 'NULL' ? null : orig[6],
      descriptionAr: orig[7] === 'NULL' ? null : orig[7],
      misEnAvant: orig[8]
    }
  }
  idsImagesAvant = dbJson(`SELECT id_img FROM image_produit WHERE prd_id = ${id}`).map(r => r[0])
  db(
    `UPDATE produit SET statut_publication = 'BROUILLON', intitule_publication = NULL, poids_grammes = 6000, longueur_cm = NULL, largeur_cm = NULL, hauteur_cm = NULL WHERE id_prd = ${id}`
  )
})

test.afterAll(async () => {
  if (!produit) return
  const o = produit.originaux
  const sqlVal = v => (v === null || v === undefined || v === 'NULL' ? 'NULL' : JSON.stringify(String(v)))
  db(
    `UPDATE produit SET statut_publication = '${produit.statutOrigine}', intitule_publication = ${sqlVal(o.intitule)}, poids_grammes = ${o.poids === 'NULL' ? 'NULL' : o.poids}, longueur_cm = ${o.longueur === 'NULL' ? 'NULL' : o.longueur}, largeur_cm = ${o.largeur === 'NULL' ? 'NULL' : o.largeur}, hauteur_cm = ${o.hauteur === 'NULL' ? 'NULL' : o.hauteur}, famille_id = ${o.famille === 'NULL' ? 'NULL' : o.famille}, description = ${sqlVal(o.description)}, description_ar = ${sqlVal(o.descriptionAr)}, est_mis_en_avant = ${o.misEnAvant} WHERE id_prd = ${produit.id}`
  )
  // Suppression des images ajoutées par le test (via API = aussi Cloudinary).
  const apres = dbJson(`SELECT id_img FROM image_produit WHERE prd_id = ${produit.id}`).map(r => r[0])
  const nouvelles = apres.filter(id => !idsImagesAvant.includes(id))
  const token = jwt.sign({ id: adminId, role: 'ADMIN' }, secret('JWT_SECRET'), { expiresIn: '15m' })
  for (const idImg of nouvelles) {
    try {
      execSync(
        `curl -s -o /dev/null -w "%{http_code}" -X DELETE http://localhost:3001/api/produits/${produit.id}/images/${idImg} -H "Authorization: Bearer ${token}"`,
        { encoding: 'utf8' }
      )
    } catch (e) {
      // Nettoyage best-effort : ne pas faire échouer le rapport.
    }
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

test.describe('modal Gérer — 11 points', () => {
  test('scénarios (a) à (g)', async ({ page }) => {
    const appelsCloudinary = []
    const appelsUpload = []
    page.on('request', req => {
      const url = req.url()
      if (url.includes('cloudinary')) appelsCloudinary.push(url)
      if (url.includes('/images/upload')) appelsUpload.push(url)
    })
    // Cloudinary n'est PAS configuré dans le backend/.env de la VM (503
    // « Cloudinary n'est pas configuré ») : l'upload réel est mocké en 200
    // pour vérifier le flux de succès côté frontend. Le cas d'échec réel
    // (503) est couvert par modal-gerer-upload-echec.spec.js.
    await page.route('**/api/produits/*/images/upload', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    )

    await page.goto('/ecommerce/produits')
    await page.getByPlaceholder('Rechercher un produit...').fill(produit.designation)
    await page.waitForTimeout(1500)
    const ligne = page.locator('tr', { hasText: produit.designation }).first()
    await expect(ligne).toBeVisible()

    // (a) Publier sans intitulé → bloqué, message listant l'intitulé.
    const boutonPublier = ligne.getByRole('button', { name: `Publier ${produit.designation}` })
    await expect(boutonPublier).toBeDisabled()
    // Le bouton désactivé est enveloppé dans un <span> (MUI Tooltip) : c'est
    // lui qui reçoit le survol ; son aria-label porte déjà le message.
    const enveloppe = ligne.locator('span[aria-label^="Publication impossible"]')
    await expect(enveloppe).toHaveAttribute(
      'aria-label',
      'Publication impossible, il manque : un intitulé de publication, les dimensions du colis (poids > 5 kg)'
    )
    await enveloppe.hover()
    await expect(page.locator('.MuiTooltip-popper')).toContainText('un intitulé de publication')
    await expect(page.locator('.MuiTooltip-popper')).toContainText('les dimensions du colis (poids > 5 kg)')

    // Ouverture du modal.
    await ligne.getByRole('button', { name: `Gérer ${produit.designation}` }).click()
    const modal = page.getByRole('dialog').first()
    await expect(modal.getByText('Produit', { exact: true }).first()).toBeVisible()

    // (b) Poids 6000 sans dimensions → volumétrique « — », puis 50×40×30 → 12 kg.
    await expect(modal.getByLabel('Poids (grammes)')).toHaveValue('6000')
    await expect(modal.getByText(/Poids volumétrique : —/)).toBeVisible()
    await modal.getByLabel('Longueur (cm)').fill('50')
    await modal.getByLabel('Largeur (cm)').fill('40')
    await modal.getByLabel('Hauteur (cm)').fill('30')
    await expect(modal.getByText(/Poids volumétrique : 12 kg — Poids facturé : 12 kg/)).toBeVisible()

    // Intitulé (requis pour publier ensuite) + famille (c) : accordéon —
    // le parent est sélectionnable, le chevron déplie les enfants.
    await modal.getByLabel('Intitulé de publication').fill('Intitulé E2E modal Gérer')
    const parent = dbJson(
      'SELECT id_famille, nom_famille FROM famille_produit WHERE famille_parente_id IS NULL ORDER BY ordre_famille, nom_famille LIMIT 1'
    )[0]
    const champFamille = modal.getByLabel('Famille')
    await champFamille.click()
    const popover = page.locator('.MuiPopover-paper')
    await expect(popover.getByTestId('option-famille-aucune')).toBeVisible()
    // Le parent est sélectionnable directement (sans déplier).
    await popover.getByTestId(`option-famille-${parent[0]}`).click()
    await expect(champFamille).toHaveValue(parent[1])

    // (d) Dépôt de 2 images → aperçu immédiat, 0 appel réseau avant Enregistrer.
    await modal.getByRole('tab', { name: 'Images' }).click()
    await modal.locator('input[type="file"]').setInputFiles([
      path.join(FIXTURES, 'test-1.png'),
      path.join(FIXTURES, 'test-2.png')
    ])
    await expect(modal.getByText('À téléverser')).toHaveCount(2)
    expect(appelsCloudinary.length).toBe(0)
    expect(appelsUpload.length).toBe(0)

    // (e) Enregistrer → 1 seul toast + modal toujours ouvert.
    await modal.getByRole('button', { name: 'Enregistrer', exact: true }).click()
    await expect(page.getByText('Modifications enregistrées')).toBeVisible()
    await expect(page.getByText('Produit mis à jour')).toHaveCount(0)
    await expect(page.getByText('Prix mis à jour')).toHaveCount(0)
    await expect(page.getByText('Image téléversée')).toHaveCount(0)
    await expect(page.getByText('téléversée')).toHaveCount(0)
    await expect(modal).toBeVisible()
    // Les images locales téléversées (mock 200) ont quitté la file.
    await expect(modal.getByText('À téléverser')).toHaveCount(0)
    // L'upload a bien eu lieu à Enregistrer (2 appels), jamais avant.
    expect(appelsUpload.length).toBe(2)
    expect(appelsCloudinary.length).toBe(0)
    await modal.getByRole('tab', { name: 'Prix' }).click()
    await expect(modal.getByText('Aide à la décision')).toBeVisible()

    // Fermer le modal, la publication est maintenant possible.
    await modal.getByRole('button', { name: 'Annuler' }).click()
    await expect(modal).toBeHidden()
    await page.waitForTimeout(1000)
    const ligne2 = page.locator('tr', { hasText: produit.designation }).first()
    const boutonPublier2 = ligne2.getByRole('button', { name: `Publier ${produit.designation}` })
    await expect(boutonPublier2).toBeEnabled()

    // (f) Publier → ConfirmDialog + toast « publié et visible ».
    await boutonPublier2.click()
    await expect(page.getByText('Publier ce produit ?')).toBeVisible()
    await expect(page.getByText(/La publication exige : intitulé, description, famille/)).toBeVisible()
    await page.getByRole('button', { name: 'Publier', exact: true }).click()
    await expect(page.getByText('Produit publié — visible dans la boutique')).toBeVisible()
    await expect(page.getByText('Produit mis à jour')).toHaveCount(0)
    await expect(ligne2.getByText('PUBLIÉ')).toBeVisible()

    // (g) Dépublier → ConfirmDialog + toast « retiré de la boutique ».
    await ligne2.getByRole('button', { name: `Dépublier ${produit.designation}` }).click()
    await expect(page.getByText('Dépublier ce produit ?')).toBeVisible()
    await expect(page.getByText(/sera retiré de la boutique/)).toBeVisible()
    await page.getByRole('button', { name: 'Dépublier', exact: true }).click()
    await expect(page.getByText('Produit retiré de la boutique')).toBeVisible()
    await expect(ligne2.getByText('BROUILLON')).toBeVisible()
  })

  test('poids vide : après Enregistrer, 200 g stockés et affichés à la réouverture', async ({ page }) => {
    db(
      `UPDATE produit SET poids_grammes = NULL, longueur_cm = NULL, largeur_cm = NULL, hauteur_cm = NULL WHERE id_prd = ${produit.id}`
    )
    try {
      await page.goto('/ecommerce/produits')
      await page.getByPlaceholder('Rechercher un produit...').fill(produit.designation)
      await page.waitForTimeout(1500)
      const ligne = page.locator('tr', { hasText: produit.designation }).first()
      await expect(ligne).toBeVisible()
      await ligne.getByRole('button', { name: `Gérer ${produit.designation}` }).click()
      const modal = page.getByRole('dialog').first()
      await expect(modal.getByText('Produit', { exact: true }).first()).toBeVisible()
      // Champ vide : plus de hint « par défaut », poids facturé « — ».
      await expect(modal.getByLabel('Poids (grammes)')).toHaveValue('')
      await expect(modal.getByText('Vide : 200 g par défaut')).toHaveCount(0)
      await expect(modal.getByText(/Poids volumétrique : — — Poids facturé : —/)).toBeVisible()
      // Une modification (intitulé) force l'envoi : le poids vide part en
      // null et le backend stocke 200.
      await modal.getByLabel('Intitulé de publication').fill('Intitulé E2E poids défaut')
      await modal.getByRole('button', { name: 'Enregistrer', exact: true }).click()
      await expect(page.getByText('Modifications enregistrées')).toBeVisible()
      await expect(modal).toBeVisible()
      expect(db(`SELECT poids_grammes FROM produit WHERE id_prd = ${produit.id}`)).toBe('200')
      // À la réouverture, le champ affiche la valeur stockée (200).
      await modal.getByRole('button', { name: 'Annuler' }).click()
      await expect(modal).toBeHidden()
      await ligne.getByRole('button', { name: `Gérer ${produit.designation}` }).click()
      const modal2 = page.getByRole('dialog').first()
      await expect(modal2.getByText('Produit', { exact: true }).first()).toBeVisible()
      await expect(modal2.getByLabel('Poids (grammes)')).toHaveValue('200')
      await expect(modal2.getByText(/Poids volumétrique : — — Poids facturé : 0,2 kg/)).toBeVisible()
      await modal2.getByRole('button', { name: 'Annuler' }).click()
      await expect(modal2).toBeHidden()
    } finally {
      db(`UPDATE produit SET poids_grammes = 6000, intitule_publication = NULL WHERE id_prd = ${produit.id}`)
    }
  })

  test('commande boutique sans poids : acceptée, 200 g stockés sur le produit', async ({ page, request }) => {
    // Produit complet (slug, prix, stock) sans poids, publié pour la boutique.
    const slug = db(`SELECT slug_prd FROM produit WHERE id_prd = ${produit.id}`)
    db(
      `UPDATE produit SET poids_grammes = NULL, intitule_publication = 'Intitulé E2E poids défaut', statut_publication = 'PUBLIE' WHERE id_prd = ${produit.id}`
    )
    try {
      const reponse = await request.post('http://localhost:3001/api/public/commandes', {
        data: {
          nom_client: 'Client Test E2E',
          telephone: '0550123456',
          wilaya: 'Tizi Ouzou',
          code_wilaya: 15,
          commune: 'Tizi Ouzou',
          adresse_exacte: 'Rue test',
          type_livraison: 'DOMICILE',
          lignes: [{ slug, quantite: 1 }]
        }
      })
      expect(reponse.status()).toBe(201)
      const corps = await reponse.json()
      // Le défaut a été écrit une fois sur le produit (frais calculés dessus).
      expect(db(`SELECT poids_grammes FROM produit WHERE id_prd = ${produit.id}`)).toBe('200')
      // Annulation : libère le stock réservé (qte_reservee).
      const token = jwt.sign({ id: adminId, role: 'ADMIN' }, secret('JWT_SECRET'), { expiresIn: '15m' })
      const annulation = await request.patch(
        `http://localhost:3001/api/commandes-web/${corps.id_cmd_web}/annuler`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      expect(annulation.status()).toBe(200)
    } finally {
      db(
        `UPDATE produit SET statut_publication = 'BROUILLON', intitule_publication = NULL, poids_grammes = 6000 WHERE id_prd = ${produit.id}`
      )
    }
  })

  test('aucune erreur rouge à l’ouverture, checklist live, erreur après blur', async ({ page }) => {
    db(
      `UPDATE produit SET intitule_publication = NULL, poids_grammes = 6000, longueur_cm = NULL, largeur_cm = NULL, hauteur_cm = NULL WHERE id_prd = ${produit.id}`
    )
    try {
      await page.goto('/ecommerce/produits')
      await page.getByPlaceholder('Rechercher un produit...').fill(produit.designation)
      await page.waitForTimeout(1500)
      const ligne = page.locator('tr', { hasText: produit.designation }).first()
      await expect(ligne).toBeVisible()
      await ligne.getByRole('button', { name: `Gérer ${produit.designation}` }).click()
      const modal = page.getByRole('dialog').first()
      await expect(modal.getByText('Produit', { exact: true }).first()).toBeVisible()

      // (1) Aucune erreur rouge à l'ouverture (intitulé vide, slug sans erreur).
      await expect(modal.getByText('Intitulé requis pour publier.')).toHaveCount(0)
      await expect(modal.getByLabel('Intitulé de publication')).toHaveAttribute('aria-invalid', 'false')
      // (2) Checklist live : intitulé manquant, le reste rempli (produit
      // complet, >= 2 images). Ancienne phrase statique disparue.
      const checklist = modal.getByTestId('checklist-publication')
      await expect(checklist.getByTestId('condition-intitule')).toHaveAttribute('data-etat', 'manquant')
      await expect(checklist.getByTestId('condition-description')).toHaveAttribute('data-etat', 'rempli')
      await expect(checklist.getByTestId('condition-famille')).toHaveAttribute('data-etat', 'rempli')
      await expect(checklist.getByTestId('condition-slug')).toHaveAttribute('data-etat', 'rempli')
      await expect(checklist.getByTestId('condition-prix')).toHaveAttribute('data-etat', 'rempli')
      await expect(checklist.getByTestId('condition-images')).toHaveAttribute('data-etat', 'rempli')
      await expect(modal.getByText('Si le produit ne remplit plus ces conditions')).toHaveCount(0)
      await expect(checklist.getByText(/n’est pas visible en boutique/)).toBeVisible()

      // (1 suite) Blur sur le champ vide → l'erreur apparaît.
      await modal.getByLabel('Intitulé de publication').click()
      await modal.getByLabel('Slug (URL boutique)').click()
      await expect(modal.getByText('Intitulé requis pour publier.')).toBeVisible()
      await expect(modal.getByLabel('Intitulé de publication')).toHaveAttribute('aria-invalid', 'true')
      // (2 suite) Remplir l'intitulé → checklist à jour, erreur disparue.
      await modal.getByLabel('Intitulé de publication').fill('Intitulé E2E checklist')
      await expect(checklist.getByTestId('condition-intitule')).toHaveAttribute('data-etat', 'rempli')
      await expect(modal.getByText('Intitulé requis pour publier.')).toHaveCount(0)

      await modal.getByRole('button', { name: 'Annuler' }).click()
      await expect(modal).toBeHidden()
    } finally {
      db(`UPDATE produit SET intitule_publication = NULL, poids_grammes = 6000 WHERE id_prd = ${produit.id}`)
    }
  })

  test('onglet Prix : aide sans devise, montants à 2 décimales, colonnes de même hauteur', async ({ page }) => {
    db(
      `UPDATE produit SET intitule_publication = NULL, poids_grammes = 6000, longueur_cm = NULL, largeur_cm = NULL, hauteur_cm = NULL WHERE id_prd = ${produit.id}`
    )
    try {
      await page.goto('/ecommerce/produits')
      await page.getByPlaceholder('Rechercher un produit...').fill(produit.designation)
      await page.waitForTimeout(1500)
      const ligne = page.locator('tr', { hasText: produit.designation }).first()
      await expect(ligne).toBeVisible()
      await ligne.getByRole('button', { name: `Gérer ${produit.designation}` }).click()
      const modal = page.getByRole('dialog').first()
      await expect(modal.getByText('Produit', { exact: true }).first()).toBeVisible()
      await modal.getByRole('tab', { name: 'Prix' }).click()
      const aide = modal.getByTestId('aide-decision')
      await expect(aide).toBeVisible()

      // (3) Pas de ligne devise.
      await expect(aide.getByText('en devise')).toHaveCount(0)
      // Tous les montants de la carte ont exactement 2 décimales
      // (U+202F espace fine insécable et U+00A0 normalisés avant le test).
      const texteAide = (await aide.innerText()).replace(/[\u202F\u00A0]/g, ' ')
      const montants = texteAide.match(/[\d ]+,\d+ DZD/g) || []
      expect(montants.length).toBeGreaterThanOrEqual(2)
      for (const montant of montants) {
        expect(montant).toMatch(/,\d{2} DZD$/)
      }
      // Exactement 2 lignes : achat moyen TTC + vente moyenne (Marge et
      // Paliers retirés).
      await expect(aide.getByText(/Prix d’achat moyen/)).toBeVisible()
      await expect(aide.getByText('Prix de vente moyen')).toBeVisible()
      await expect(aide.getByText('Marge moyenne')).toHaveCount(0)
      await expect(aide.getByText('Paliers de prix')).toHaveCount(0)

      // (4) Les deux colonnes ont exactement la même hauteur (± 2 px).
      const gauche = await modal.getByTestId('colonne-prix-gauche').boundingBox()
      const droite = await modal.getByTestId('colonne-prix-droite').boundingBox()
      expect(gauche).not.toBeNull()
      expect(droite).not.toBeNull()
      expect(Math.abs(gauche.height - droite.height)).toBeLessThanOrEqual(2)

      // (f) Champ prix de même largeur que les champs de paliers (± 2 px).
      const champPrix = await modal.getByLabel('Prix de vente (DZD)').boundingBox()
      const champPalier = await modal.getByLabel('Quantité minimum (pièces)').boundingBox()
      expect(champPrix).not.toBeNull()
      expect(champPalier).not.toBeNull()
      expect(Math.abs(champPrix.width - champPalier.width)).toBeLessThanOrEqual(2)

      await modal.getByRole('button', { name: 'Annuler' }).click()
      await expect(modal).toBeHidden()
    } finally {
      db(`UPDATE produit SET intitule_publication = NULL, poids_grammes = 6000 WHERE id_prd = ${produit.id}`)
    }
  })

  test('enregistrement état capture : intitulé + slug, description vide, famille aucune, poids 150', async ({
    page
  }) => {
    // État exact de la capture de RABAH (produit 245, machine du boulot) :
    // intitulé + slug remplis, description vide, famille « Aucune »,
    // poids 150, dimensions vides. L'enregistrement ne doit plus échouer
    // avec « Invalid `prisma.produit.update()` ».
    const avant = dbJson(
      `SELECT slug_prd, prix_vente FROM produit WHERE id_prd = ${produit.id}`
    )[0]
    db(
      `UPDATE produit SET description = NULL, description_ar = NULL, famille_id = NULL, poids_grammes = 150, longueur_cm = NULL, largeur_cm = NULL, hauteur_cm = NULL, slug_prd = NULL, intitule_publication = NULL WHERE id_prd = ${produit.id}`
    )
    try {
      await page.goto('/ecommerce/produits')
      await page.getByPlaceholder('Rechercher un produit...').fill(produit.designation)
      await page.waitForTimeout(1500)
      const ligne = page.locator('tr', { hasText: produit.designation }).first()
      await expect(ligne).toBeVisible()
      await ligne.getByRole('button', { name: `Gérer ${produit.designation}` }).click()
      const modal = page.getByRole('dialog').first()
      await expect(modal.getByText('Produit', { exact: true }).first()).toBeVisible()
      await modal.getByLabel('Intitulé de publication').fill('Adaptateur Onten OTN-UCA303 adaptateur hybride 3 en 2')
      await modal.getByLabel('Slug (URL boutique)').fill('adaptateur-onten-uca303')
      await modal.getByRole('button', { name: 'Enregistrer', exact: true }).click()
      await expect(page.getByText('Modifications enregistrées')).toBeVisible()
      // Aucun toast d'erreur Prisma (ni brut, ni traduit).
      await expect(page.getByText(/Invalid `prisma/)).toHaveCount(0)
      await expect(page.getByText(/Unknown argument/)).toHaveCount(0)
      await expect(modal).toBeVisible()
      // BDD mise à jour comme dans la capture.
      const apres = dbJson(
        `SELECT slug_prd, intitule_publication, description, famille_id, poids_grammes, longueur_cm, largeur_cm, hauteur_cm FROM produit WHERE id_prd = ${produit.id}`
      )[0]
      expect(apres[0]).toBe('adaptateur-onten-uca303')
      expect(apres[1]).toBe('Adaptateur Onten OTN-UCA303 adaptateur hybride 3 en 2')
      expect(apres[2]).toBe('NULL')
      expect(apres[3]).toBe('NULL')
      expect(apres[4]).toBe('150')
      expect(apres[5]).toBe('NULL')
      expect(apres[6]).toBe('NULL')
      expect(apres[7]).toBe('NULL')
      await modal.getByRole('button', { name: 'Annuler' }).click()
      await expect(modal).toBeHidden()
    } finally {
      const o = produit.originaux
      const sqlVal = v => (v === null || v === undefined || v === 'NULL' ? 'NULL' : JSON.stringify(String(v)))
      db(
        `UPDATE produit SET slug_prd = ${sqlVal(avant[0])}, prix_vente = ${avant[1] === 'NULL' ? 'NULL' : avant[1]}, description = ${sqlVal(o.description)}, description_ar = ${sqlVal(o.descriptionAr)}, famille_id = ${o.famille === 'NULL' ? 'NULL' : o.famille}, poids_grammes = 6000, intitule_publication = NULL WHERE id_prd = ${produit.id}`
      )
    }
  })

  test('enregistrement brouillon avec prix vide : aucune erreur rouge', async ({ page }) => {
    const prixOrigine = db(`SELECT prix_vente FROM produit WHERE id_prd = ${produit.id}`)
    db(`UPDATE produit SET prix_vente = NULL WHERE id_prd = ${produit.id}`)
    try {
      await page.goto('/ecommerce/produits')
      await page.getByPlaceholder('Rechercher un produit...').fill(produit.designation)
      await page.waitForTimeout(1500)
      const ligne = page.locator('tr', { hasText: produit.designation }).first()
      await expect(ligne).toBeVisible()
      await ligne.getByRole('button', { name: `Gérer ${produit.designation}` }).click()
      const modal = page.getByRole('dialog').first()
      await expect(modal.getByText('Produit', { exact: true }).first()).toBeVisible()
      // Une modification (intitulé) force l'envoi : l'enregistrement est
      // une sauvegarde brouillon, pas une publication.
      await modal.getByLabel('Intitulé de publication').fill('Intitulé E2E prix vide')
      await modal.getByRole('button', { name: 'Enregistrer', exact: true }).click()
      await expect(page.getByText('Modifications enregistrées')).toBeVisible()
      // Aucune erreur « requis pour publier », sur aucun champ non touché.
      await expect(modal.getByText(/requis pour publier\./)).toHaveCount(0)
      // Le prix reste vide en base (brouillon, pas de valeur forcée).
      expect(db(`SELECT prix_vente FROM produit WHERE id_prd = ${produit.id}`)).toBe('NULL')
      // Même en ouvrant l'onglet Prix, le champ n'est pas en erreur.
      await modal.getByRole('tab', { name: 'Prix' }).click()
      await expect(modal.getByText('Prix requis pour publier.')).toHaveCount(0)
      await expect(modal.getByLabel('Prix de vente (DZD)')).toHaveAttribute('aria-invalid', 'false')
      await modal.getByRole('button', { name: 'Annuler' }).click()
      await expect(modal).toBeHidden()
    } finally {
      db(
        `UPDATE produit SET prix_vente = ${prixOrigine === 'NULL' ? 'NULL' : prixOrigine}, intitule_publication = NULL WHERE id_prd = ${produit.id}`
      )
    }
  })

  test('checklist adoucie : manquant en ambre, jamais de rouge', async ({ page }) => {
    db(
      `UPDATE produit SET intitule_publication = NULL, poids_grammes = 6000, longueur_cm = NULL, largeur_cm = NULL, hauteur_cm = NULL WHERE id_prd = ${produit.id}`
    )
    try {
      await page.goto('/ecommerce/produits')
      await page.getByPlaceholder('Rechercher un produit...').fill(produit.designation)
      await page.waitForTimeout(1500)
      const ligne = page.locator('tr', { hasText: produit.designation }).first()
      await expect(ligne).toBeVisible()
      await ligne.getByRole('button', { name: `Gérer ${produit.designation}` }).click()
      const modal = page.getByRole('dialog').first()
      await expect(modal.getByText('Produit', { exact: true }).first()).toBeVisible()
      const checklist = modal.getByTestId('checklist-publication')
      // Manquant : pastille vide + « À compléter », jamais de ✗ rouge.
      // (Plusieurs conditions peuvent manquer à la fois — poids 6000 sans
      // dimensions — donc on cible la condition intitulé.)
      const conditionIntitule = checklist.getByTestId('condition-intitule')
      await expect(conditionIntitule).toHaveAttribute('data-etat', 'manquant')
      await expect(conditionIntitule.getByText('À compléter')).toBeVisible()
      await expect(modal.getByText('✗')).toHaveCount(0)
      // La mention « À compléter » n'est pas en rouge (couleur erreur MUI).
      const couleur = await conditionIntitule
        .getByText('À compléter')
        .evaluate(el => getComputedStyle(el).color)
      expect(couleur).not.toBe('rgb(211, 47, 47)')
      // Phrase neutre sur la visibilité en boutique.
      await expect(
        checklist.getByText(/Ces éléments sont nécessaires pour publier\. S’il en manque un/)
      ).toBeVisible()
      // Les conditions remplies gardent leur ✓ verte.
      await expect(checklist.getByTestId('condition-description')).toHaveAttribute('data-etat', 'rempli')
      await modal.getByRole('button', { name: 'Annuler' }).click()
      await expect(modal).toBeHidden()
    } finally {
      db(`UPDATE produit SET intitule_publication = NULL, poids_grammes = 6000 WHERE id_prd = ${produit.id}`)
    }
  })

  test('checklist en pied de modal : 2 lignes, visible sur tous les onglets, clic vers l’onglet', async ({
    page
  }) => {
    // Poids 500 g : 6 conditions exactement (pas de 7e « Dimensions ») → 2 lignes de 3.
    db(`UPDATE produit SET poids_grammes = 500 WHERE id_prd = ${produit.id}`)
    try {
      await page.goto('/ecommerce/produits')
      await page.getByPlaceholder('Rechercher un produit...').fill(produit.designation)
      await page.waitForTimeout(1500)
      const ligne = page.locator('tr', { hasText: produit.designation }).first()
      await expect(ligne).toBeVisible()
      await ligne.getByRole('button', { name: `Gérer ${produit.designation}` }).click()
      const modal = page.getByRole('dialog').first()
      await expect(modal.getByText('Produit', { exact: true }).first()).toBeVisible()

      // (1) La checklist est dans le pied du modal, à gauche des boutons.
      const pied = modal.locator('.MuiDialogActions-root')
      const checklist = pied.getByTestId('checklist-publication')
      await expect(checklist).toBeVisible()
      await expect(pied.getByRole('button', { name: 'Annuler' })).toBeVisible()
      await expect(pied.getByRole('button', { name: 'Enregistrer et fermer' })).toBeVisible()
      await expect(pied.getByRole('button', { name: 'Enregistrer', exact: true })).toBeVisible()
      // La checklist est à gauche des boutons (même pied, x inférieur).
      const xChecklist = (await checklist.boundingBox()).x
      const xBoutons = (await pied.getByRole('button', { name: 'Enregistrer', exact: true }).boundingBox()).x
      expect(xChecklist).toBeLessThan(xBoutons)

      // (2) 2 lignes de 3 conditions : les 3 premières partagent (à 1 px
      // près — le positionnement sous-pixel du Dialog peut décaler
      // l'arrondi) la même ordonnée, les 3 suivantes une ordonnée inférieure.
      const conditions = ['intitule', 'description', 'famille', 'slug', 'prix', 'images']
      const boites = []
      for (const cle of conditions) {
        boites.push(await checklist.getByTestId(`condition-${cle}`).boundingBox())
      }
      expect(boites.every(b => b !== null)).toBe(true)
      const y1 = boites[0].y
      const y2 = boites[3].y
      for (const i of [1, 2]) expect(Math.abs(boites[i].y - y1)).toBeLessThanOrEqual(1)
      for (const i of [4, 5]) expect(Math.abs(boites[i].y - y2)).toBeLessThanOrEqual(1)
      expect(y2 - y1).toBeGreaterThan(10)

      // (3) Clic sur une condition → l'onglet concerné s'ouvre, et la
      // checklist reste visible (elle est dans le pied, pas dans le corps).
      await checklist.getByTestId('condition-prix').click()
      await expect(modal.getByRole('tab', { name: 'Prix' })).toHaveAttribute('aria-selected', 'true')
      await expect(modal.getByText('Aide à la décision')).toBeVisible()
      await expect(checklist).toBeVisible()
      await checklist.getByTestId('condition-images').click()
      await expect(modal.getByRole('tab', { name: 'Images' })).toHaveAttribute('aria-selected', 'true')
      await expect(modal.getByTestId('grille-images')).toBeVisible()
      await expect(checklist).toBeVisible()
      await checklist.getByTestId('condition-intitule').click()
      await expect(modal.getByRole('tab', { name: 'Info' })).toHaveAttribute('aria-selected', 'true')
      await expect(checklist).toBeVisible()

      await modal.getByRole('button', { name: 'Annuler' }).click()
      await expect(modal).toBeHidden()
    } finally {
      db(`UPDATE produit SET poids_grammes = 6000 WHERE id_prd = ${produit.id}`)
    }
  })

  test('famille : accordéon, déplier, choisir enfant, choisir parent, retirer', async ({ page }) => {
    const parent = dbJson(
      'SELECT id_famille, nom_famille FROM famille_produit WHERE EXISTS (SELECT 1 FROM famille_produit e WHERE e.famille_parente_id = famille_produit.id_famille) ORDER BY id_famille LIMIT 1'
    )[0]
    const enfant = dbJson(
      `SELECT id_famille, nom_famille FROM famille_produit WHERE famille_parente_id = ${parent[0]} ORDER BY id_famille LIMIT 1`
    )[0]
    await page.goto('/ecommerce/produits')
    await page.getByPlaceholder('Rechercher un produit...').fill(produit.designation)
    await page.waitForTimeout(1500)
    const ligne = page.locator('tr', { hasText: produit.designation }).first()
    await expect(ligne).toBeVisible()
    await ligne.getByRole('button', { name: `Gérer ${produit.designation}` }).click()
    const modal = page.getByRole('dialog').first()
    await expect(modal.getByText('Produit', { exact: true }).first()).toBeVisible()
    const champFamille = modal.getByLabel('Famille')
    const popover = page.locator('.MuiPopover-paper')

    // Ouvrir : « Aucune famille » en tête de liste, parents visibles.
    await champFamille.click()
    await expect(popover.getByTestId('option-famille-aucune')).toBeVisible()
    await expect(popover.getByTestId(`option-famille-${parent[0]}`)).toBeVisible()

    // Déplier le parent (chevron) puis choisir l'enfant. Le chevron est
    // ciblé dans la ligne du parent : son nom accessible est aussi repris
    // dans le nom de la ligne (strict mode sinon).
    await popover
      .getByTestId(`option-famille-${parent[0]}`)
      .getByRole('button', { name: `Déplier ${parent[1]}` })
      .click()
    await expect(popover.getByTestId(`option-famille-${enfant[0]}`)).toBeVisible()
    await popover.getByTestId(`option-famille-${enfant[0]}`).click()
    await expect(champFamille).toHaveValue(enfant[1])

    // Le parent est sélectionnable directement (sans déplier).
    await champFamille.click()
    await popover.getByTestId(`option-famille-${parent[0]}`).click()
    await expect(champFamille).toHaveValue(parent[1])

    // Retirer la famille.
    await champFamille.click()
    await popover.getByTestId('option-famille-aucune').click()
    await expect(champFamille).toHaveValue('')
    await modal.getByRole('button', { name: 'Annuler' }).click()
    await expect(modal).toBeHidden()
  })

  test('onglet Images : grille de tuiles, 7 emplacements', async ({ page }) => {
    const nbImages = parseInt(db(`SELECT COUNT(*) FROM image_produit WHERE prd_id = ${produit.id}`), 10)
    expect(nbImages).toBeGreaterThanOrEqual(2)
    await page.goto('/ecommerce/produits')
    await page.getByPlaceholder('Rechercher un produit...').fill(produit.designation)
    await page.waitForTimeout(1500)
    const ligne = page.locator('tr', { hasText: produit.designation }).first()
    await expect(ligne).toBeVisible()
    await ligne.getByRole('button', { name: `Gérer ${produit.designation}` }).click()
    const modal = page.getByRole('dialog').first()
    await expect(modal.getByText('Produit', { exact: true }).first()).toBeVisible()
    await modal.getByRole('tab', { name: 'Images' }).click()
    const grille = modal.getByTestId('grille-images')
    await expect(grille).toBeVisible()
    // 7 emplacements au total : tuiles remplies + tuiles vides en pointillés.
    await expect(grille.locator('img')).toHaveCount(nbImages)
    await expect(modal.getByTestId('emplacement-image-vide')).toHaveCount(7 - nbImages)
    // Dépôt d'une image → nouvelle tuile avec numéro + « À téléverser ».
    await modal.locator('input[type="file"]').setInputFiles([path.join(FIXTURES, 'test-1.png')])
    await expect(modal.getByText('À téléverser')).toHaveCount(1)
    await expect(grille.locator('img')).toHaveCount(nbImages + 1)
    await expect(modal.getByTestId('emplacement-image-vide')).toHaveCount(7 - nbImages - 1)
    // Annuler sans enregistrer : l'image locale ne part pas en base.
    await modal.getByRole('button', { name: 'Annuler' }).click()
    await expect(modal).toBeHidden()
    expect(db(`SELECT COUNT(*) FROM image_produit WHERE prd_id = ${produit.id}`)).toBe(String(nbImages))
  })

  test('tri liste : publier fait descendre la ligne sans rechargement', async ({ page }) => {
    // Le fixture est BROUILLON avec intitulé NULL et poids 6000 sans
    // dimensions : la publication exige intitulé + dimensions.
    db(
      `UPDATE produit SET intitule_publication = 'Intitulé tri E2E', longueur_cm = 50, largeur_cm = 40, hauteur_cm = 30 WHERE id_prd = ${produit.id}`
    )
    try {
      await page.goto('/ecommerce/produits')
      await page.waitForTimeout(1500)
      const lignes = page.locator('tbody tr')
      const indexAvant = await lignes.evaluateAll(
        (trs, designation) => trs.findIndex(tr => tr.textContent.includes(designation)),
        produit.designation
      )
      expect(indexAvant).toBeGreaterThanOrEqual(0)
      const ligne = page.locator('tr', { hasText: produit.designation }).first()
      await ligne.getByRole('button', { name: `Publier ${produit.designation}` }).click()
      await expect(page.getByText('Publier ce produit ?')).toBeVisible()
      await page.getByRole('button', { name: 'Publier', exact: true }).click()
      await expect(page.getByText('Produit publié — visible dans la boutique')).toBeVisible()
      // Sans rechargement de page : la ligne a changé de place (un PUBLIE
      // descend parmi les PUBLIEs, après les BROUILLONs en stock).
      const indexApres = await lignes.evaluateAll(
        (trs, designation) => trs.findIndex(tr => tr.textContent.includes(designation)),
        produit.designation
      )
      expect(indexApres).toBeGreaterThan(indexAvant)
      await expect(
        page.locator('tr', { hasText: produit.designation }).first().getByText('PUBLIÉ')
      ).toBeVisible()
      // Dépublier pour laisser le fixture comme avant le test.
      await page
        .locator('tr', { hasText: produit.designation })
        .first()
        .getByRole('button', { name: `Dépublier ${produit.designation}` })
        .click()
      await expect(page.getByText('Dépublier ce produit ?')).toBeVisible()
      await page.getByRole('button', { name: 'Dépublier', exact: true }).click()
      await expect(page.getByText('Produit retiré de la boutique')).toBeVisible()
    } finally {
      db(
        `UPDATE produit SET intitule_publication = NULL, longueur_cm = NULL, largeur_cm = NULL, hauteur_cm = NULL WHERE id_prd = ${produit.id}`
      )
    }
  })

  test('images : glisser-déposer réordonne, la principale suit la 1re tuile et persiste', async ({ page }) => {
    const imagesAvant = dbJson(
      `SELECT id_img, ordre_image, est_principale FROM image_produit WHERE prd_id = ${produit.id} ORDER BY ordre_image, id_img`
    )
    expect(imagesAvant.length).toBeGreaterThanOrEqual(2)
    const ouvrirModalImages = async () => {
      await page.goto('/ecommerce/produits')
      await page.getByPlaceholder('Rechercher un produit...').fill(produit.designation)
      await page.waitForTimeout(1500)
      const ligne = page.locator('tr', { hasText: produit.designation }).first()
      await expect(ligne).toBeVisible()
      await ligne.getByRole('button', { name: `Gérer ${produit.designation}` }).click()
      const modal = page.getByRole('dialog').first()
      await expect(modal.getByText('Produit', { exact: true }).first()).toBeVisible()
      await modal.getByRole('tab', { name: 'Images' }).click()
      await expect(modal.getByTestId('grille-images')).toBeVisible()

      return modal
    }
    const srcsGrille = modal =>
      modal.getByTestId('grille-images').locator('img').evaluateAll(imgs => imgs.map(img => img.getAttribute('src')))
    const glisserTuile = (de, vers) =>
      page.evaluate(
        ({ de, vers }) => {
          const tuiles = [...document.querySelectorAll('[data-testid="grille-images"] [draggable="true"]')]
          const dt = new DataTransfer()
          tuiles[de].dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }))
          tuiles[vers].dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt }))
          tuiles[vers].dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }))
          tuiles[de].dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }))
        },
        { de, vers }
      )
    try {
      const modal = await ouvrirModalImages()
      const grille = modal.getByTestId('grille-images')
      const srcsAvant = await srcsGrille(modal)
      expect(srcsAvant.length).toBeGreaterThanOrEqual(2)
      // Glisser la tuile 2 sur la tuile 1 : l'ordre s'inverse.
      await glisserTuile(1, 0)
      const srcsApres = await srcsGrille(modal)
      expect(srcsApres[0]).toBe(srcsAvant[1])
      expect(srcsApres[1]).toBe(srcsAvant[0])
      // La pastille « Principale » a suivi la 1re tuile.
      await expect(grille.locator('[draggable="true"]').first().getByText('Principale')).toBeVisible()
      // Enregistrer puis rouvrir : l'ordre est conservé.
      await modal.getByRole('button', { name: 'Enregistrer', exact: true }).click()
      await expect(page.getByText('Modifications enregistrées')).toBeVisible()
      await modal.getByRole('button', { name: 'Annuler' }).click()
      await expect(modal).toBeHidden()
      const modal2 = await ouvrirModalImages()
      const srcsRouverts = await srcsGrille(modal2)
      expect(srcsRouverts[0]).toBe(srcsAvant[1])
      expect(srcsRouverts[1]).toBe(srcsAvant[0])
      const apres = dbJson(
        `SELECT id_img, ordre_image, est_principale FROM image_produit WHERE prd_id = ${produit.id} ORDER BY ordre_image, id_img`
      )
      expect(apres[0][0]).toBe(imagesAvant[1][0])
      expect(apres[0][2]).toBe('1')
      await modal2.getByRole('button', { name: 'Annuler' }).click()
      await expect(modal2).toBeHidden()
    } finally {
      // Restaurer l'ordre et la principale d'origine en base.
      imagesAvant.forEach(([id, ordre, principale]) => {
        db(`UPDATE image_produit SET ordre_image = ${ordre}, est_principale = ${principale} WHERE id_img = ${id}`)
      })
    }
  })

  test('Enregistrer et fermer : toast, modal fermé, liste rechargée', async ({ page }) => {
    const familleOrigine = produit.originaux.famille
    const nouvelleFamille = dbJson(
      `SELECT id_famille, nom_famille FROM famille_produit WHERE famille_parente_id IS NULL AND id_famille <> ${familleOrigine} ORDER BY id_famille LIMIT 1`
    )[0]
    try {
      await page.goto('/ecommerce/produits')
      await page.getByPlaceholder('Rechercher un produit...').fill(produit.designation)
      await page.waitForTimeout(1500)
      const ligne = page.locator('tr', { hasText: produit.designation }).first()
      await expect(ligne).toBeVisible()
      await ligne.getByRole('button', { name: `Gérer ${produit.designation}` }).click()
      const modal = page.getByRole('dialog').first()
      await expect(modal.getByText('Produit', { exact: true }).first()).toBeVisible()
      await modal.getByLabel('Famille').click()
      await page.locator('.MuiPopover-paper').getByTestId(`option-famille-${nouvelleFamille[0]}`).click()
      await expect(modal.getByLabel('Famille')).toHaveValue(nouvelleFamille[1])
      await modal.getByRole('button', { name: 'Enregistrer et fermer' }).click()
      await expect(page.getByText('Modifications enregistrées')).toBeVisible()
      await expect(modal).toBeHidden()
      // La liste est rechargée avec la nouvelle famille.
      const ligneApres = page.locator('tr', { hasText: produit.designation }).first()
      await expect(ligneApres.locator('td').nth(2)).toHaveText(nouvelleFamille[1])
    } finally {
      db(`UPDATE produit SET famille_id = ${familleOrigine} WHERE id_prd = ${produit.id}`)
    }
  })

  test('Enregistrer seul : modal toujours ouvert après le toast (régression)', async ({ page }) => {
    try {
      await page.goto('/ecommerce/produits')
      await page.getByPlaceholder('Rechercher un produit...').fill(produit.designation)
      await page.waitForTimeout(1500)
      const ligne = page.locator('tr', { hasText: produit.designation }).first()
      await expect(ligne).toBeVisible()
      await ligne.getByRole('button', { name: `Gérer ${produit.designation}` }).click()
      const modal = page.getByRole('dialog').first()
      await expect(modal.getByText('Produit', { exact: true }).first()).toBeVisible()
      await modal.getByLabel('Intitulé de publication').fill('Intitulé E2E enregistrer seul')
      await modal.getByRole('button', { name: 'Enregistrer', exact: true }).click()
      await expect(page.getByText('Modifications enregistrées')).toBeVisible()
      await expect(modal).toBeVisible()
      await modal.getByRole('button', { name: 'Annuler' }).click()
      await expect(modal).toBeHidden()
    } finally {
      db(`UPDATE produit SET intitule_publication = NULL WHERE id_prd = ${produit.id}`)
    }
  })
})
