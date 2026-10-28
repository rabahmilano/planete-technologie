import { useState } from 'react'
import Drawer from '@mui/material/Drawer'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import InputAdornment from '@mui/material/InputAdornment'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import { useForm, Controller } from 'react-hook-form'
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import CleaveInput from 'src/components/CleaveInput'
import { useCompte } from 'src/context/CompteContext'
import { formatMontant } from 'src/@core/utils/format'

dayjs.locale('fr')

const Header = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(6),
  justifyContent: 'space-between'
}))

const defaultValues = {
  cptSource: '',
  cptDest: '',
  montant: '',
  montantDest: '',
  dateTransfert: dayjs(),
  observation: ''
}

const TransfertDrawer = ({ open, toggle }) => {
  const { tousLesComptes, transferer } = useCompte()
  const [submitting, setSubmitting] = useState(false)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [transfertEnAttente, setTransfertEnAttente] = useState(null)

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm({ defaultValues })

  const watchCptSource = watch('cptSource')
  const watchCptDest = watch('cptDest')
  const watchMontant = watch('montant')
  const watchMontantDest = watch('montantDest')
  const selectedSource = tousLesComptes?.find(c => String(c.id_cpt) === String(watchCptSource))
  const selectedDest = tousLesComptes?.find(c => String(c.id_cpt) === String(watchCptDest))
  const montantNumerique = parseFloat(String(watchMontant || '').replace(/\s/g, '')) || 0
  const memeDevise = selectedSource?.dev_code === selectedDest?.dev_code
  const montantDestNumerique = parseFloat(String(watchMontantDest || '').replace(/\s/g, '')) || 0
  const montantDestEffectif = memeDevise ? montantNumerique : montantDestNumerique
  const tauxImplicite = montantNumerique > 0 && montantDestNumerique > 0
    ? montantDestNumerique / montantNumerique
    : null

  const destinationsValides =
    tousLesComptes?.filter(c => String(c.id_cpt) !== String(watchCptSource)) || []

  const handleClose = () => {
    if (submitting) return
    setConfirmationOpen(false)
    setTransfertEnAttente(null)
    reset()
    toggle()
  }

  const onSubmit = data => {
    const cleanMontant = parseFloat(data.montant.toString().replace(/\\s/g, ''))
    const cleanMontantDest = data.montantDest
      ? parseFloat(data.montantDest.toString().replace(/\\s/g, ''))
      : cleanMontant

    setTransfertEnAttente({
      cptSource: data.cptSource,
      cptDest: data.cptDest,
      montant: cleanMontant,
      montantDest: cleanMontantDest,
      dateTransfert: dayjs(data.dateTransfert).toISOString(),
      observation: data.observation?.trim() || ''
    })
    setConfirmationOpen(true)
  }

  const handleConfirmation = async () => {
    if (!transfertEnAttente || submitting) return

    setSubmitting(true)
    try {
      const success = await transferer(transfertEnAttente)
      if (success) {
        setConfirmationOpen(false)
        setTransfertEnAttente(null)
        reset()
        toggle()
      }
    } finally {
      setSubmitting(false)
    }
  }


  return (
    <Drawer
      open={open}
      anchor='right'
      onClose={handleClose}
      variant='temporary'
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 350, sm: 450 } } }}
    >
      <Header>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Icon icon='tabler:arrows-transfer-down' fontSize='1.75rem' color='primary' />
          <Typography variant='h5'>Nouveau Transfert</Typography>
        </Box>
        <IconButton size='small' onClick={handleClose} sx={{ color: 'text.primary' }}>
          <Icon icon='tabler:x' fontSize='1.25rem' />
        </IconButton>
      </Header>

      <Box sx={{ p: theme => theme.spacing(0, 6, 6) }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ mb: 4 }}>
            <Controller
              name='cptSource'
              control={control}
              rules={{ required: 'Obligatoire' }}
              render={({ field, fieldState: { error } }) => (
                <CustomTextField
                  {...field}
                  select
                  fullWidth
                  label='Compte Source (Débit)'
                  error={!!error}
                  helperText={error?.message}
                  onChange={e => {
                    field.onChange(e)
                    setValue('cptDest', '')
                    setValue('montantDest', '')
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Icon icon='tabler:building-bank' />
                      </InputAdornment>
                    )
                  }}
                >
                  {tousLesComptes?.map(c => {
                    const solde = parseFloat(c.solde_actuel || 0)
                    const bloque = parseFloat(c.solde_bloque || 0)
                    const dispo = solde - bloque
                    return (
                      <MenuItem key={c.id_cpt} value={c.id_cpt}>
                        {c.designation_cpt} ({formatMontant(dispo)} {c.dev_code})
                      </MenuItem>
                    )
                  })}
                </CustomTextField>
              )}
            />
          </Box>

          <Box sx={{ mb: 4 }}>
            {!watchCptSource ? (
              <Alert severity='info' variant='outlined'>
                Sélectionnez un compte source.
              </Alert>
            ) : destinationsValides.length === 0 ? (
              <Alert severity='warning' variant='outlined'>
                Aucun autre compte disponible.
              </Alert>
            ) : (
              <Controller
                name='cptDest'
                control={control}
                rules={{ required: 'Obligatoire' }}
                render={({ field, fieldState: { error } }) => (
                  <CustomTextField
                    {...field}
                    select
                    fullWidth
                    label='Compte Destination (Crédit)'
                    error={!!error}
                    helperText={error?.message}
                    onChange={e => {
                      field.onChange(e)
                      setValue('montantDest', '')
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position='start'>
                          <Icon icon='tabler:building-bank' />
                        </InputAdornment>
                      )
                    }}
                  >
                    {destinationsValides.map(c => (
                      <MenuItem key={c.id_cpt} value={c.id_cpt}>
                        {c.designation_cpt} ({c.dev_code})
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            )}
          </Box>

          {watchCptSource && destinationsValides.length > 0 && (
            <>
              <Box sx={{ mb: 4 }}>
                <Controller
                  name='montant'
                  control={control}
                  rules={{
                    required: 'Obligatoire',
                    validate: v => parseFloat(v.toString().replace(/\s/g, '')) > 0 || 'Montant invalide'
                  }}
                  render={({ field: { value, onChange }, fieldState: { error } }) => (
                    <CustomTextField
                      fullWidth
                      label='Montant à transférer'
                      value={value}
                      onChange={onChange}
                      error={!!error}
                      helperText={error?.message}
                      autoComplete='off'
                      InputProps={{
                        inputComponent: CleaveInput,
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Icon icon='tabler:report-money' />
                          </InputAdornment>
                        ),
                        endAdornment: <InputAdornment position='end'>{selectedSource?.dev_code}</InputAdornment>
                      }}
                    />
                  )}
                />
              </Box>

              {selectedDest && !memeDevise && (
                <Box sx={{ mb: 4 }}>
                  <Controller
                    name='montantDest'
                    control={control}
                    rules={{
                      required: 'Obligatoire',
                      validate: v => parseFloat(String(v || '').replace(/\s/g, '')) > 0 || 'Montant reçu invalide'
                    }}
                    render={({ field: { value, onChange }, fieldState: { error } }) => (
                      <CustomTextField
                        fullWidth
                        label='Montant reçu'
                        value={value}
                        onChange={onChange}
                        error={!!error}
                        helperText={error?.message}
                        autoComplete='off'
                        InputProps={{
                          inputComponent: CleaveInput,
                          startAdornment: (
                            <InputAdornment position='start'>
                              <Icon icon='tabler:report-money' />
                            </InputAdornment>
                          ),
                          endAdornment: <InputAdornment position='end'>{selectedDest.dev_code}</InputAdornment>
                        }}
                      />
                    )}
                  />
                </Box>
              )}

              {selectedDest && montantNumerique > 0 && (
                <Box sx={{ mb: 4 }}>
                  {memeDevise ? (
                    <Alert severity='info' variant='outlined'>
                      Le compte destination recevra {formatMontant(montantDestEffectif)} {selectedDest.dev_code}.
                    </Alert>
                  ) : tauxImplicite !== null ? (
                    <Alert severity='info' variant='outlined'>
                      Montant débité : {formatMontant(montantNumerique)} {selectedSource.dev_code}
                      <br />
                      Montant reçu : {formatMontant(montantDestNumerique)} {selectedDest.dev_code}
                      <br />
                      Taux implicite : {formatMontant(tauxImplicite, 4)} {selectedDest.dev_code} pour 1 {selectedSource.dev_code}
                    </Alert>
                  ) : (
                    <Alert severity='info' variant='outlined'>
                      Saisissez le montant reçu pour calculer le taux implicite.
                    </Alert>
                  )}
                </Box>
              )}

              <Box sx={{ mb: 4 }}>
                <Controller
                  name='dateTransfert'
                  control={control}
                  rules={{ required: 'Obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                      <DatePicker
                        {...field}
                        maxDate={dayjs()}
                        label='Date du transfert'
                        slots={{ textField: CustomTextField }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: !!error,
                            helperText: error?.message,
                            InputProps: {
                              startAdornment: (
                                <InputAdornment position='start'>
                                  <Icon icon='tabler:calendar' />
                                </InputAdornment>
                              )
                            }
                          }
                        }}
                      />
                    </LocalizationProvider>
                  )}
                />
              </Box>

              <Box sx={{ mb: 6 }}>
                <Controller
                  name='observation'
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      multiline
                      rows={3}
                      label='Observation'
                      error={!!error}
                      helperText={error?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position='start' sx={{ mt: 2 }}>
                            <Icon icon='tabler:file-description' />
                          </InputAdornment>
                        )
                      }}
                    />
                  )}
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  type='submit'
                  variant='contained'
                  sx={{ mr: 3 }}
                  disabled={submitting}
                  startIcon={<Icon icon='tabler:device-floppy' />}
                >
                  Valider le transfert
                </Button>
                <Button variant='tonal' color='secondary' onClick={handleClose}>
                  Annuler
                </Button>
              </Box>
            </>
          )}
        </form>
      </Box>
      <ConfirmDialog
        open={confirmationOpen}
        loading={submitting}
        loadingText='Transfert en cours…'
        handleClose={() => {
          if (!submitting) {
            setConfirmationOpen(false)
            setTransfertEnAttente(null)
          }
        }}
        handleConfirm={handleConfirmation}
        title='Vérifier le transfert avant confirmation'
        confirmText='Confirmer le transfert'
        cancelText='Retour au formulaire'
        actionType='create'
        content={
          <Box>
            <Typography sx={{ mb: 3 }}>
              Vérifiez les montants et les comptes avant de confirmer cette opération financière.
            </Typography>
            <Box sx={{ p: 4, borderRadius: 1, border: '1px dashed', borderColor: 'primary.main', backgroundColor: 'action.hover' }}>
              <Typography variant='body2' sx={{ mb: 2 }}>
                <strong>Compte source :</strong> {selectedSource?.designation_cpt || '—'} ({selectedSource?.dev_code || '—'})
              </Typography>
              <Typography variant='h6' color='error.main' sx={{ mb: 3 }}>
                Débit : {transfertEnAttente ? formatMontant(transfertEnAttente.montant) : '—'} {selectedSource?.dev_code || ''}
              </Typography>
              <Typography variant='body2' sx={{ mb: 2 }}>
                <strong>Compte destination :</strong> {selectedDest?.designation_cpt || '—'} ({selectedDest?.dev_code || '—'})
              </Typography>
              <Typography variant='h6' color='success.main' sx={{ mb: 2 }}>
                Crédit : {transfertEnAttente ? formatMontant(transfertEnAttente.montantDest) : '—'} {selectedDest?.dev_code || ''}
              </Typography>
              {selectedSource?.dev_code !== selectedDest?.dev_code && transfertEnAttente?.montant > 0 && (
                <Typography variant='body2' sx={{ mb: 2 }}>
                  Taux implicite : {formatMontant(transfertEnAttente.montantDest / transfertEnAttente.montant, 4)} {selectedDest?.dev_code} pour 1 {selectedSource?.dev_code}
                </Typography>
              )}
              <Typography variant='body2' sx={{ mb: 1 }}>
                <strong>Date :</strong> {transfertEnAttente ? dayjs(transfertEnAttente.dateTransfert).format('DD/MM/YYYY') : '—'}
              </Typography>
              {transfertEnAttente?.observation && (
                <Typography variant='body2'><strong>Observation :</strong> {transfertEnAttente.observation}</Typography>
              )}
            </Box>
          </Box>
        }
      />
    </Drawer>
  )
}

export default TransfertDrawer
