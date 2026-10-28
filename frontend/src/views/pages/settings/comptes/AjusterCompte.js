import { useMemo, useState } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import { useCompte } from 'src/context/CompteContext'
import { formatMontant } from 'src/@core/utils/format'
import CleaveInput from 'src/components/CleaveInput'
import { useForm, Controller } from 'react-hook-form'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

dayjs.locale('fr')

const defaultValues = {
  compteId: '',
  typeAjustement: 'AUGMENTATION',
  modeTaux: 'ACTUEL',
  montant: '',
  tauxPersonnalise: '',
  dateAjustement: dayjs(),
  observation: ''
}

const AjusterCompte = () => {
  const { tousLesComptes, creerAjustement } = useCompte()
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [operation, setOperation] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm({ defaultValues })

  const compteId = watch('compteId')
  const typeAjustement = watch('typeAjustement')
  const modeTaux = watch('modeTaux')
  const montant = watch('montant')
  const tauxPersonnalise = watch('tauxPersonnalise')
  const compte = useMemo(
    () => tousLesComptes?.find(item => String(item.id_cpt) === String(compteId)),
    [tousLesComptes, compteId]
  )
  const tauxUtilise = typeAjustement === 'DIMINUTION' || modeTaux === 'ACTUEL'
    ? Number(compte?.taux_change_actuel || 0)
    : Number(tauxPersonnalise || 0)

  const lireNombre = value => Number(String(value ?? '').replace(/[\s,]/g, '')) || 0

  const onSubmit = data => {
    const montantNet = lireNombre(data.montant)
    const tauxNet = lireNombre(data.tauxPersonnalise)
    if (!data.compteId || montantNet <= 0 || !data.observation.trim()) return
    if (data.typeAjustement === 'AUGMENTATION' && data.modeTaux === 'PERSONNALISE' && tauxNet <= 0) return

    setOperation({
      compteId: String(data.compteId),
      typeAjustement: data.typeAjustement,
      montant: String(montantNet),
      modeTaux: data.typeAjustement === 'DIMINUTION' ? 'ACTUEL' : data.modeTaux,
      tauxPersonnalise: data.modeTaux === 'PERSONNALISE' ? String(tauxNet) : undefined,
      dateAjustement: dayjs(data.dateAjustement).format('YYYY-MM-DD'),
      observation: data.observation.trim()
    })
    setConfirmationOpen(true)
  }

  const confirmer = async () => {
    if (!operation || submitting) return
    setSubmitting(true)
    try {
      const success = await creerAjustement(operation)
      if (success) {
        reset({ ...defaultValues, dateAjustement: dayjs() })
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
        <CardContent sx={{ pt: 2 }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={4} alignItems='flex-end'>
              <Grid item xs={12} sm={6} md={4}>
                <Controller
                  name='compteId'
                  control={control}
                  rules={{ required: 'Sélectionnez un compte' }}
                  render={({ field }) => (
                    <CustomTextField {...field} select fullWidth label='Compte'
                      error={Boolean(errors.compteId)} helperText={errors.compteId?.message}>
                      {tousLesComptes?.map(item => (
                        <MenuItem key={item.id_cpt} value={String(item.id_cpt)}>
                          {item.designation_cpt} ({item.dev_code})
                        </MenuItem>
                      ))}
                    </CustomTextField>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Controller
                  name='dateAjustement'
                  control={control}
                  rules={{ required: 'La date est obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                      <DatePicker
                        {...field}
                        maxDate={dayjs()}
                        label='Date de l’ajustement'
                        slots={{ textField: CustomTextField }}
                        slotProps={{ textField: { fullWidth: true, error: !!error, helperText: error?.message, autoComplete: 'off' } }}
                      />
                    </LocalizationProvider>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Controller
                  name='montant'
                  control={control}
                  rules={{
                    required: 'Le montant est obligatoire',
                    validate: value => lireNombre(value) > 0 || 'Le montant doit être supérieur à zéro'
                  }}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      label='Montant à ajuster'
                      autoComplete='off'
                      error={Boolean(errors.montant)}
                      helperText={errors.montant?.message}
                      InputProps={{
                        inputComponent: CleaveInput,
                        endAdornment: <InputAdornment position='end'>{compte?.dev_code || 'Devise'}</InputAdornment>
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant='body2' sx={{ mb: 1, fontWeight: 600 }}>Sens de l’ajustement</Typography>
                <Controller
                  name='typeAjustement'
                  control={control}
                  render={({ field }) => (
                    <RadioGroup row {...field} onChange={event => {
                      field.onChange(event.target.value)
                      if (event.target.value === 'DIMINUTION') {
                        // Une diminution utilise obligatoirement le taux courant.
                      }
                    }}>
                      <FormControlLabel value='AUGMENTATION' control={<Radio size='small' />} label='Augmentation du solde' />
                      <FormControlLabel value='DIMINUTION' control={<Radio size='small' />} label='Diminution du solde' />
                    </RadioGroup>
                  )}
                />
              </Grid>
              {typeAjustement === 'AUGMENTATION' && (
                <>
                  <Grid item xs={12} md={6}>
                    <Typography variant='body2' sx={{ mb: 1, fontWeight: 600 }}>Taux de valorisation</Typography>
                    <Controller
                      name='modeTaux'
                      control={control}
                      render={({ field }) => (
                        <RadioGroup row {...field}>
                          <FormControlLabel value='ACTUEL' control={<Radio size='small' />} label={`Taux actuel (${formatMontant(compte?.taux_change_actuel || 0)} DZD)`} />
                          <FormControlLabel value='PERSONNALISE' control={<Radio size='small' />} label='Taux personnalisé' />
                        </RadioGroup>
                      )}
                    />
                  </Grid>
                  {modeTaux === 'PERSONNALISE' && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Controller
                        name='tauxPersonnalise'
                        control={control}
                        rules={{
                          validate: value => modeTaux !== 'PERSONNALISE' || lireNombre(value) > 0 || 'Saisissez un taux supérieur à zéro'
                        }}
                        render={({ field }) => (
                          <CustomTextField {...field} fullWidth label='Taux personnalisé'
                            autoComplete='off' error={Boolean(errors.tauxPersonnalise)}
                            helperText={errors.tauxPersonnalise?.message}
                            InputProps={{
                              inputComponent: CleaveInput,
                              endAdornment: <InputAdornment position='end'>DZD</InputAdornment>
                            }} />
                        )}
                      />
                    </Grid>
                  )}
                </>
              )}
              {typeAjustement === 'DIMINUTION' && (
                <Grid item xs={12} md={6}>
                  <Typography variant='body2' color='text.secondary'>
                    Taux appliqué : {formatMontant(compte?.taux_change_actuel || 0)} DZD. Le taux moyen reste inchangé.
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12} md={typeAjustement === 'AUGMENTATION' && modeTaux === 'PERSONNALISE' ? 9 : 12}>
                <Controller
                  name='observation'
                  control={control}
                  rules={{ required: 'Le motif est obligatoire', maxLength: { value: 255, message: '255 caractères maximum' } }}
                  render={({ field }) => (
                    <CustomTextField {...field} fullWidth label='Motif de l’ajustement'
                      error={Boolean(errors.observation)} helperText={errors.observation?.message}
                      inputProps={{ maxLength: 255 }} />
                  )}
                />
              </Grid>
              {compte && lireNombre(montant) > 0 && (
                <Grid item xs={12}>
                  <Typography variant='caption' color='text.secondary'>
                    Taux utilisé pour cette opération : {formatMontant(tauxUtilise)} DZD
                    {typeAjustement === 'AUGMENTATION' && modeTaux === 'PERSONNALISE'
                      ? ' · le taux moyen sera recalculé.'
                      : ''}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                <Button type='submit' variant='contained' disabled={submitting}
                  startIcon={<Icon icon='tabler:adjustments' />}>Enregistrer l’ajustement</Button>
              </Grid>
            </Grid>
          </form>
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
