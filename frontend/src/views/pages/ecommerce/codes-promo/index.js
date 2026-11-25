import { useState } from 'react'
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
  Typography
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import { useCodePromo } from 'src/context/CodePromoContext'

const formaterDate = valeur => {
  if (!valeur) return '—'
  
return new Date(valeur).toLocaleDateString('fr-FR')
}

const formaterReduction = code => {
  if (code.type_reduction === 'POURCENTAGE') return `${code.valeur_reduction} %`
  
return `${Number(code.valeur_reduction).toLocaleString('fr-FR')} DZD`
}

const CodesPromoView = () => {
  const { codes, loading, ajouterCode, modifierCode, supprimerCode, verifierCode } = useCodePromo()
  const [dialogOuvert, setDialogOuvert] = useState(false)
  const [codeEnCours, setCodeEnCours] = useState(null)
  const [aSupprimer, setASupprimer] = useState(null)

  const [formulaire, setFormulaire] = useState({
    code: '',
    type_reduction: 'POURCENTAGE',
    valeur_reduction: '',
    date_debut: '',
    date_expiration: '',
    utilisation_max: '',
    montant_min_promo: '',
    est_actif_promo: true
  })
  const [verifCode, setVerifCode] = useState('')
  const [verifMontant, setVerifMontant] = useState('')
  const [verifResultat, setVerifResultat] = useState(null)

  const ouvrirCreation = () => {
    setCodeEnCours(null)
    setFormulaire({
      code: '',
      type_reduction: 'POURCENTAGE',
      valeur_reduction: '',
      date_debut: '',
      date_expiration: '',
      utilisation_max: '',
      montant_min_promo: '',
      est_actif_promo: true
    })
    setDialogOuvert(true)
  }

  const ouvrirModification = code => {
    setCodeEnCours(code)
    setFormulaire({
      code: code.code,
      type_reduction: code.type_reduction,
      valeur_reduction: code.valeur_reduction,
      date_debut: code.date_debut ? new Date(code.date_debut).toISOString().slice(0, 10) : '',
      date_expiration: code.date_expiration ? new Date(code.date_expiration).toISOString().slice(0, 10) : '',
      utilisation_max: code.utilisation_max,
      montant_min_promo: code.montant_min_promo ?? '',
      est_actif_promo: code.est_actif_promo
    })
    setDialogOuvert(true)
  }

  const soumettre = async () => {
    const donnees = {
      code: formulaire.code.trim().toUpperCase(),
      type_reduction: formulaire.type_reduction,
      valeur_reduction: parseFloat(formulaire.valeur_reduction),
      date_debut: formulaire.date_debut || null,
      date_expiration: formulaire.date_expiration,
      utilisation_max: parseInt(formulaire.utilisation_max, 10),
      montant_min_promo:
        formulaire.montant_min_promo === '' ? null : parseFloat(formulaire.montant_min_promo),
      est_actif_promo: formulaire.est_actif_promo
    }
    const ok = codeEnCours ? await modifierCode(codeEnCours.id_code, donnees) : await ajouterCode(donnees)
    if (ok) setDialogOuvert(false)
  }

  const basculerActif = async code => {
    await modifierCode(code.id_code, { est_actif_promo: !code.est_actif_promo })
  }

  const confirmerSuppression = async () => {
    if (await supprimerCode(aSupprimer.id_code)) {
      setASupprimer(null)
    }
  }

  const testerCode = async () => {
    const resultat = await verifierCode(verifCode.trim(), parseFloat(verifMontant) || 0)
    setVerifResultat(resultat)
  }

  const expire = code => new Date(code.date_expiration) < new Date(new Date().toDateString())
  const aVenir = code => code.date_debut && new Date(code.date_debut) > new Date(new Date().toDateString())
  const epuise = code => code.utilisation_actuelle >= code.utilisation_max

  const datesIncoherentes =
    formulaire.date_debut && formulaire.date_expiration && formulaire.date_debut > formulaire.date_expiration

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant='h5'>Codes promo</Typography>
          <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={ouvrirCreation}>
            Nouveau code
          </Button>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3, p: 5, mb: 6 }}>
          <Typography variant='h6' sx={{ mb: 4 }}>
            Vérifier un code
          </Typography>
          <Grid container spacing={4} alignItems='center'>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label='Code'
                value={verifCode}
                onChange={e => setVerifCode(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label='Montant de la commande (DZD)'
                type='number'
                value={verifMontant}
                onChange={e => setVerifMontant(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button variant='outlined' onClick={testerCode} disabled={!verifCode.trim()}>
                Vérifier
              </Button>
            </Grid>
            {verifResultat && (
              <Grid item xs={12}>
                {verifResultat.valide ? (
                  <Chip
                    color='success'
                    label={`Valide — réduction de ${Number(verifResultat.montant_reduction).toLocaleString('fr-FR')} DZD`}
                  />
                ) : (
                  <Chip color='error' label={`Invalide — ${verifResultat.message}`} />
                )}
              </Grid>
            )}
          </Grid>
        </Card>
      </Grid>
      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3, position: 'relative' }}>
          {loading && <LinearProgress sx={{ position: 'absolute', top: 0, width: '100%', zIndex: 1 }} />}
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
                  <TableCell sx={{ color: 'white' }}>Code</TableCell>
                  <TableCell sx={{ color: 'white' }}>Réduction</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Minimum</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Utilisation</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Commandes web</TableCell>
                  <TableCell sx={{ color: 'white' }}>Début</TableCell>
                  <TableCell sx={{ color: 'white' }}>Expiration</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Statut</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {codes.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align='center'>
                      <Typography sx={{ p: 4 }}>Aucun code promo.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  codes.map(code => (
                    <TableRow key={code.id_code}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600 }}>{code.code}</Typography>
                      </TableCell>
                      <TableCell>{formaterReduction(code)}</TableCell>
                      <TableCell align='center'>
                        {code.montant_min_promo ? `${Number(code.montant_min_promo).toLocaleString('fr-FR')} DZD` : '—'}
                      </TableCell>
                      <TableCell align='center'>
                        {code.utilisation_actuelle} / {code.utilisation_max}
                      </TableCell>
                      <TableCell align='center'>{code._count?.commandes ?? 0}</TableCell>
                      <TableCell>{formaterDate(code.date_debut)}</TableCell>
                      <TableCell>{formaterDate(code.date_expiration)}</TableCell>
                      <TableCell align='center'>
                        {!code.est_actif_promo ? (
                          <Chip label='Désactivé' color='default' size='small' />
                        ) : aVenir(code) ? (
                          <Chip label='À venir' color='info' size='small' />
                        ) : expire(code) ? (
                          <Chip label='Expiré' color='error' size='small' />
                        ) : epuise(code) ? (
                          <Chip label='Épuisé' color='warning' size='small' />
                        ) : (
                          <Chip label='Actif' color='success' size='small' />
                        )}
                      </TableCell>
                      <TableCell align='center'>
                        <IconButton
                          size='small'
                          title='Activer / désactiver'
                          aria-label={`${code.est_actif_promo ? 'Désactiver' : 'Activer'} le code ${code.code}`}
                          onClick={() => basculerActif(code)}
                        >
                          <Icon icon={code.est_actif_promo ? 'tabler:toggle-right' : 'tabler:toggle-left'} />
                        </IconButton>
                        <IconButton
                          size='small'
                          title='Modifier'
                          aria-label={`Modifier le code ${code.code}`}
                          onClick={() => ouvrirModification(code)}
                        >
                          <Icon icon='tabler:pencil' />
                        </IconButton>
                        <IconButton
                          size='small'
                          title='Supprimer'
                          aria-label={`Supprimer le code ${code.code}`}
                          onClick={() => setASupprimer(code)}
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
        <DialogTitle>{codeEnCours ? 'Modifier le code promo' : 'Nouveau code promo'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={4} sx={{ pt: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Code'
                autoComplete='off'
                helperText='Lettres et chiffres — enregistré en majuscules'
                value={formulaire.code}
                onChange={e => setFormulaire({ ...formulaire, code: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type de réduction</InputLabel>
                <Select
                  label='Type de réduction'
                  autoComplete='off'
                  value={formulaire.type_reduction}
                  onChange={e => setFormulaire({ ...formulaire, type_reduction: e.target.value })}
                >
                  <MenuItem value='POURCENTAGE'>Pourcentage (%)</MenuItem>
                  <MenuItem value='MONTANT_FIXE'>Montant fixe (DZD)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={formulaire.type_reduction === 'POURCENTAGE' ? 'Valeur (%)' : 'Valeur (DZD)'}
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
                helperText={
                  datesIncoherentes
                    ? "La date de début doit être antérieure ou égale à la date d'expiration"
                    : 'Vide = actif immédiatement'
                }
                error={Boolean(datesIncoherentes)}
                value={formulaire.date_debut}
                onChange={e => setFormulaire({ ...formulaire, date_debut: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date d'expiration"
                type='date'
                InputLabelProps={{ shrink: true }}
                autoComplete='off'
                value={formulaire.date_expiration}
                onChange={e => setFormulaire({ ...formulaire, date_expiration: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Utilisation maximum'
                type='number'
                autoComplete='off'
                value={formulaire.utilisation_max}
                onChange={e => setFormulaire({ ...formulaire, utilisation_max: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Montant minimum (DZD, optionnel)'
                type='number'
                autoComplete='off'
                value={formulaire.montant_min_promo}
                onChange={e => setFormulaire({ ...formulaire, montant_min_promo: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(formulaire.est_actif_promo)}
                    onChange={e => setFormulaire({ ...formulaire, est_actif_promo: e.target.checked })}
                  />
                }
                label='Code actif'
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOuvert(false)}>Annuler</Button>
          <Button
            variant='contained'
            onClick={soumettre}
            disabled={!formulaire.code.trim() || !formulaire.valeur_reduction || !formulaire.date_expiration || !formulaire.utilisation_max || datesIncoherentes}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(aSupprimer)} onClose={() => setASupprimer(null)}>
        <DialogTitle>Supprimer ce code promo ?</DialogTitle>
        <DialogContent>
          <Typography>
            Le code « {aSupprimer?.code} » sera supprimé. La suppression est refusée s&apos;il a déjà été utilisé
            par des commandes.
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

export default CodesPromoView
