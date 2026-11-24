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

    // Intitulé (requis pour publier ensuite) + famille (c) : Autocomplete
    // groupé — en-têtes parents, filtrage en tapant, parent sélectionnable.
    await modal.getByLabel('Intitulé de publication').fill('Intitulé E2E modal Gérer')
    const champFamille = modal.getByRole('combobox', { name: 'Famille' })
    await champFamille.click()
    const liste = page.locator('.MuiAutocomplete-listbox')
    await expect(liste).toBeVisible()
    const enTetes = liste.locator('.MuiAutocomplete-groupLabel')
    await expect(enTetes.first()).toBeVisible()
    // textContent (pas innerText) : l'en-tête est affiché en capitales par
    // le CSS (text-transform), le nom réel est « Cartes WiFi ».
    const nomParent = (await enTetes.first().textContent()).trim()
    // Filtrage en tapant : le nom du parent ne laisse que son groupe.
    await champFamille.fill(nomParent)
    await expect(liste.locator('.MuiAutocomplete-groupLabel')).toHaveCount(1)
    // Le parent est sélectionnable comme ses enfants.
    await liste.getByRole('option', { name: nomParent, exact: true }).click()
    await expect(champFamille).toHaveValue(nomParent)

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
    await modal.getByRole('button', { name: 'Enregistrer' }).click()
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
      await modal.getByRole('button', { name: 'Enregistrer' }).click()
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
      await modal.getByRole('button', { name: 'Enregistrer' }).click()
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
      await modal.getByRole('button', { name: 'Enregistrer' }).click()
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

  test('famille : Autocomplete groupé, filtrage et parent sélectionnable', async ({ page }) => {
    await page.goto('/ecommerce/produits')
    await page.getByPlaceholder('Rechercher un produit...').fill(produit.designation)
    await page.waitForTimeout(1500)
    const ligne = page.locator('tr', { hasText: produit.designation }).first()
    await expect(ligne).toBeVisible()
    await ligne.getByRole('button', { name: `Gérer ${produit.designation}` }).click()
    const modal = page.getByRole('dialog').first()
    await expect(modal.getByText('Produit', { exact: true }).first()).toBeVisible()
    const champFamille = modal.getByRole('combobox', { name: 'Famille' })
    await champFamille.click()
    const liste = page.locator('.MuiAutocomplete-listbox')
    await expect(liste).toBeVisible()
    // En-têtes de groupe = familles parentes.
    const enTetes = liste.locator('.MuiAutocomplete-groupLabel')
    await expect(enTetes.first()).toBeVisible()
    expect(await enTetes.count()).toBeGreaterThan(0)
    // Filtrage en tapant : un seul groupe reste.
    // textContent (pas innerText) : l'en-tête est affiché en capitales par
    // le CSS (text-transform), le nom réel est « Cartes WiFi ».
    const nomParent = (await enTetes.first().textContent()).trim()
    await champFamille.fill(nomParent.slice(0, 3))
    await expect(liste.locator('.MuiAutocomplete-groupLabel')).toHaveCount(1)
    await expect(liste.locator('.MuiAutocomplete-groupLabel').first()).toHaveText(nomParent)
    // Le parent est sélectionnable.
    await liste.getByRole('option', { name: nomParent, exact: true }).click()
    await expect(champFamille).toHaveValue(nomParent)
    // Effacer la sélection.
    await modal.getByRole('button', { name: 'Retirer la famille' }).click()
    await expect(champFamille).toHaveValue('')
    // Une sous-famille : la première option dont le libellé diffère de son
    // groupe (le parent porte le nom de son groupe, l'enfant non).
    await champFamille.click()
    const infos = await liste.evaluate(listeEl => {
      const options = [...listeEl.querySelectorAll('[role="option"]')]
      return options.map((option, index) => {
        const ul = option.closest('ul')
        const enTete = ul ? ul.previousElementSibling : null
        return { index, label: option.textContent.trim(), groupe: enTete ? enTete.textContent.trim() : null }
      })
    })
    const enfant = infos.find(option => option.label !== option.groupe)
    expect(enfant).toBeDefined()
    await liste.getByRole('option').nth(enfant.index).click()
    await expect(champFamille).toHaveValue(enfant.label)
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
})
