import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Box,
  MenuItem,
  InputAdornment,
  IconButton,
  Divider
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import CleaveInput from 'src/components/CleaveInput'

import { useCompte } from 'src/context/CompteContext'
import { useDepense } from 'src/context/DepenseContext'
import { formatMontant } from 'src/@core/utils/format'

import AddNatureModal from './AddNatureModal'

const defaultValues = {
  nature: '',
  cpt: '',
  montant: '',
  dateDepense: dayjs(),
  observation: ''
}

const AddDepenseModal = ({ open, handleClose, voyageId, onSuccess }) => {
  const { comptes } = useCompte()
  const { listNature, ajouterDepense } = useDepense()

  const [openConfirm, setOpenConfirm] = useState(false)
  const [formDataToSubmit, setFormDataToSubmit] = useState(null)
  const [compteDevise, setCompteDevise] = useState('')
  const [openAddNature, setOpenAddNature] = useState(false)

  const { control, handleSubmit, reset, watch } = useForm({ defaultValues })

  const watchCpt = watch('cpt')

  useEffect(() => {
    if (watchCpt) {
      const selectedCpt = comptes.find(c => c.id_cpt === watchCpt)
      if (selectedCpt) setCompteDevise(selectedCpt.dev_code)
    } else {
      setCompteDevise('')
    }
  }, [watchCpt, comptes])

  const onClose = () => {
    reset()
    setCompteDevise('')
    handleClose()
  }

  const onPreSubmit = data => {
    setFormDataToSubmit(data)
    setOpenConfirm(true)
  }

  const executeApiCall = async () => {
    setOpenConfirm(false)
    const data = formDataToSubmit

    const payload = {
      montant: parseFloat(data.montant),
      cpt: parseInt(data.cpt),
      nature: parseInt(data.nature),
      dateDepense: dayjs(data.dateDepense).toISOString(),
      observation: data.observation || '',
      voyage_id: parseInt(voyageId)
    }

    const success = await ajouterDepense(payload)
    if (success) {
      onClose()
      if (onSuccess) onSuccess()
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
        <DialogTitle sx={{ pb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(234, 84, 85, 0.1)',
                borderRadius: 1,
                p: 2
              }}
            >
              <Icon icon='tabler:receipt-tax' fontSize='1.75rem' color='#ea5455' />
            </Box>
            <Typography variant='h5'>Ajouter un frais au voyage</Typography>
          </Box>
        </DialogTitle>
        <Divider sx={{ mb: 0 }} />

        <form onSubmit={handleSubmit(onPreSubmit)}>
          <DialogContent sx={{ backgroundColor: 'rgba(0,0,0,0.01)', pt: 6 }}>
            <Grid container spacing={5}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Controller
                    name='nature'
                    control={control}
                    rules={{ required: 'Obligatoire' }}
                    render={({ field, fieldState: { error } }) => (
                      <CustomTextField
                        select
                        fullWidth
                        label='Nature du frais'
                        error={!!error}
                        helperText={error?.message}
                        {...field}
                      >
                        {listNature
                          .filter(n => n.contexte === 'VOYAGE')
                          .map(n => (
                            <MenuItem key={n.id_nat_dep} value={n.id_nat_dep}>
                              {n.designation_nat_dep}
                            </MenuItem>
                          ))}
                      </CustomTextField>
                    )}
                  />
                  <IconButton
                    color='primary'
                    sx={{ mt: 5, backgroundColor: 'rgba(115, 103, 240, 0.1)' }}
                    onClick={() => setOpenAddNature(true)}
                  >
                    <Icon icon='tabler:plus' fontSize='1.2rem' />
                  </IconButton>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name='cpt'
                  control={control}
                  rules={{ required: 'Obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextField
                      select
                      fullWidth
                      label='Compte de paiement'
                      error={!!error}
                      helperText={error?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Icon icon='tabler:credit-card' fontSize={20} />
                          </InputAdornment>
                        )
                      }}
                      {...field}
                    >
                      {comptes.map(c => (
                        <MenuItem key={c.id_cpt} value={c.id_cpt}>
                          {c.designation_cpt} ({c.dev_code})
                        </MenuItem>
                      ))}
                    </CustomTextField>
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name='montant'
                  control={control}
                  rules={{ required: 'Obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      autoComplete='off' // <--- AJOUTER CETTE LIGNE
                      label='Montant payé'
                      error={!!error}
                      helperText={error?.message}
                      InputProps={{
                        inputComponent: CleaveInput,
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Icon icon='tabler:currency' fontSize={20} />
                          </InputAdornment>
                        ),
                        endAdornment: compteDevise ? (
                          <InputAdornment position='end'>
                            <Typography variant='caption' sx={{ fontWeight: 'bold' }}>
                              {compteDevise}
                            </Typography>
                          </InputAdornment>
                        ) : null
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name='dateDepense'
                  control={control}
                  rules={{ required: 'Ce champ est obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                      <DatePicker
                        {...field}
                        maxDate={dayjs().endOf('day')}
                        label='Date de la dépense'
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: !!error,
                            helperText: error && 'Ce champ est obligatoire'
                          }
                        }}
                      />
                    </LocalizationProvider>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name='observation'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField {...field} fullWidth multiline rows={2} label='Observation (Optionnel)' />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <Divider sx={{ m: 0 }} />
          <DialogActions sx={{ pt: 4, pb: 4, px: 6, backgroundColor: 'rgba(0,0,0,0.01)' }}>
            <Button variant='tonal' color='secondary' onClick={onClose}>
              Annuler
            </Button>
            <Button type='submit' variant='contained' color='error'>
              Enregistrer la dépense
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <AddNatureModal open={openAddNature} onClose={() => setOpenAddNature(false)} />

      <ConfirmDialog
        open={openConfirm}
        handleClose={() => setOpenConfirm(false)}
        handleConfirm={executeApiCall}
        actionType='create'
        title='Confirmer le frais'
        content={
          <Typography variant='body1'>
            Confirmez-vous l'ajout de cette dépense d'un montant de{' '}
            <strong>
              {formatMontant(formDataToSubmit?.montant)} {compteDevise}
            </strong>{' '}
            ?
          </Typography>
        }
      />
    </>
  )
}

export default AddDepenseModal
