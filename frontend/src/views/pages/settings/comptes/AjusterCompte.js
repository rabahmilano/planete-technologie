import { useMemo, useState } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import InputAdornment from '@mui/material/InputAdornment'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import { useCompte } from 'src/context/CompteContext'
import { formatMontant } from 'src/@core/utils/format'
import dayjs from 'dayjs'

const AjusterCompte = () => {
  const { tousLesComptes, creerAjustement } = useCompte()
  const [compteId, setCompteId] = useState('')
  const [typeAjustement, setTypeAjustement] = useState('AUGMENTATION')
  const [modeTaux, setModeTaux] = useState('ACTUEL')
  const [montant, setMontant] = useState('')
  const [tauxPersonnalise, setTauxPersonnalise] = useState('')
  const [dateAjustement, setDateAjustement] = useState(dayjs().format('YYYY-MM-DD'))
  const [observation, setObservation] = useState('')
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [operation, setOperation] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const compte = useMemo(
    () => tousLesComptes?.find(item => String(item.id_cpt) === String(compteId)),
    [tousLesComptes, compteId]
  )
  const tauxUtilise = typeAjustement === 'DIMINUTION' || modeTaux === 'ACTUEL'
    ? Number(compte?.taux_change_actuel || 0)
    : Number(tauxPersonnalise || 0)

  const handleTypeChange = event => {
    const type = event.target.value
    setTypeAjustement(type)
    if (type === 'DIMINUTION') setModeTaux('ACTUEL')
  }

  const handleSubmit = event => {
    event.preventDefault()
    if (!compteId || !Number(montant) || Number(montant) <= 0 || !dateAjustement || !observation.trim()) return
    if (typeAjustement === 'AUGMENTATION' && modeTaux === 'PERSONNALISE' &&
      (!Number(tauxPersonnalise) || Number(tauxPersonnalise) <= 0)) return

    setOperation({
      compteId: String(compteId),
      typeAjustement,
      montant: String(montant),
      modeTaux,
      tauxPersonnalise: modeTaux === 'PERSONNALISE' ? String(tauxPersonnalise) : undefined,
      dateAjustement,
      observation: observation.trim()
    })
    setConfirmationOpen(true)
  }

  const confirmer = async () => {
    if (!operation || submitting) return
    setSubmitting(true)
    try {
      const success = await creerAjustement(operation)
      if (success) {
        setCompteId('')
        setTypeAjustement('AUGMENTATION')
        setModeTaux('ACTUEL')
        setMontant('')
        setTauxPersonnalise('')
        setDateAjustement(dayjs().format('YYYY-MM-DD'))
        setObservation('')
        setOperation(null)
        setConfirmationOpen(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const compteConfirme = tousLesComptes?.find(item => String(item.id_cpt) === String(operation?.compteId))
  const tauxConfirme = operation?.typeAjustement === 'DIMINUTION' || operation?.modeTaux === 'ACTUEL'
    ? Number(compteConfirme?.taux_change_actuel || 0)
    : Number(operation?.tauxPersonnalise || 0)

  return (
    <>
      <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Icon icon='tabler:adjustments' fontSize='1.75rem' color='primary' />
              <Typography variant='h6'>Ajuster le solde d'un compte</Typography>
            </Box>
          }
        />
        <CardContent>
          <Box component='form' onSubmit={handleSubmit}>
            <Grid container spacing={5}>
              <Grid item xs={12} md={6}>
                <CustomTextField select fullWidth label='Compte' value={compteId}
                  onChange={event => setCompteId(event.target.value)} required>
                  {tousLesComptes?.map(item => (
                    <MenuItem key={item.id_cpt} value={item.id_cpt}>
                      {item.designation_cpt} ({item.dev_code})
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <CustomTextField fullWidth type='date' label='Date de l’ajustement'
                  value={dateAjustement} onChange={event => setDateAjustement(event.target.value)}
                  InputLabelProps={{ shrink: true }} inputProps={{ max: dayjs().format('YYYY-MM-DD') }} required />
              </Grid>
              <Grid item xs={12}>
                <FormControl>
                  <Typography variant='body2' sx={{ mb: 1, fontWeight: 600 }}>Type d'ajustement</Typography>
                  <RadioGroup row value={typeAjustement} onChange={handleTypeChange}>
                    <FormControlLabel value='AUGMENTATION' control={<Radio />} label='Augmentation du solde' />
                    <FormControlLabel value='DIMINUTION' control={<Radio />} label='Diminution du solde' />
                  </RadioGroup>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <CustomTextField fullWidth label={`Montant en ${compte?.dev_code || 'devise'}`}
                  value={montant} onChange={event => setMontant(event.target.value)}
                  type='number' inputProps={{ min: '0.01', step: '0.01' }} required
                  InputProps={{ endAdornment: <InputAdornment position='end'>{compte?.dev_code || '—'}</InputAdornment> }} />
              </Grid>
              {typeAjustement === 'AUGMENTATION' && (
                <Grid item xs={12}>
                  <FormControl>
                    <Typography variant='body2' sx={{ mb: 1, fontWeight: 600 }}>Taux de change à appliquer</Typography>
                    <RadioGroup row value={modeTaux} onChange={event => setModeTaux(event.target.value)}>
                      <FormControlLabel value='ACTUEL' control={<Radio />} label={`Taux actuel (${formatMontant(compte?.taux_change_actuel || 0)} DZD)`} />
                      <FormControlLabel value='PERSONNALISE' control={<Radio />} label='Saisir un taux personnalisé' />
                    </RadioGroup>
                  </FormControl>
                </Grid>
              )}
              {typeAjustement === 'AUGMENTATION' && modeTaux === 'PERSONNALISE' && (
                <Grid item xs={12} md={6}>
                  <CustomTextField fullWidth label='Taux personnalisé' value={tauxPersonnalise}
                    onChange={event => setTauxPersonnalise(event.target.value)} type='number'
                    inputProps={{ min: '0.01', step: '0.01' }} required
                    InputProps={{ endAdornment: <InputAdornment position='end'>DZD</InputAdornment> }} />
                </Grid>
              )}
              {typeAjustement === 'DIMINUTION' && (
                <Grid item xs={12}>
                  <Typography variant='body2' color='text.secondary'>
                    Le taux actuel du compte ({formatMontant(compte?.taux_change_actuel || 0)} DZD) sera utilisé. Le taux moyen restera inchangé.
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <CustomTextField fullWidth label='Motif de l’ajustement' value={observation}
                  onChange={event => setObservation(event.target.value)} inputProps={{ maxLength: 255 }} required />
              </Grid>
              {compte && montant && Number(montant) > 0 && (
                <Grid item xs={12}>
                  <Typography variant='body2' color='text.secondary'>
                    Taux utilisé : {formatMontant(tauxUtilise)} DZD
                    {typeAjustement === 'AUGMENTATION' && modeTaux === 'PERSONNALISE'
                      ? ' — le taux moyen du compte sera recalculé après l’ajustement.'
                      : ''}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type='submit' variant='contained' disabled={submitting}
                  startIcon={<Icon icon='tabler:adjustments' />}>Enregistrer l’ajustement</Button>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmationOpen}
        loading={submitting}
        loadingText='Enregistrement…'
        handleClose={() => { if (!submitting) setConfirmationOpen(false) }}
        handleConfirm={confirmer}
        title='Confirmer l’ajustement du compte'
        confirmText='Confirmer'
        cancelText='Retour au formulaire'
        actionType='warning'
        content={
          <Box>
            <Typography sx={{ mb: 3 }}>Vérifiez les informations avant d’enregistrer cet ajustement.</Typography>
            <Typography><strong>Compte :</strong> {compteConfirme?.designation_cpt} ({compteConfirme?.dev_code})</Typography>
            <Typography><strong>Type :</strong> {operation?.typeAjustement === 'AUGMENTATION' ? 'Augmentation' : 'Diminution'}</Typography>
            <Typography><strong>Montant :</strong> {formatMontant(operation?.montant || 0)} {compteConfirme?.dev_code}</Typography>
            <Typography><strong>Taux utilisé :</strong> {formatMontant(tauxConfirme)} DZD</Typography>
            <Typography><strong>Date :</strong> {operation?.dateAjustement ? dayjs(operation.dateAjustement).format('DD/MM/YYYY') : '—'}</Typography>
            <Typography><strong>Motif :</strong> {operation?.observation}</Typography>
          </Box>
        }
      />
    </>
  )
}

export default AjusterCompte
