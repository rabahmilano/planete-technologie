// E2E — Modal « Gérer », chemin d'échec upload.
// Le backend/.env de la VM n'a PAS de clés Cloudinary : POST /images/upload
// répond 503 « Cloudinary n'est pas configuré ». Ce spec vérifie avec le
// backend RÉEL (sans mock) que l'échec d'upload n'empêche pas le reste de
// l'enregistrement, qu'un seul toast récapitulatif apparaît, que le modal
// reste ouvert et que les images en échec restent dans la file (réessai
// possible). Le chemin de succès (upload 200) est dans modal-gerer.spec.js.
// ⚠ Ne pas lancer en parallèle avec modal-gerer.spec.js (même produit 257).
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

const FIXTURES = '/tmp/modal-gerer-fixtures'
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

let produit = null
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

test.describe('modal Gérer — échec upload (Cloudinary non configuré)', () => {
  test('Enregistrer avec 2 uploads en 503 → toast récapitulatif, modal ouvert, images conservées', async ({
    page
  }) => {
    await page.goto('/ecommerce/produits')
    await page.getByPlaceholder('Rechercher un produit...').fill(produit.designation)
    await page.waitForTimeout(1500)
    const ligne = page.locator('tr', { hasText: produit.designation }).first()
    await ligne.getByRole('button', { name: `Gérer ${produit.designation}` }).click()
    const modal = page.getByRole('dialog').first()
    await expect(modal.getByText('Produit', { exact: true }).first()).toBeVisible()
    await modal.getByLabel('Intitulé de publication').fill('Intitulé E2E échec upload')
    await modal.getByRole('tab', { name: 'Images' }).click()
    await modal.locator('input[type="file"]').setInputFiles([
      path.join(FIXTURES, 'test-1.png'),
      path.join(FIXTURES, 'test-2.png')
    ])
    await expect(modal.getByText('À téléverser')).toHaveCount(2)
    await modal.getByRole('button', { name: 'Enregistrer', exact: true }).click()
    // Un seul toast récapitulatif, pas de toast de succès.
    await expect(page.getByText('0 images sur 2 téléversées')).toBeVisible()
    await expect(page.getByText('Modifications enregistrées')).toHaveCount(0)
    // Modal toujours ouvert, images en échec conservées pour réessayer.
    await expect(modal).toBeVisible()
    await expect(modal.getByText('À téléverser')).toHaveCount(2)
    // L'intitulé a bien été enregistré malgré l'échec des uploads.
    await modal.getByRole('tab', { name: 'Info' }).click()
    await expect(modal.getByLabel('Intitulé de publication')).toHaveValue('Intitulé E2E échec upload')
  })
})
