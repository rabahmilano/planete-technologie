import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import { useDebounce } from 'src/@core/hooks/useDebounce'
import { useProduitDashboard } from 'src/context/ProduitDashboardContext'
import { useProduitEcommerce } from 'src/context/ProduitEcommerceContext'
import { useFamille } from 'src/context/FamilleContext'

const REGEX_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MESSAGE_FORMAT_SLUG =
  'Format invalide : minuscules a-z, chiffres 0-9 et tirets uniquement, sans accents ni espaces (ex. : chargeur-ugreen-30w)'
const NB_IMAGES_MAX = 7

const couleurStatut = statut => {
  switch (statut) {
    case 'PUBLIE':
      return 'success'
    case 'ARCHIVE':
      return 'default'
    case 'BROUILLON':
    default:
      return 'warning'
  }
}

const libelleStatut = statut => {
  switch (statut) {
    case 'PUBLIE':
      return 'PUBLIÉ'
    case 'ARCHIVE':
      return 'ARCHIVÉ'
    case 'BROUILLON':
    default:
      return 'BROUILLON'
  }
}

const formaterDate = valeur => {
  if (!valeur) return '—'
  return new Date(valeur).toLocaleDateString('fr-FR')
}

const aplatirFamilles = (familles, prefixe = '') => {
  const lignes = []
  familles.forEach(f => {
    lignes.push({ id_famille: f.id_famille, nom: prefixe + f.nom_famille })
    if (f.sous_familles?.length) {
      lignes.push(...aplatirFamilles(f.sous_familles, `${prefixe}${f.nom_famille} › `))
    }
  })
  return lignes
}

const manquantsPourPublication = detail => {
  const manquants = []
  if (!detail?.description) manquants.push('une description')
  if (!detail?.famille_id) manquants.push('une famille')
  if (!detail?.slug_prd) manquants.push('un slug')
  if (detail?.prix_vente == null) manquants.push('un prix de vente')
  if ((detail?.images || []).length < 2) manquants.push('au moins 2 images')
  return manquants
}

