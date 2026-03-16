import { useState, useContext } from 'react'
import {
  Card,
  Grid,
  Button,
  MenuItem,
  CardHeader,
  CardContent,
  InputAdornment,
  Box,
  Divider,
  Typography
} from '@mui/material'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
dayjs.locale('fr')

import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import toast from 'react-hot-toast'
import { useForm, Controller } from 'react-hook-form'
import axios from 'axios'

// Contexts
import { CompteContext } from 'src/context/CompteContext'
import { VoyageContext } from 'src/context/VoyageContext'

// Composant générique
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'

const defaultValues = {
  desVoyage: '',
  destination: '',
  dateDepart: dayjs(),
  dateRetour: dayjs().add(7, 'day'),
  deviseDest: 'CNY',
  cptDefautId: ''
}

const AjouterVoyage = () => {
  const [openModal, setOpenModal] = useState(false)
  const [formDataToSubmit, setFormDataToSubmit] = useState(null)

  // Utilisation des contextes selon ton architecture
  const { comptes } = useContext(CompteContext)
  const { fetchVoyages } = useContext(VoyageContext)

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({ defaultValues })

  // Interception
  const onPreSubmit = data => {
    setFormDataToSubmit(data)
    setOpenModal(true)
  }

  // Exécution de l'API
  const executeApiCall = async () => {
    setOpenModal(false)

    const formattedData = {
      desVoyage: formDataToSubmit.desVoyage.trim(),
      destination: formDataToSubmit.destination?.trim() || '',
      dateDepart: dayjs(formDataToSubmit.dateDepart).toISOString(),
      dateRetour: dayjs(formDataToSubmit.dateRetour).toISOString(),
      deviseDest: formDataToSubmit.deviseDest?.trim().toUpperCase() || 'CNY',
      cptDefautId: formDataToSubmit.cptDefautId ? parseInt(formDataToSubmit.cptDefautId) : null
    }

    try {
      const url = `${process.env.NEXT_PUBLIC_BASE_URL}voyages`
      await axios.post(url, formattedData)
      toast.success('Voyage créé avec succès')

      await fetchVoyages()
      reset()
    } catch (error) {
      toast.error('Erreur: ' + (error.response?.data?.error?.message || error.message))
    }
  }

  const nomCompteSelectionne =
    comptes?.find(c => c.id_cpt === parseInt(formDataToSubmit?.cptDefautId))?.designation_cpt || 'Aucun'

  return (
    <>
      <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Icon icon='tabler:plane-departure' fontSize='1.75rem' color='#primary.main' />
              <Typography variant='h5'>Déclaration d'un nouveau voyage</Typography>
            </Box>
          }
        />
        <Divider sx={{ m: '0 !important' }} />
        <CardContent sx={{ pt: 6 }}>
          <form onSubmit={handleSubmit(onPreSubmit)}>
            <Grid container spacing={6}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name='desVoyage'
                  control={control}
                  rules={{ required: 'Obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      label='Désignation du voyage (Ex: Voyage Dubai Mars 2026)'
                      error={!!error}
                      helperText={error?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Icon icon='tabler:file-description' />
                          </InputAdornment>
                        )
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name='destination'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      label='Destination (Optionnel)'
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Icon icon='tabler:map-pin' />
                          </InputAdornment>
                        )
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name='dateDepart'
                  control={control}
                  rules={{ required: 'Obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                      <DatePicker
                        {...field}
                        label='Date de départ'
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: !!error,
                            helperText: error?.message,
                            InputProps: {
                              startAdornment: (
                                <InputAdornment position='start'>
                                  <Icon icon='tabler:calendar-up' />
                                </InputAdornment>
                              )
                            }
                          }
                        }}
                      />
                    </LocalizationProvider>
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name='dateRetour'
                  control={control}
                  rules={{ required: 'Obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                      <DatePicker
                        {...field}
                        label='Date de retour'
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: !!error,
                            helperText: error?.message,
                            InputProps: {
                              startAdornment: (
                                <InputAdornment position='start'>
                                  <Icon icon='tabler:calendar-down' />
                                </InputAdornment>
                              )
                            }
                          }
                        }}
                      />
                    </LocalizationProvider>
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name='cptDefautId'
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextField
                      select
                      fullWidth
                      label='Compte par défaut (Optionnel)'
                      error={!!error}
                      helperText={error?.message}
                      value={field.value}
                      onChange={field.onChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Icon icon='tabler:credit-card' />
                          </InputAdornment>
                        )
                      }}
                    >
                      <MenuItem value=''>
                        <em>Aucun</em>
                      </MenuItem>
                      {comptes?.map(c => (
                        <MenuItem key={c.id_cpt} value={c.id_cpt}>
                          {c.designation_cpt}
                        </MenuItem>
                      ))}
                    </CustomTextField>
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name='deviseDest'
                  control={control}
                  rules={{ required: 'Obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      label='Devise de destination (Ex: CNY, USD)'
                      error={!!error}
                      helperText={error?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Icon icon='tabler:currency' />
                          </InputAdornment>
                        )
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sx={{ mt: 2 }}>
                <Button type='submit' variant='contained' size='large' startIcon={<Icon icon='tabler:device-floppy' />}>
                  Ouvrir le dossier de voyage
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={openModal}
        handleClose={() => setOpenModal(false)}
        handleConfirm={executeApiCall}
        actionType='create'
        title='Ouvrir le dossier de voyage'
        content={
          <>
            <Typography variant='body1' sx={{ mb: 4 }}>
              Voulez-vous vraiment créer ce voyage ? Il passera en statut "EN PRÉPARATION".
            </Typography>
            {formDataToSubmit && (
              <Box sx={{ p: 4, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 1 }}>
                <Typography variant='body2'>
                  <strong>Désignation :</strong> {formDataToSubmit.desVoyage}
                </Typography>
                <Typography variant='body2'>
                  <strong>Départ :</strong> {dayjs(formDataToSubmit.dateDepart).format('DD/MM/YYYY')}
                </Typography>
                <Typography variant='body2'>
                  <strong>Retour :</strong> {dayjs(formDataToSubmit.dateRetour).format('DD/MM/YYYY')}
                </Typography>
                <Typography variant='body2'>
                  <strong>Compte favori :</strong> {nomCompteSelectionne}
                </Typography>
              </Box>
            )}
          </>
        }
      />
    </>
  )
}

export default AjouterVoyage
