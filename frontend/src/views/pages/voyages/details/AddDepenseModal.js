import { useState, useEffect, useContext } from 'react'
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
  InputAdornment
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import axios from 'axios'
import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'

// Context
import { CompteContext } from 'src/context/CompteContext'

const defaultValues = {
  nature: '',
  cpt: '',
  montant: '',
  dateDepense: dayjs(),
  observation: ''
}

const AddDepenseModal = ({ open, handleClose, voyageId, onSuccess }) => {
  const { comptes } = useContext(CompteContext)

  const [natures, setNatures] = useState([])
  const [openConfirm, setOpenConfirm] = useState(false)
  const [formDataToSubmit, setFormDataToSubmit] = useState(null)

  const { control, handleSubmit, reset } = useForm({ defaultValues })

  // Chargement des natures de dépenses (Hôtel, Vol, etc.)
  useEffect(() => {
    const fetchNatures = async () => {
      try {
        // Assure-toi que cette URL correspond à ta route backend pour getAllNatDep
        const res = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}depenses/natures`)
        setNatures(res.data)
      } catch (error) {
        console.error('Erreur chargement natures de dépenses', error)
      }
    }
    fetchNatures()
  }, [])

  const onClose = () => {
    reset()
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
      voyage_id: parseInt(voyageId) // La liaison magique avec le voyage !
    }

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}depenses`, payload)
      toast.success('Frais ajouté avec succès !')
      reset()
      onClose()
      if (onSuccess) onSuccess() // Rafraîchit les KPIs du Dashboard
    } catch (error) {
      toast.error(error.response?.data?.error?.message || "Erreur lors de l'ajout")
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
        <DialogTitle sx={{ pb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Icon icon='tabler:receipt-tax' fontSize='1.75rem' color='#ea5455' />
            <Typography variant='h5'>Ajouter un frais au voyage</Typography>
          </Box>
        </DialogTitle>

        <form onSubmit={handleSubmit(onPreSubmit)}>
          <DialogContent>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name='nature'
                  control={control}
                  rules={{ required: 'Obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextField
                      select
                      fullWidth
                      label='Nature du frais (Ex: Vol, Hôtel)'
                      error={!!error}
                      helperText={error?.message}
                      {...field}
                    >
                      {natures.map(n => (
                        <MenuItem key={n.id_nat_dep} value={n.id_nat_dep}>
                          {n.designation_nat_dep}
                        </MenuItem>
                      ))}
                    </CustomTextField>
                  )}
                />
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
                  rules={{ required: 'Obligatoire', min: 1 }}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      type='number'
                      label='Montant payé (En devise du compte)'
                      error={!!error}
                      helperText={error?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name='dateDepense'
                  control={control}
                  rules={{ required: 'Obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                      <DatePicker
                        {...field}
                        label='Date du paiement'
                        slotProps={{ textField: { fullWidth: true, error: !!error, helperText: error?.message } }}
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
                    <CustomTextField
                      {...field}
                      fullWidth
                      multiline
                      rows={2}
                      label='Observation (Optionnel)'
                      placeholder='Ex: Nuits du 12 au 15, Billet Air Algérie...'
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ pb: 6, px: 6 }}>
            <Button variant='tonal' color='secondary' onClick={onClose}>
              Annuler
            </Button>
            <Button type='submit' variant='contained' color='error'>
              Ajouter la dépense
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={openConfirm}
        handleClose={() => setOpenConfirm(false)}
        handleConfirm={executeApiCall}
        actionType='create'
        title='Confirmer le frais'
        content={
          <Typography variant='body1'>
            Confirmez-vous l'ajout de cette dépense d'un montant de <strong>{formDataToSubmit?.montant}</strong> ? Ce
            montant impactera le coût de revient du voyage.
          </Typography>
        }
      />
    </>
  )
}

export default AddDepenseModal