const ProduitsEcommerceView = () => {
  const { fetchHistoriquePrix } = useProduitDashboard()
  const {
    fetchProduitEcommerce,
    modifierProduitEcommerce,
    modifierPrix,
    fetchHistoriquePrix: fetchHistoriquePrixVente,
    uploaderImage,
    supprimerImage,
    definirImagePrincipale,
    reordonnerImages,
    pivoterImage,
    ajouterPalier,
    supprimerPalier
  } = useProduitEcommerce()
  const { familles } = useFamille()

  const [produits, setProduits] = useState([])
  const [total, setTotal] = useState(0)
  const [recherche, setRecherche] = useState('')
  const [page, setPage] = useState(0)
  const [lignesParPage, setLignesParPage] = useState(24)
  const [chargement, setChargement] = useState(false)
  const [details, setDetails] = useState({})

  const rechercheDebouncee = useDebounce(recherche, 500)

  useEffect(() => {
    setPage(0)
  }, [rechercheDebouncee])

  const [produitSelectionne, setProduitSelectionne] = useState(null)
  const [onglet, setOnglet] = useState('1')
  const [formInfos, setFormInfos] = useState({})
  const [formPrix, setFormPrix] = useState({})
  const [erreurSlug, setErreurSlug] = useState('')
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false)
  const [historique, setHistorique] = useState([])
  const [nouveauPalier, setNouveauPalier] = useState({ quantite_min: '', prix_unitaire: '' })
  const [fichierImage, setFichierImage] = useState(null)
  const [nomImageSeo, setNomImageSeo] = useState('')
  const [televersementEnCours, setTeleversementEnCours] = useState(false)
  const [deplacementEnCours, setDeplacementEnCours] = useState(false)
  const refFichierImage = useRef(null)
  const [publicationEnAttente, setPublicationEnAttente] = useState(null)

  const chargerListe = async () => {
    setChargement(true)
    const data = await fetchHistoriquePrix({
      page: page + 1,
      limit: lignesParPage,
      search: rechercheDebouncee.length >= 2 ? rechercheDebouncee : '',
      vue: 'ecommerce'
    })
    const liste = data?.produits || []
    setProduits(liste)
    setTotal(data?.total || 0)
    const enrichis = await Promise.all(liste.map(p => fetchProduitEcommerce(p.id_prd)))
    const parId = {}
    enrichis.forEach(d => {
      if (d) parId[d.id_prd] = d
    })
    setDetails(parId)
    setChargement(false)
  }

  useEffect(() => {
    chargerListe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, lignesParPage, rechercheDebouncee])

  const ouvrirDetail = async produit => {
    const detail = details[produit.id_prd] || (await fetchProduitEcommerce(produit.id_prd))
    if (!detail) return
    setDetails(prev => ({ ...prev, [detail.id_prd]: detail }))
    setProduitSelectionne(detail)
    setFormInfos({
      description: detail.description || '',
      description_ar: detail.description_ar || '',
      intitule_publication: detail.intitule_publication || '',
      est_mis_en_avant: Boolean(detail.est_mis_en_avant),
      famille_id: detail.famille_id ?? '',
      slug_prd: detail.slug_prd || '',
      poids_grammes: detail.poids_grammes ?? ''
    })
    setFormPrix({ prix_vente: detail.prix_vente ?? '' })
    setErreurSlug('')
    setHistorique(detail.historiques_prix_vente || [])
    setNouveauPalier({ quantite_min: '', prix_unitaire: '' })
    setFichierImage(null)
    setNomImageSeo('')
    setOnglet('1')
  }

  const rafraichirDetail = async id => {
    const detail = await fetchProduitEcommerce(id)
    if (!detail) return
    setDetails(prev => ({ ...prev, [detail.id_prd]: detail }))
    setProduitSelectionne(detail)
    setHistorique(detail.historiques_prix_vente || [])
  }

  const basculerPublication = async () => {
    const produit = publicationEnAttente
    if (!produit) return
    const detail = details[produit.id_prd]
    const actuel = detail?.statut_publication || produit.statut_publication || 'BROUILLON'
    const suivant = actuel === 'PUBLIE' ? 'BROUILLON' : 'PUBLIE'
    const misAJour = await modifierProduitEcommerce(produit.id_prd, { statut_publication: suivant })
    if (misAJour) {
      setDetails(prev => ({ ...prev, [produit.id_prd]: { ...prev[produit.id_prd], statut_publication: suivant } }))
      setProduits(prev => prev.map(p => (p.id_prd === produit.id_prd ? { ...p, statut_publication: suivant } : p)))
    }
    setPublicationEnAttente(null)
  }

  const changerSlugProduit = valeur => {
    setFormInfos({ ...formInfos, slug_prd: valeur })
    if (erreurSlug) setErreurSlug('')
  }

  const enregistrerTout = async () => {
    if (!produitSelectionne || enregistrementEnCours) return
    const slugSaisi = (formInfos.slug_prd || '').trim()
    if (slugSaisi && !REGEX_SLUG.test(slugSaisi)) {
      setErreurSlug(MESSAGE_FORMAT_SLUG)
      setOnglet('1')
      return
    }
    setEnregistrementEnCours(true)
    const donneesInfos = {
      description: formInfos.description || null,
      description_ar: formInfos.description_ar || null,
      intitule_publication: formInfos.intitule_publication?.trim() || null,
      est_mis_en_avant: Boolean(formInfos.est_mis_en_avant),
      famille_id: formInfos.famille_id === '' ? null : parseInt(formInfos.famille_id, 10),
      slug_prd: slugSaisi || null,
      poids_grammes: formInfos.poids_grammes === '' ? null : parseInt(formInfos.poids_grammes, 10)
    }
    const infosAJour = await modifierProduitEcommerce(produitSelectionne.id_prd, donneesInfos)
    if (!infosAJour) {
      setEnregistrementEnCours(false)
      return
    }
    const donneesPrix = {
      prix_vente: formPrix.prix_vente === '' ? null : parseFloat(formPrix.prix_vente)
    }
    const prixAJour = await modifierPrix(produitSelectionne.id_prd, donneesPrix)
    setEnregistrementEnCours(false)
    if (prixAJour) {
      await rafraichirDetail(produitSelectionne.id_prd)
      setProduitSelectionne(null)
    }
  }

  const televerserFichierImage = async () => {
    if (!fichierImage || !produitSelectionne || televersementEnCours) return
    const ordreSuivant = (produitSelectionne.images || []).reduce((max, img) => Math.max(max, img.ordre_image), -1) + 1
    setTeleversementEnCours(true)
    const ok = await uploaderImage(produitSelectionne.id_prd, fichierImage, ordreSuivant, nomImageSeo)
    setTeleversementEnCours(false)
    if (ok) {
      setFichierImage(null)
      setNomImageSeo('')
      await rafraichirDetail(produitSelectionne.id_prd)
    }
  }

  const deplacerImage = async (produit, indexSource, decalage) => {
    const images = [...(produit.images || [])].sort(
      (a, b) => a.ordre_image - b.ordre_image || a.id_img - b.id_img
    )
    const indexCible = indexSource + decalage
    if (indexCible < 0 || indexCible >= images.length) return
    const copie = [...images]
    const [deplacee] = copie.splice(indexSource, 1)
    copie.splice(indexCible, 0, deplacee)
    const ordre = copie.map((img, i) => ({ id_img: img.id_img, ordre_image: i }))
    setDeplacementEnCours(true)
    const ok = await reordonnerImages(produit.id_prd, ordre)
    setDeplacementEnCours(false)
    if (ok) await rafraichirDetail(produit.id_prd)
  }

  const replacerImageParGlisser = async (produit, indexSource, indexCible) => {
    if (indexCible === indexSource) return
    const images = [...(produit.images || [])].sort(
      (a, b) => a.ordre_image - b.ordre_image || a.id_img - b.id_img
    )
    const copie = [...images]
    const [deplacee] = copie.splice(indexSource, 1)
    copie.splice(indexCible, 0, deplacee)
    const ordre = copie.map((img, i) => ({ id_img: img.id_img, ordre_image: i }))
    setDeplacementEnCours(true)
    const ok = await reordonnerImages(produit.id_prd, ordre)
    setDeplacementEnCours(false)
    if (ok) await rafraichirDetail(produit.id_prd)
  }

  const optionsFamilles = aplatirFamilles(familles)

  const statutAffiche = produit => {
    const detail = details[produit.id_prd]
    return detail?.statut_publication || produit.statut_publication || 'BROUILLON'
  }

  const aPublier = publicationEnAttente ? statutAffiche(publicationEnAttente) !== 'PUBLIE' : false

  const imagesTriees = (produitSelectionne?.images || [])
    .slice()
    .sort((a, b) => a.ordre_image - b.ordre_image || a.id_img - b.id_img)

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Typography variant='h5'>Produits e-commerce</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
          Gérez la publication, les prix, les images et les paliers des produits de la boutique.
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <TextField
          size='small'
          sx={{ minWidth: 320 }}
          autoComplete='off'
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          placeholder='Rechercher un produit...'
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <Icon icon='tabler:search' fontSize='1.25rem' />
              </InputAdornment>
            ),
            endAdornment: recherche ? (
              <InputAdornment position='end'>
                <Tooltip title='Effacer la recherche'>
                  <IconButton size='small' onClick={() => setRecherche('')} edge='end' aria-label='Effacer la recherche'>
                    <Icon icon='tabler:x' fontSize='1.25rem' />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ) : null
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3, position: 'relative' }}>
          {chargement && <LinearProgress sx={{ position: 'absolute', top: 0, width: '100%', zIndex: 1 }} />}
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
                  <TableCell sx={{ color: 'white' }}>Produit</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Stock</TableCell>
                  <TableCell sx={{ color: 'white' }}>Famille</TableCell>
                  <TableCell sx={{ color: 'white' }} align='right'>Prix effectif</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Publication</TableCell>
                  <TableCell sx={{ color: 'white' }} align='right'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {produits.length === 0 && !chargement ? (
                  <TableRow>
                    <TableCell colSpan={6} align='center'>
                      <Typography sx={{ p: 4 }}>Aucun produit trouvé.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  produits.map(produit => {
                    const detail = details[produit.id_prd]
                    const manquants = manquantsPourPublication(detail)
                    const estPublie = statutAffiche(produit) === 'PUBLIE'
                    // Dépublier est toujours autorisé : seul Publier exige les 5 conditions.
                    const publicationBloquee = !estPublie && manquants.length > 0
                    return (
                      <TableRow key={produit.id_prd} hover>
                        <TableCell>
                          <Typography sx={{ fontWeight: 600 }}>{produit.designation_prd}</Typography>
                          {(detail?.promo_active || detail?.est_mis_en_avant) && (
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                              {detail?.promo_active && (
                                <Chip label='Promo' color='warning' variant='outlined' size='small' />
                              )}
                              {detail?.est_mis_en_avant && (
                                <Chip label='Mis en avant' color='primary' variant='outlined' size='small' />
                              )}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell align='center'>
                          {produit.qte_dispo == null ? (
                            '—'
                          ) : produit.qte_dispo > 0 ? (
                            produit.qte_dispo
                          ) : (
                            <Chip label='Rupture' color='error' size='small' />
                          )}
                        </TableCell>
                        <TableCell>{detail?.famille?.nom_famille || '—'}</TableCell>
                        <TableCell align='right'>
                          {detail?.prix_effectif != null
                            ? `${Number(detail.prix_effectif).toLocaleString('fr-FR')} DZD`
                            : '—'}
                        </TableCell>
                        <TableCell align='center'>
                          <Chip
                            label={libelleStatut(statutAffiche(produit))}
                            color={couleurStatut(statutAffiche(produit))}
                            size='small'
                          />
                        </TableCell>
                        <TableCell align='right' sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip
                            title={
                              publicationBloquee
                                ? `Publication impossible, il manque : ${manquants.join(', ')}`
                                : estPublie
                                  ? 'Dépublier'
                                  : 'Publier'
                            }
                          >
                            <span>
                              <IconButton
                                size='small'
                                color={estPublie ? 'warning' : 'success'}
                                disabled={publicationBloquee}
                                aria-label={
                                  estPublie
                                    ? `Dépublier ${produit.designation_prd}`
                                    : `Publier ${produit.designation_prd}`
                                }
                                onClick={() => setPublicationEnAttente(produit)}
                              >
                                <Icon icon={estPublie ? 'tabler:eye-off' : 'tabler:eye'} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={`Gérer ${produit.designation_prd}`}>
                            <IconButton
                              size='small'
                              sx={{ ml: 1 }}
                              aria-label={`Gérer ${produit.designation_prd}`}
                              onClick={() => ouvrirDetail(produit)}
                            >
                              <Icon icon='tabler:edit' />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component='div'
            count={total}
            page={page}
            rowsPerPage={lignesParPage}
            rowsPerPageOptions={[12, 24, 50]}
            onPageChange={(event, nouvellePage) => setPage(nouvellePage)}
            onRowsPerPageChange={event => {
              setLignesParPage(parseInt(event.target.value, 10))
              setPage(0)
            }}
            labelRowsPerPage='Lignes par page'
          />
        </Card>
      </Grid>

      <Dialog
        open={Boolean(produitSelectionne)}
        onClose={() => setProduitSelectionne(null)}
        fullScreen
        sx={{ '& .MuiDialog-paper': { backgroundColor: 'background.paper' } }}
      >
        <DialogTitle
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 3 }}
        >
          <Box>
            <Typography variant='h6'>{produitSelectionne?.designation_prd}</Typography>
            {produitSelectionne?.prix_effectif != null && (
              <Typography variant='body2' color='text.secondary'>
                Prix effectif : {Number(produitSelectionne.prix_effectif).toLocaleString('fr-FR')} DZD
                {produitSelectionne.promo_active ? ' (promo active)' : ''}
              </Typography>
            )}
          </Box>
          <Tooltip title='Fermer'>
            <IconButton edge='end' aria-label='Fermer' onClick={() => setProduitSelectionne(null)}>
              <Icon icon='tabler:x' />
            </IconButton>
          </Tooltip>
        </DialogTitle>
        <DialogContent dividers sx={{ px: { xs: 3, md: 8 }, py: 4 }}>
          <Grid container spacing={4} sx={{ maxWidth: 1100, mx: 'auto' }}>
            <Grid item xs={12}>
              <Tabs
                value={onglet}
                onChange={(event, valeur) => setOnglet(valeur)}
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab value='1' label='Info' icon={<Icon icon='tabler:info-circle' />} iconPosition='start' />
                <Tab value='2' label='Prix' icon={<Icon icon='tabler:currency-dollar' />} iconPosition='start' />
                <Tab value='3' label='Images' icon={<Icon icon='tabler:photo' />} iconPosition='start' />
              </Tabs>
            </Grid>

            {onglet === '1' && (
              <>
                <Grid item xs={12}>
                  <Chip
                    label={libelleStatut(produitSelectionne?.statut_publication)}
                    color={couleurStatut(produitSelectionne?.statut_publication)}
                    size='small'
                  />
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
                    BROUILLON : jamais publié, invisible en boutique. ARCHIVÉ : retiré de la
                    boutique, conservé pour l&apos;historique, réactivable vers BROUILLON. Le statut
                    se change uniquement avec le bouton Publier / Dépublier de la liste.
                  </Typography>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
                    Pour publier : une description, une famille, un slug, un prix de vente et au
                    moins 2 images.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={7}>
                  <TextField
                    fullWidth
                    multiline
                    rows={8}
                    label='Description'
                    autoComplete='off'
                    helperText='Texte affiché sur la fiche produit de la boutique.'
                    value={formInfos.description || ''}
                    onChange={e => setFormInfos({ ...formInfos, description: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth
                    multiline
                    rows={8}
                    label='Description (arabe, optionnel)'
                    autoComplete='off'
                    helperText='Affichée quand le client choisit l’arabe. Vide : la description française est affichée.'
                    value={formInfos.description_ar || ''}
                    onChange={e => setFormInfos({ ...formInfos, description_ar: e.target.value })}
                    inputProps={{ dir: 'rtl', lang: 'ar' }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label='Intitulé de publication'
                    autoComplete='off'
                    inputProps={{ maxLength: 150 }}
                    helperText='Titre affiché dans la boutique (150 caractères max). Vide : la désignation interne est affichée.'
                    value={formInfos.intitule_publication || ''}
                    onChange={e => setFormInfos({ ...formInfos, intitule_publication: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label='Slug (URL boutique)'
                    autoComplete='off'
                    required
                    error={Boolean(erreurSlug)}
                    helperText={erreurSlug || 'Minuscules a-z, chiffres 0-9 et tirets uniquement'}
                    value={formInfos.slug_prd || ''}
                    onChange={e => changerSlugProduit(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Famille</InputLabel>
                    <Select
                      label='Famille'
                      autoComplete='off'
                      value={formInfos.famille_id ?? ''}
                      onChange={e => setFormInfos({ ...formInfos, famille_id: e.target.value })}
                    >
                      <MenuItem value=''>Aucune</MenuItem>
                      {optionsFamilles.map(f => (
                        <MenuItem key={f.id_famille} value={f.id_famille}>
                          {f.nom}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label='Poids (grammes)'
                    type='number'
                    autoComplete='off'
                    helperText='Valeur utilisée par Yalidine (défaut 500 g si vide)'
                    value={formInfos.poids_grammes ?? ''}
                    onChange={e => setFormInfos({ ...formInfos, poids_grammes: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControlLabel
                    sx={{ mt: 2 }}
                    control={
                      <Switch
                        checked={Boolean(formInfos.est_mis_en_avant)}
                        onChange={e => setFormInfos({ ...formInfos, est_mis_en_avant: e.target.checked })}
                      />
                    }
                    label='Mettre en avant'
                  />
                </Grid>
              </>
            )}

            {onglet === '2' && (
              <>
                <Grid item xs={12}>
                  <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                    Prix de vente
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label='Prix de vente (DZD)'
                    type='number'
                    autoComplete='off'
                    value={formPrix.prix_vente ?? ''}
                    onChange={e => setFormPrix({ ...formPrix, prix_vente: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant='body2' color='text.secondary'>
                    Chaque changement de prix de vente est enregistré automatiquement dans
                    l&apos;historique ci-dessous.
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                    Paliers de prix par quantité
                  </Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                    Chaque palier fixe le prix UNITAIRE appliqué à partir d&apos;une quantité
                    (prix dégressifs). Le palier avec la plus grande quantité atteinte s&apos;applique.
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TableContainer>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell align='center'>Quantité minimum</TableCell>
                          <TableCell align='right'>Prix unitaire appliqué</TableCell>
                          <TableCell align='center'>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(produitSelectionne?.paliers || []).map(palier => (
                          <TableRow key={palier.id_palier}>
                            <TableCell align='center'>dès {palier.quantite_min} pièces</TableCell>
                            <TableCell align='right'>
                              {Number(palier.prix_unitaire).toLocaleString('fr-FR')} DZD / pièce
                            </TableCell>
                            <TableCell align='center'>
                              <Tooltip title='Supprimer le palier'>
                                <IconButton
                                  size='small'
                                  color='error'
                                  aria-label={`Supprimer le palier dès ${palier.quantite_min} pièces`}
                                  onClick={async () => {
                                    if (await supprimerPalier(produitSelectionne.id_prd, palier.id_palier)) {
                                      await rafraichirDetail(produitSelectionne.id_prd)
                                    }
                                  }}
                                >
                                  <Icon icon='tabler:trash' />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(produitSelectionne?.paliers || []).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} align='center'>
                              Aucun palier : le prix de vente s&apos;applique à toutes les quantités.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label='Quantité minimum (pièces)'
                    type='number'
                    autoComplete='off'
                    value={nouveauPalier.quantite_min}
                    onChange={e => setNouveauPalier({ ...nouveauPalier, quantite_min: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label='Prix unitaire appliqué (DZD)'
                    type='number'
                    autoComplete='off'
                    value={nouveauPalier.prix_unitaire}
                    onChange={e => setNouveauPalier({ ...nouveauPalier, prix_unitaire: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant='outlined'
                    fullWidth
                    sx={{ mt: 1 }}
                    disabled={!nouveauPalier.quantite_min || !nouveauPalier.prix_unitaire}
                    onClick={async () => {
                      if (
                        await ajouterPalier(produitSelectionne.id_prd, {
                          quantite_min: parseInt(nouveauPalier.quantite_min, 10),
                          prix_unitaire: parseFloat(nouveauPalier.prix_unitaire)
                        })
                      ) {
                        setNouveauPalier({ quantite_min: '', prix_unitaire: '' })
                        await rafraichirDetail(produitSelectionne.id_prd)
                      }
                    }}
                  >
                    Ajouter le palier
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                    Historique des prix
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TableContainer>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>Ancien prix</TableCell>
                          <TableCell>Nouveau prix</TableCell>
                          <TableCell>Début</TableCell>
                          <TableCell>Fin</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {historique.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} align='center'>
                              Aucun historique de prix.
                            </TableCell>
                          </TableRow>
                        ) : (
                          historique.map(ligne => (
                            <TableRow key={ligne.id_historique}>
                              <TableCell>
                                {ligne.ancien_prix != null
                                  ? `${Number(ligne.ancien_prix).toLocaleString('fr-FR')} DZD`
                                  : '—'}
                              </TableCell>
                              <TableCell>
                                {ligne.nouveau_prix != null
                                  ? `${Number(ligne.nouveau_prix).toLocaleString('fr-FR')} DZD`
                                  : '—'}
                              </TableCell>
                              <TableCell>{formaterDate(ligne.date_debut)}</TableCell>
                              <TableCell>{formaterDate(ligne.date_fin)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </>
            )}

            {onglet === '3' && (
              <>
                <Grid item xs={12}>
                  <Typography variant='body2' color='text.secondary'>
                    {imagesTriees.length}/{NB_IMAGES_MAX} images — l&apos;image marquée
                    « Principale » sert de vignette en boutique. Glissez-déposez pour réordonner,
                    ou utilisez les flèches.
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Grid container spacing={3}>
                    {imagesTriees.map((image, index) => (
                      <Grid
                        item
                        key={image.id_img}
                        xs={6}
                        sm={4}
                        md={3}
                        draggable
                        onDragStart={event => event.dataTransfer.setData('text/plain', String(index))}
                        onDragOver={event => event.preventDefault()}
                        onDrop={event => {
                          event.preventDefault()
                          const source = parseInt(event.dataTransfer.getData('text/plain'), 10)
                          if (!isNaN(source)) replacerImageParGlisser(produitSelectionne, source, index)
                        }}
                      >
                        <Box
                          sx={{
                            position: 'relative',
                            borderRadius: 1,
                            overflow: 'hidden',
                            border: image.est_principale ? '2px solid' : '1px solid',
                            borderColor: image.est_principale ? 'primary.main' : 'divider'
                          }}
                        >
                          <Box
                            component='img'
                            src={image.url_image}
                            alt={`Image ${index + 1} de ${produitSelectionne?.designation_prd}`}
                            sx={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }}
                          />
                          {image.est_principale && (
                            <Chip
                              label='Principale'
                              color='primary'
                              size='small'
                              sx={{ position: 'absolute', top: 8, left: 8 }}
                            />
                          )}
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              display: 'flex',
                              justifyContent: 'center',
                              gap: 1,
                              py: 1,
                              backgroundColor: 'rgba(0,0,0,0.45)'
                            }}
                          >
                            <Tooltip title='Déplacer à gauche'>
                              <span>
                                <IconButton
                                  size='small'
                                  sx={{ color: 'white' }}
                                  aria-label={`Déplacer l'image ${index + 1} à gauche`}
                                  disabled={index === 0 || deplacementEnCours}
                                  onClick={() => deplacerImage(produitSelectionne, index, -1)}
                                >
                                  <Icon icon='tabler:arrow-left' />
                                </IconButton>
                              </span>
                            </Tooltip>
                            {!image.est_principale && (
                              <Tooltip title='Définir comme principale'>
                                <IconButton
                                  size='small'
                                  sx={{ color: 'white' }}
                                  aria-label={`Définir l'image ${index + 1} comme principale`}
                                  onClick={async () => {
                                    if (await definirImagePrincipale(produitSelectionne.id_prd, image.id_img)) {
                                      await rafraichirDetail(produitSelectionne.id_prd)
                                    }
                                  }}
                                >
                                  <Icon icon='tabler:star' />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title='Pivoter 90° à droite'>
                              <IconButton
                                size='small'
                                sx={{ color: 'white' }}
                                aria-label={`Pivoter l'image ${index + 1} de 90 degrés`}
                                onClick={async () => {
                                  if (await pivoterImage(produitSelectionne.id_prd, image.id_img)) {
                                    await rafraichirDetail(produitSelectionne.id_prd)
                                  }
                                }}
                              >
                                <Icon icon='tabler:rotate-clockwise' />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='Supprimer'>
                              <IconButton
                                size='small'
                                sx={{ color: 'error.main' }}
                                aria-label={`Supprimer l'image ${index + 1}`}
                                onClick={async () => {
                                  if (await supprimerImage(produitSelectionne.id_prd, image.id_img)) {
                                    await rafraichirDetail(produitSelectionne.id_prd)
                                  }
                                }}
                              >
                                <Icon icon='tabler:trash' />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='Déplacer à droite'>
                              <span>
                                <IconButton
                                  size='small'
                                  sx={{ color: 'white' }}
                                  aria-label={`Déplacer l'image ${index + 1} à droite`}
                                  disabled={index === imagesTriees.length - 1 || deplacementEnCours}
                                  onClick={() => deplacerImage(produitSelectionne, index, 1)}
                                >
                                  <Icon icon='tabler:arrow-right' />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                    {imagesTriees.length === 0 && (
                      <Grid item xs={12}>
                        <Typography color='text.secondary'>
                          Aucune image. La publication exige au moins 2 images.
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Grid>
                <Grid item xs={12}>
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: fichierImage ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      p: 4,
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                    onClick={() => refFichierImage.current?.click()}
                    onDragOver={event => event.preventDefault()}
                    onDrop={event => {
                      event.preventDefault()
                      const fichier = event.dataTransfer.files?.[0]
                      if (fichier) setFichierImage(fichier)
                    }}
                  >
                    <input
                      ref={refFichierImage}
                      type='file'
                      accept='image/jpeg,image/png,image/webp'
                      hidden
                      onChange={e => setFichierImage(e.target.files?.[0] || null)}
                    />
                    <Icon icon='tabler:cloud-upload' fontSize='2rem' />
                    <Typography variant='body2' sx={{ mt: 1 }}>
                      Glissez un fichier ici ou cliquez pour parcourir (JPEG, PNG, WebP — max 5 Mo)
                    </Typography>
                    {fichierImage && (
                      <Typography variant='body2' sx={{ mt: 2, fontWeight: 600 }}>
                        {fichierImage.name} — {(fichierImage.size / 1024).toFixed(0)} Ko
                      </Typography>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label='Nom du fichier (optionnel, format SEO)'
                    autoComplete='off'
                    helperText='Vide : nom généré automatiquement. Sinon : minuscules et tirets appliqués automatiquement (ex. : chargeur-ugreen-30w)'
                    value={nomImageSeo}
                    onChange={e => setNomImageSeo(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant='contained'
                    fullWidth
                    sx={{ mt: 1 }}
                    disabled={!fichierImage || televersementEnCours || imagesTriees.length >= NB_IMAGES_MAX}
                    onClick={televerserFichierImage}
                  >
                    {televersementEnCours
                      ? 'Téléversement…'
                      : imagesTriees.length >= NB_IMAGES_MAX
                        ? 'Maximum atteint'
                        : 'Téléverser'}
                  </Button>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 3, md: 8 }, py: 3 }}>
          <Button onClick={() => setProduitSelectionne(null)}>Annuler</Button>
          <Button
            variant='contained'
            onClick={enregistrerTout}
            disabled={enregistrementEnCours || televersementEnCours}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(publicationEnAttente)} onClose={() => setPublicationEnAttente(null)}>
        <DialogTitle>{aPublier ? 'Publier ce produit ?' : 'Dépublier ce produit ?'}</DialogTitle>
        <DialogContent>
          <Typography>
            {aPublier
              ? `« ${publicationEnAttente?.designation_prd} » sera visible sur la boutique en ligne. La publication exige une description, une famille, un slug, un prix de vente et au moins 2 images.`
              : `« ${publicationEnAttente?.designation_prd} » ne sera plus visible sur la boutique en ligne.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublicationEnAttente(null)}>Annuler</Button>
          <Button variant='contained' color={aPublier ? 'success' : 'warning'} onClick={basculerPublication}>
            {aPublier ? 'Publier' : 'Dépublier'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default ProduitsEcommerceView
