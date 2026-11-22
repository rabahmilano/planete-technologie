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
  TableRow,
  TextField,
  Typography,
  Autocomplete
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import { usePromotion } from 'src/context/PromotionContext'
import { useFamille } from 'src/context/FamilleContext'
import { useProduitDashboard } from 'src/context/ProduitDashboardContext'

const TYPES = [
  { valeur: 'POURCENTAGE', label: 'Pourcentage (%)' },
  { valeur: 'MONTANT_FIXE', label: 'Montant fixe (DZD)' }
]
const PERIMETRES = [
  { valeur: 'TOUS', label: 'Tout le catalogue' },
  { valeur: 'FAMILLES', label: 'Familles sélectionnées' },
  { valeur: 'PRODUITS', label: 'Produits sélectionnés' }
]

const formaterDate = valeur => {
  if (!valeur) return '—'
  return new Date(valeur).toLocaleDateString('fr-FR')
}

const ProduitsEcommercePromotionsView = () => {
  const { promotions, loading, ajouterPromotion, modifierPromotion, supprimerPromotion } = usePromotion()
  const { familles } = useFamille()
  const { fetchHistoriquePrix } = useProduitDashboard()

  const [dialogOuvert, setDialogOuvert] = useState(false)
  const [promotionEnCours, setPromotionEnCours] = useState(null)
  const [aSupprimer, setASupprimer] = useState(null)
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false)
  const [listeProduits, setListeProduits] = useState([])
  const [formulaire, setFormulaire] = useState({
    type_reduction: 'POURCENTAGE',
    valeur_reduction: '',
    date_debut: '',
    date_fin: '',
    perimetre: 'TOUS',
    familles: [],
    produits: [],
    est_active: true
  })

  const optionsFamilles = []
  familles.forEach(f => {
    optionsFamilles.push({ id_famille: f.id_famille, nom: f.nom_famille })
    if (f.sous_familles?.length) {
      f.sous_familles.forEach(s => {
        optionsFamilles.push({ id_famille: s.id_famille, nom: `${f.nom_famille} › ${s.nom_famille}` })
      })
    }
  })

  useEffect(() => {
    fetchHistoriquePrix({ page: 1, limit: 1000, search: '', vue: 'ecommerce' }).then(data => {
      setListeProduits(data?.produits || [])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ouvrirCreation = () => {
    setPromotionEnCours(null)
    setFormulaire({
      type_reduction: 'POURCENTAGE',
      valeur_reduction: '',
      date_debut: '',
      date_fin: '',
      perimetre: 'TOUS',
      familles: [],
      produits: [],
      est_active: true
    })
    setDialogOuvert(true)
  }

  const ouvrirModification = promotion => {
    setPromotionEnCours(promotion)
    setFormulaire({
      type_reduction: promotion.type_reduction,
      valeur_reduction: parseFloat(promotion.valeur_reduction),
      date_debut: new Date(promotion.date_debut).toISOString().slice(0, 10),
      date_fin: new Date(promotion.date_fin).toISOString().slice(0, 10),
      perimetre: promotion.perimetre,
      familles: (promotion.familles || []).map(f => f.famille_id),
      produits: (promotion.produits || []).map(p => p.produit_id),
      est_active: Boolean(promotion.est_active)
    })
    setDialogOuvert(true)
  }

  const soumettre = async () => {
    if (enregistrementEnCours) return
    setEnregistrementEnCours(true)
    const donnees = {
      type_reduction: formulaire.type_reduction,
      valeur_reduction: parseFloat(formulaire.valeur_reduction),
      date_debut: formulaire.date_debut ? new Date(formulaire.date_debut).toISOString() : null,
      date_fin: formulaire.date_fin ? new Date(formulaire.date_fin).toISOString() : null,
      perimetre: formulaire.perimetre,
      familles: formulaire.perimetre === 'FAMILLES' ? formulaire.familles : [],
      produits: formulaire.perimetre === 'PRODUITS' ? formulaire.produits : [],
      est_active: formulaire.est_active
    }
    const ok = promotionEnCours
      ? await modifierPromotion(promotionEnCours.id_promotion, donnees)
      : await ajouterPromotion(donnees)
    setEnregistrementEnCours(false)
    if (ok) setDialogOuvert(false)
  }

  const basculerActive = async promotion => {
    await modifierPromotion(promotion.id_promotion, { est_active: !promotion.est_active })
  }

  const confirmerSuppression = async () => {
    if (await supprimerPromotion(aSupprimer.id_promotion)) {
      setASupprimer(null)
    }
  }

  const detailPerimetre = promotion => {
    if (promotion.perimetre === 'TOUS') return 'Tout le catalogue'
    if (promotion.perimetre === 'FAMILLES') {
      return (promotion.familles || []).map(f => f.famille?.nom_famille).filter(Boolean).join(', ') || '—'
    }
    return (promotion.produits || []).map(p => p.produit?.designation_prd).filter(Boolean).join(', ') || '—'
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant='h5'>Promotions boutique</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              Remises temporaires par pourcentage ou montant fixe. En cas de promotions qui se
              recouvrent, le meilleur prix pour le client s&apos;applique (pas de cumul). Un palier
              de quantité, s&apos;il existe, s&apos;applique tel quel.
            </Typography>
          </Box>
          <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={ouvrirCreation}>
            Nouvelle promotion
          </Button>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3, position: 'relative' }}>
          {loading && <LinearProgress sx={{ position: 'absolute', top: 0, width: '100%', zIndex: 1 }} />}
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
                  <TableCell sx={{ color: 'white' }}>Réduction</TableCell>
                  <TableCell sx={{ color: 'white' }}>Période</TableCell>
                  <TableCell sx={{ color: 'white' }}>Périmètre</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Statut</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {promotions.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align='center'>
                      <Typography sx={{ p: 4 }}>
                        Aucune promotion. Créez la première promotion pour la boutique.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  promotions.map(promotion => (
                    <TableRow key={promotion.id_promotion}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600 }}>
                          {promotion.type_reduction === 'POURCENTAGE'
                            ? `-${Number(promotion.valeur_reduction)} %`
                            : `-${Number(promotion.valeur_reduction).toLocaleString('fr-FR')} DZD`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {formaterDate(promotion.date_debut)} → {formaterDate(promotion.date_fin)}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 420 }}>
                        <Typography
                          variant='body2'
                          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {detailPerimetre(promotion)}
                        </Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <Chip
                          label={promotion.est_active ? 'Active' : 'Inactive'}
                          color={promotion.est_active ? 'success' : 'default'}
                          size='small'
                        />
                      </TableCell>
                      <TableCell align='center'>
                        <IconButton
                          size='small'
                          title={promotion.est_active ? 'Désactiver' : 'Activer'}
                          aria-label={`${promotion.est_active ? 'Désactiver' : 'Activer'} la promotion du ${formaterDate(promotion.date_debut)}`}
                          onClick={() => basculerActive(promotion)}
                        >
                          <Icon icon={promotion.est_active ? 'tabler:player-pause' : 'tabler:player-play'} />
                        </IconButton>
                        <IconButton
                          size='small'
                          title='Modifier'
                          aria-label={`Modifier la promotion du ${formaterDate(promotion.date_debut)}`}
                          onClick={() => ouvrirModification(promotion)}
                        >
                          <Icon icon='tabler:pencil' />
                        </IconButton>
                        <IconButton
                          size='small'
                          title='Supprimer'
                          aria-label={`Supprimer la promotion du ${formaterDate(promotion.date_debut)}`}
                          onClick={() => setASupprimer(promotion)}
                        >
                          <Icon icon='tabler:trash' />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>

      <Dialog open={dialogOuvert} onClose={() => setDialogOuvert(false)} fullWidth maxWidth='sm'>
        <DialogTitle>{promotionEnCours ? 'Modifier la promotion' : 'Nouvelle promotion'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={4} sx={{ pt: 2 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type de réduction</InputLabel>
                <Select
                  label='Type de réduction'
                  autoComplete='off'
                  value={formulaire.type_reduction}
                  onChange={e => setFormulaire({ ...formulaire, type_reduction: e.target.value })}
                >
                  {TYPES.map(t => (
                    <MenuItem key={t.valeur} value={t.valeur}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={formulaire.type_reduction === 'POURCENTAGE' ? 'Pourcentage de réduction (%)' : 'Montant de la réduction (DZD)'}
                type='number'
                autoComplete='off'
                value={formulaire.valeur_reduction}
                onChange={e => setFormulaire({ ...formulaire, valeur_reduction: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Date de début'
                type='date'
                InputLabelProps={{ shrink: true }}
                autoComplete='off'
                value={formulaire.date_debut}
                onChange={e => setFormulaire({ ...formulaire, date_debut: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Date de fin'
                type='date'
                InputLabelProps={{ shrink: true }}
                autoComplete='off'
                value={formulaire.date_fin}
                onChange={e => setFormulaire({ ...formulaire, date_fin: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Périmètre</InputLabel>
                <Select
                  label='Périmètre'
                  autoComplete='off'
                  value={formulaire.perimetre}
                  onChange={e => setFormulaire({ ...formulaire, perimetre: e.target.value })}
                >
                  {PERIMETRES.map(p => (
                    <MenuItem key={p.valeur} value={p.valeur}>
                      {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {formulaire.perimetre === 'FAMILLES' && (
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={optionsFamilles}
                  getOptionLabel={option => option.nom}
                  value={optionsFamilles.filter(o => formulaire.familles.includes(o.id_famille))}
                  onChange={(event, valeur) =>
                    setFormulaire({ ...formulaire, familles: valeur.map(v => v.id_famille) })
                  }
                  renderInput={params => <TextField {...params} label='Familles concernées' placeholder='Rechercher une famille' />}
                />
              </Grid>
            )}
            {formulaire.perimetre === 'PRODUITS' && (
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={listeProduits}
                  getOptionLabel={option => option.designation_prd}
                  value={listeProduits.filter(p => formulaire.produits.includes(p.id_prd))}
                  onChange={(event, valeur) =>
                    setFormulaire({ ...formulaire, produits: valeur.map(v => v.id_prd) })
                  }
                  renderInput={params => <TextField {...params} label='Produits concernés' placeholder='Rechercher un produit' />}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(formulaire.est_active)}
                    onChange={e => setFormulaire({ ...formulaire, est_active: e.target.checked })}
                  />
                }
                label='Promotion active'
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOuvert(false)}>Annuler</Button>
          <Button
            variant='contained'
            onClick={soumettre}
            disabled={
              enregistrementEnCours ||
              !formulaire.valeur_reduction ||
              !formulaire.date_debut ||
              !formulaire.date_fin ||
              (formulaire.perimetre === 'FAMILLES' && formulaire.familles.length === 0) ||
              (formulaire.perimetre === 'PRODUITS' && formulaire.produits.length === 0)
            }
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(aSupprimer)} onClose={() => setASupprimer(null)}>
        <DialogTitle>Supprimer cette promotion ?</DialogTitle>
        <DialogContent>
          <Typography>
            La promotion du {formaterDate(aSupprimer?.date_debut)} sera supprimée. Les produits
            concernés reprendront leur prix de vente normal.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setASupprimer(null)}>Annuler</Button>
          <Button variant='contained' color='error' onClick={confirmerSuppression}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default ProduitsEcommercePromotionsView
