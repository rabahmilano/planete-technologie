import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Box,
  Button,
  Grid,
  MenuItem,
  InputAdornment,
  TextField,
  Alert
} from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

import CleaveInput from 'src/components/CleaveInput'

const EditColisModal = ({ open, onClose, colis, listCategorie, onSuccess, initialTab, updateHistoriqueColis }) => {
  const [activeTab, setActiveTab] = useState('categorie')

  const { control, handleSubmit, watch, reset } = useForm({
    defaultValues: {
      cat_id: '',
      date_achat: null,
      date_stock: null,
      new_price: ''
    }
  })

  const watchDateAchat = watch('date_achat')
  const watchDateStock = watch('date_stock')

  useEffect(() => {
    if (open) setActiveTab(initialTab)
  }, [open, initialTab])

  useEffect(() => {
    if (colis) {
      reset({
        cat_id: colis.cat_id || '',
        date_achat: colis.date_achat ? dayjs(colis.date_achat) : null,
        date_stock: colis.date_stock ? dayjs(colis.date_stock) : null,
        new_price: colis.mnt_tot_dev || ''
      })
    }
  }, [colis, reset])

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue)
  }

  const onSubmit = async data => {
    let dataToUpdate = {}

    switch (activeTab) {
      case 'categorie':
        dataToUpdate = { cat_id: data.cat_id }
        break
      case 'dates':
        dataToUpdate = {
          date_achat: data.date_achat ? dayjs(data.date_achat).toISOString() : null,
          date_stock: data.date_stock ? dayjs(data.date_stock).toISOString() : null
        }
        break
      case 'prix':
        dataToUpdate = { new_price: parseFloat(data.new_price) }
        break
      default:
        return
    }

    const success = await updateHistoriqueColis(colis.id_colis, dataToUpdate)
    if (success) onSuccess()
  }

  if (!colis) return null

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>Modifier le Colis : {colis.produit?.designation_prd}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers sx={{ p: 0 }}>
          <Tabs value={activeTab} onChange={handleTabChange} variant='fullWidth'>
            <Tab value='categorie' label='Catégorie' />
            <Tab value='dates' label='Dates' />
            <Tab value='prix' label='Prix' />
          </Tabs>

          <Box sx={{ px: 5, pt: 4 }}>
            {activeTab === 'categorie' && (
              <Alert severity='info' sx={{ mb: 6 }}>
                Le changement de catégorie recalculera les statistiques de vos achats.
              </Alert>
            )}
            {activeTab === 'dates' && (
              <Alert severity='info' sx={{ mb: 6 }}>
                Assurez-vous que la date de stock soit ultérieure ou égale à la date d'achat.
              </Alert>
            )}
            {activeTab === 'prix' && (
              <Alert severity='warning' sx={{ mb: 6 }}>
                La modification du prix impactera la valeur totale de votre inventaire.
              </Alert>
            )}
          </Box>

          <Box sx={{ px: 5, pb: 5 }}>
            {activeTab === 'categorie' && (
              <Controller
                name='cat_id'
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <TextField {...field} select fullWidth label='Catégorie'>
                    {listCategorie.map(cat => (
                      <MenuItem key={cat.id_cat} value={cat.id_cat}>
                        {cat.designation_cat}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            )}

            {activeTab === 'dates' && (
              <Grid container spacing={4}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name='date_achat'
                    control={control}
                    rules={{
                      validate: value =>
                        !watchDateStock ||
                        !value ||
                        dayjs(value).isBefore(dayjs(watchDateStock)) ||
                        dayjs(value).isSame(dayjs(watchDateStock), 'day') ||
                        'Doit être avant ou égale à la date de stockage.'
                    }}
                    render={({ field, fieldState }) => (
                      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                        <DatePicker
                          {...field}
                          format='DD/MM/YYYY'
                          label="Date d'Achat"
                          maxDate={dayjs()}
                          sx={{ width: '100%' }}
                          slotProps={{
                            textField: { error: !!fieldState.error, helperText: fieldState.error?.message }
                          }}
                        />
                      </LocalizationProvider>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name='date_stock'
                    control={control}
                    rules={{
                      validate: value =>
                        !watchDateAchat ||
                        !value ||
                        dayjs(value).isAfter(dayjs(watchDateAchat)) ||
                        dayjs(value).isSame(dayjs(watchDateAchat), 'day') ||
                        "Doit être après ou égale à la date d'achat."
                    }}
                    render={({ field, fieldState }) => (
                      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                        <DatePicker
                          {...field}
                          format='DD/MM/YYYY'
                          label='Date de Stock'
                          disabled={!colis.date_stock}
                          maxDate={dayjs()}
                          sx={{ width: '100%' }}
                          slotProps={{
                            textField: { error: !!fieldState.error, helperText: fieldState.error?.message }
                          }}
                        />
                      </LocalizationProvider>
                    )}
                  />
                </Grid>
              </Grid>
            )}

            {activeTab === 'prix' && (
              <Grid container spacing={4}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Prix Actuel'
                    value={`${parseFloat(colis.mnt_tot_dev || 0).toLocaleString('fr-FR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} ${colis.compte?.devise?.symbole_dev || ''}`}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name='new_price'
                    control={control}
                    rules={{ required: true }}
                    render={({ field: { value, onChange, ref } }) => (
                      <TextField
                        fullWidth
                        label='Nouveau Prix'
                        value={value}
                        onChange={onChange}
                        inputRef={ref}
                        InputProps={{
                          inputComponent: CleaveInput,
                          startAdornment: (
                            <InputAdornment position='start'>{colis.compte?.devise?.symbole_dev || ''}</InputAdornment>
                          )
                        }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 5 }}>
          <Button onClick={onClose} variant='outlined' color='secondary'>
            Annuler
          </Button>
          <Button type='submit' variant='contained' color='primary'>
            Sauvegarder
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default EditColisModal
