import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import MuiTab from '@mui/material/Tab'
import { styled } from '@mui/material/styles'
import TabContext from '@mui/lab/TabContext'
import MuiTabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'
import Icon from 'src/@core/components/icon'
import { useProduitDashboard } from 'src/context/ProduitDashboardContext'
import { useProduitEcommerce } from 'src/context/ProduitEcommerceContext'
import { useFamille } from 'src/context/FamilleContext'

const Tab = styled(MuiTab)(({ theme }) => ({
  flexDirection: 'row',
  '& svg': {
    marginBottom: '0 !important',
    marginRight: theme.spacing(1.5)
  }
}))

const TabList = styled(MuiTabList)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  '& .Mui-selected': {
    color: theme.palette.primary.main
  }
}))

const STATUTS = ['BROUILLON', 'PUBLIE', 'ARCHIVE']

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

const formaterDate = valeur => {
  if (!valeur) return '—'
  return new Date(valeur).toLocaleDateString('fr-FR')
}

const dateInput = valeur => {
  if (!valeur) return ''
  return new Date(valeur).toISOString().slice(0, 10)
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

const ProduitsEcommerceView = () => {
  const { fetchHistoriquePrix } = useProduitDashboard()
  const {
    fetchProduitEcommerce,
    modifierProduitEcommerce,
    modifierPrix,
    fetchHistoriquePrix: fetchHistoriquePrixVente,
    ajouterImage,
    uploaderImage,
    supprimerImage,
    definirImagePrincipale,
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

  const [produitSelectionne, setProduitSelectionne] = useState(null)
  const [onglet, setOnglet] = useState('1')
  const [formInfos, setFormInfos] = useState({})
  const [formPrix, setFormPrix] = useState({})
  const [historique, setHistorique] = useState([])
  const [nouvelleImage, setNouvelleImage] = useState({ url_image: '', ordre_image: '' })
  const [fichierImage, setFichierImage] = useState(null)
  const [nouveauPalier, setNouveauPalier] = useState({ quantite_min: '', prix_unitaire: '' })

  const chargerListe = async () => {
    setChargement(true)
    const data = await fetchHistoriquePrix({ page: page + 1, limit: lignesParPage, search: recherche })
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
  }, [page, lignesParPage, recherche])

  const ouvrirDetail = async produit => {
    const detail = details[produit.id_prd] || (await fetchProduitEcommerce(produit.id_prd))
    if (!detail) return
    setDetails(prev => ({ ...prev, [detail.id_prd]: detail }))
    setProduitSelectionne(detail)
    setFormInfos({
      description: detail.description || '',
      description_ar: detail.description_ar || '',
      statut_publication: detail.statut_publication || 'BROUILLON',
      est_mis_en_avant: Boolean(detail.est_mis_en_avant),
      famille_id: detail.famille_id ?? '',
      slug_prd: detail.slug_prd || '',
      poids_grammes: detail.poids_grammes ?? ''
    })
    setFormPrix({
      prix_vente: detail.prix_vente ?? '',
      prix_promo: detail.prix_promo ?? '',
      debut_promo: dateInput(detail.debut_promo),
      fin_promo: dateInput(detail.fin_promo)
    })
    setHistorique(detail.historiques_prix_vente || [])
    setNouvelleImage({ url_image: '', ordre_image: '' })
    setNouveauPalier({ quantite_min: '', prix_unitaire: '' })
    setOnglet('1')
  }

  const rafraichirDetail = async id => {
    const detail = await fetchProduitEcommerce(id)
    if (!detail) return
    setDetails(prev => ({ ...prev, [detail.id_prd]: detail }))
    setProduitSelectionne(detail)
    setHistorique(detail.historiques_prix_vente || [])
  }

  const basculerPublication = async produit => {
    const detail = details[produit.id_prd]
    const actuel = detail?.statut_publication || 'BROUILLON'
    const suivant = actuel === 'PUBLIE' ? 'BROUILLON' : 'PUBLIE'
    const misAJour = await modifierProduitEcommerce(produit.id_prd, { statut_publication: suivant })
    if (misAJour) {
      setDetails(prev => ({ ...prev, [produit.id_prd]: { ...prev[produit.id_prd], statut_publication: suivant } }))
    }
  }

  const enregistrerInfos = async () => {
    const donnees = {
      description: formInfos.description || null,
      description_ar: formInfos.description_ar || null,
      statut_publication: formInfos.statut_publication,
      est_mis_en_avant: formInfos.est_mis_en_avant,
      famille_id: formInfos.famille_id === '' ? null : parseInt(formInfos.famille_id, 10),
      slug_prd: formInfos.slug_prd || null,
      poids_grammes: formInfos.poids_grammes === '' ? null : parseInt(formInfos.poids_grammes, 10)
    }
    const misAJour = await modifierProduitEcommerce(produitSelectionne.id_prd, donnees)
    if (misAJour) await rafraichirDetail(produitSelectionne.id_prd)
  }

  const enregistrerPrix = async () => {
    const donnees = {
      prix_vente: formPrix.prix_vente === '' ? null : parseFloat(formPrix.prix_vente),
      prix_promo: formPrix.prix_promo === '' ? null : parseFloat(formPrix.prix_promo),
      debut_promo: formPrix.debut_promo || null,
      fin_promo: formPrix.fin_promo || null
    }
    const misAJour = await modifierPrix(produitSelectionne.id_prd, donnees)
    if (misAJour) {
      await rafraichirDetail(produitSelectionne.id_prd)
      const lignes = await fetchHistoriquePrixVente(produitSelectionne.id_prd)
      setHistorique(lignes)
    }
  }

  const optionsFamilles = aplatirFamilles(familles)

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
          label='Rechercher un produit'
          value={recherche}
          onChange={e => {
            setRecherche(e.target.value)
            setPage(0)
          }}
          sx={{ minWidth: 300 }}
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
                  <TableCell sx={{ color: 'white' }} align='center'>Actions</TableCell>
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
                    return (
                      <TableRow key={produit.id_prd} hover>
                        <TableCell>
                          <Typography sx={{ fontWeight: 600 }}>{produit.designation_prd}</Typography>
                          {detail?.promo_active && <Chip label='Promo' color='error' size='small' sx={{ ml: 2 }} />}
                          {detail?.est_mis_en_avant && (
                            <Chip label='Mis en avant' color='primary' size='small' sx={{ ml: 1 }} />
                          )}
                        </TableCell>
                        <TableCell align='center'>{produit.qte_dispo}</TableCell>
                        <TableCell>{detail?.famille?.nom_famille || '—'}</TableCell>
                        <TableCell align='right'>
                          {detail?.prix_effectif != null
                            ? `${Number(detail.prix_effectif).toLocaleString('fr-FR')} DZD`
                            : '—'}
                        </TableCell>
                        <TableCell align='center'>
                          <Chip
                            label={detail?.statut_publication || 'BROUILLON'}
                            color={couleurStatut(detail?.statut_publication)}
                            size='small'
                          />
                        </TableCell>
                        <TableCell align='center'>
                          <Button size='small' variant='outlined' onClick={() => basculerPublication(produit)}>
                            {detail?.statut_publication === 'PUBLIE' ? 'Dépublier' : 'Publier'}
                          </Button>
                          <Button size='small' sx={{ ml: 2 }} onClick={() => ouvrirDetail(produit)}>
                            Gérer
                          </Button>
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

      <Dialog open={Boolean(produitSelectionne)} onClose={() => setProduitSelectionne(null)} fullWidth maxWidth='md'>
        <DialogTitle>
          {produitSelectionne?.designation_prd}
          {produitSelectionne?.prix_effectif != null && (
            <Typography variant='body2' color='text.secondary'>
              Prix effectif : {Number(produitSelectionne.prix_effectif).toLocaleString('fr-FR')} DZD
              {produitSelectionne.promo_active ? ' (promo active)' : ''}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <TabContext value={onglet}>
            <TabList onChange={(event, valeur) => setOnglet(valeur)} variant='scrollable' scrollButtons='auto'>
              <Tab value='1' label='Infos' icon={<Icon icon='tabler:info-circle' />} />
              <Tab value='2' label='Prix' icon={<Icon icon='tabler:currency-dollar' />} />
              <Tab value='3' label='Images' icon={<Icon icon='tabler:photo' />} />
              <Tab value='4' label='Paliers' icon={<Icon icon='tabler:stairs' />} />
              <Tab value='5' label='Historique des prix' icon={<Icon icon='tabler:history' />} />
            </TabList>

            <TabPanel value='1' sx={{ p: 0, pt: 5 }}>
              <Grid container spacing={4}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label='Description'
                    value={formInfos.description || ''}
                    onChange={e => setFormInfos({ ...formInfos, description: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label='Description (arabe, optionnel)'
                    helperText='Texte affiché sur la boutique quand le client choisit l’arabe. Laissez vide pour afficher la description française.'
                    value={formInfos.description_ar || ''}
                    onChange={e => setFormInfos({ ...formInfos, description_ar: e.target.value })}
                    inputProps={{ dir: 'rtl', lang: 'ar' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Statut de publication</InputLabel>
                    <Select
                      label='Statut de publication'
                      value={formInfos.statut_publication || 'BROUILLON'}
                      onChange={e => setFormInfos({ ...formInfos, statut_publication: e.target.value })}
                    >
                      {STATUTS.map(s => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Famille</InputLabel>
                    <Select
                      label='Famille'
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
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Slug (URL boutique)'
                    value={formInfos.slug_prd || ''}
                    onChange={e => setFormInfos({ ...formInfos, slug_prd: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Poids (grammes)'
                    type='number'
                    value={formInfos.poids_grammes ?? ''}
                    onChange={e => setFormInfos({ ...formInfos, poids_grammes: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(formInfos.est_mis_en_avant)}
                        onChange={e => setFormInfos({ ...formInfos, est_mis_en_avant: e.target.checked })}
                      />
                    }
                    label='Mettre en avant sur la boutique'
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant='contained' onClick={enregistrerInfos}>
                    Enregistrer les infos
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value='2' sx={{ p: 0, pt: 5 }}>
              <Grid container spacing={4}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Prix de vente (DZD)'
                    type='number'
                    value={formPrix.prix_vente ?? ''}
                    onChange={e => setFormPrix({ ...formPrix, prix_vente: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Prix promo (DZD)'
                    type='number'
                    value={formPrix.prix_promo ?? ''}
                    onChange={e => setFormPrix({ ...formPrix, prix_promo: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Début de la promo'
                    type='date'
                    InputLabelProps={{ shrink: true }}
                    value={formPrix.debut_promo || ''}
                    onChange={e => setFormPrix({ ...formPrix, debut_promo: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Fin de la promo'
                    type='date'
                    InputLabelProps={{ shrink: true }}
                    value={formPrix.fin_promo || ''}
                    onChange={e => setFormPrix({ ...formPrix, fin_promo: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant='body2' color='text.secondary'>
                    Chaque changement de prix de vente est enregistré dans l&apos;historique.
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Button variant='contained' onClick={enregistrerPrix}>
                    Enregistrer les prix
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value='3' sx={{ p: 0, pt: 5 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>URL</TableCell>
                      <TableCell align='center'>Ordre</TableCell>
                      <TableCell align='center'>Principale</TableCell>
                      <TableCell align='center'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(produitSelectionne?.images || []).map(image => (
                      <TableRow key={image.id_img}>
                        <TableCell sx={{ wordBreak: 'break-all' }}>{image.url_image}</TableCell>
                        <TableCell align='center'>{image.ordre_image}</TableCell>
                        <TableCell align='center'>
                          {image.est_principale ? (
                            <Chip label='Principale' color='primary' size='small' />
                          ) : (
                            <Button
                              size='small'
                              onClick={async () => {
                                if (await definirImagePrincipale(produitSelectionne.id_prd, image.id_img)) {
                                  await rafraichirDetail(produitSelectionne.id_prd)
                                }
                              }}
                            >
                              Définir principale
                            </Button>
                          )}
                        </TableCell>
                        <TableCell align='center'>
                          <IconButton
                            size='small'
                            onClick={async () => {
                              if (await supprimerImage(produitSelectionne.id_prd, image.id_img)) {
                                await rafraichirDetail(produitSelectionne.id_prd)
                              }
                            }}
                          >
                            <Icon icon='tabler:trash' />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(produitSelectionne?.images || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align='center'>
                          Aucune image.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <Grid container spacing={4} sx={{ mt: 4 }}>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    label="URL de l'image"
                    value={nouvelleImage.url_image}
                    onChange={e => setNouvelleImage({ ...nouvelleImage, url_image: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    fullWidth
                    label='Ordre'
                    type='number'
                    value={nouvelleImage.ordre_image}
                    onChange={e => setNouvelleImage({ ...nouvelleImage, ordre_image: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    variant='outlined'
                    fullWidth
                    disabled={!nouvelleImage.url_image.trim()}
                    onClick={async () => {
                      if (
                        await ajouterImage(produitSelectionne.id_prd, {
                          url_image: nouvelleImage.url_image.trim(),
                          ordre_image: nouvelleImage.ordre_image === '' ? 0 : parseInt(nouvelleImage.ordre_image, 10)
                        })
                      ) {
                        setNouvelleImage({ url_image: '', ordre_image: '' })
                        await rafraichirDetail(produitSelectionne.id_prd)
                      }
                    }}
                  >
                    Ajouter
                  </Button>
                </Grid>
              </Grid>
              <Grid container spacing={4} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={10}>
                  <Button variant='outlined' component='label' fullWidth>
                    Choisir un fichier (JPEG, PNG, WebP — max 5 Mo)
                    <input
                      type='file'
                      hidden
                      accept='image/jpeg,image/png,image/webp'
                      onChange={e => setFichierImage(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                    />
                  </Button>
                  {fichierImage && (
                    <Typography variant='body2' sx={{ mt: 2 }}>
                      {fichierImage.name} — {(fichierImage.size / 1024).toFixed(0)} Ko
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    variant='contained'
                    fullWidth
                    disabled={!fichierImage}
                    onClick={async () => {
                      if (
                        await uploaderImage(
                          produitSelectionne.id_prd,
                          fichierImage,
                          nouvelleImage.ordre_image === '' ? 0 : parseInt(nouvelleImage.ordre_image, 10)
                        )
                      ) {
                        setFichierImage(null)
                        await rafraichirDetail(produitSelectionne.id_prd)
                      }
                    }}
                  >
                    Téléverser
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value='4' sx={{ p: 0, pt: 5 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell align='center'>Quantité minimum</TableCell>
                      <TableCell align='right'>Prix unitaire (DZD)</TableCell>
                      <TableCell align='center'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(produitSelectionne?.paliers || []).map(palier => (
                      <TableRow key={palier.id_palier}>
                        <TableCell align='center'>dès {palier.quantite_min} pièces</TableCell>
                        <TableCell align='right'>
                          {Number(palier.prix_unitaire).toLocaleString('fr-FR')} DZD
                        </TableCell>
                        <TableCell align='center'>
                          <IconButton
                            size='small'
                            onClick={async () => {
                              if (await supprimerPalier(produitSelectionne.id_prd, palier.id_palier)) {
                                await rafraichirDetail(produitSelectionne.id_prd)
                              }
                            }}
                          >
                            <Icon icon='tabler:trash' />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(produitSelectionne?.paliers || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align='center'>
                          Aucun palier de prix.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <Grid container spacing={4} sx={{ mt: 4 }}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label='Quantité minimum'
                    type='number'
                    value={nouveauPalier.quantite_min}
                    onChange={e => setNouveauPalier({ ...nouveauPalier, quantite_min: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label='Prix unitaire (DZD)'
                    type='number'
                    value={nouveauPalier.prix_unitaire}
                    onChange={e => setNouveauPalier({ ...nouveauPalier, prix_unitaire: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant='outlined'
                    fullWidth
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
                    Ajouter
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value='5' sx={{ p: 0, pt: 5 }}>
              <TableContainer>
                <Table>
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
            </TabPanel>
          </TabContext>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProduitSelectionne(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default ProduitsEcommerceView
