import { useState } from 'react'
import { Card, Grid, Button, MenuItem, CardHeader, CardContent, InputAdornment, Box, Divider, Typography } from '@mui/material'
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

// Imports vitaux pour synchroniser les données instantanément
import { useCompte } from 'src/context/CompteContext'
import { useEmprunt } from 'src/context/EmpruntContext'

const defaultValues = {
  desEmprunt: '',
  cpt: '',
  montant: '',
  dateEmprunt: dayjs()
}

const AjouterEmprunt = () => {
  const [symboleDev, setSymboleDev] = useState('')

  // Récupération globale au lieu d'un fetch local
  const { comptes, fetchComptes } = useCompte()
  const { fetchEmprunts } = useEmprunt()

  const { control, handleSubmit, formState: { errors }, getValues, reset } = useForm({ defaultValues })

  const handleCompteChange = (newCompteId) => {
    const selectedCompte = comptes.find(compte => compte.id_cpt === newCompteId)
    if (selectedCompte && selectedCompte.devise) {
      setSymboleDev(selectedCompte.devise.symbole_dev)
    }
  }

  const onSubmit = async () => {
    const data = getValues()
    const formattedData = {
      desEmprunt: data.desEmprunt.trim(),
      montant: parseFloat(data.montant),
      cpt: parseInt(data.cpt),
      dateEmprunt: dayjs(data.dateEmprunt).toISOString()
    }

    try {
      const url = `${process.env.NEXT_PUBLIC_BASE_URL}emprunts/addEmprunt`
      await axios.post(url, formattedData)
      toast.success('Emprunt enregistré avec succès')
      
      // ✅ SYNCHRONISATION EN TEMPS RÉEL DES KPIs
      await fetchComptes()
      await fetchEmprunts()

      reset()
      setSymboleDev('')
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message
      toast.error('Erreur: ' + msg)
    }
  }

  return (
    <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
      <CardHeader 
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Icon icon='tabler:cash-banknote' fontSize='1.75rem' color='#primary.main' />
            <Typography variant='h5'>Déclaration d'un nouvel emprunt</Typography>
          </Box>
        } 
      />
      <Divider sx={{ m: '0 !important' }} />
      <CardContent sx={{ pt: 6 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={6}>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name='dateEmprunt'
                control={control}
                rules={{ 
                  required: 'La date est obligatoire',
                  validate: value => dayjs(value).isBefore(dayjs().add(1, 'day')) || 'La date ne peut pas être dans le futur'
                }}
                render={({ field, fieldState: { error } }) => (
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                    <DatePicker 
                      {...field} 
                      maxDate={dayjs()} 
                      label='Date de réception' 
                      slotProps={{ 
                        textField: { 
                          fullWidth: true, error: !!error, helperText: error?.message,
                          InputProps: {
                            startAdornment: <InputAdornment position='start'><Icon icon='tabler:calendar' fontSize='1.25rem' /></InputAdornment>
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
                name='desEmprunt'
                control={control}
                rules={{ required: 'La désignation est obligatoire' }}
                render={({ field, fieldState: { error } }) => (
                  <CustomTextField 
                    {...field} fullWidth label='Désignation (Prêteur, Motif...)' 
                    error={!!error} helperText={error?.message}
                    InputProps={{
                      startAdornment: <InputAdornment position='start'><Icon icon='tabler:file-description' fontSize='1.25rem' /></InputAdornment>
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name='cpt'
                control={control}
                rules={{ required: 'Le compte est obligatoire' }}
                render={({ field, fieldState: { error } }) => (
                  <CustomTextField
                    select fullWidth label='Compte crédité'
                    error={!!error} helperText={error?.message} value={field.value}
                    onChange={(e) => { field.onChange(e); handleCompteChange(e.target.value) }}
                    InputProps={{
                      startAdornment: <InputAdornment position='start'><Icon icon='tabler:building-bank' fontSize='1.25rem' /></InputAdornment>
                    }}
                  >
                    {comptes.map(c => <MenuItem key={c.id_cpt} value={c.id_cpt}>{c.designation_cpt}</MenuItem>)}
                  </CustomTextField>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name='montant'
                control={control}
                rules={{ required: 'Le montant est obligatoire', min: { value: 1, message: 'Le montant doit être > 0' } }}
                render={({ field, fieldState: { error } }) => (
                  <CustomTextField
                    {...field} fullWidth type='number' label='Montant emprunté'
                    error={!!error} helperText={error?.message}
                    InputProps={{ 
                      startAdornment: <InputAdornment position='start'><Icon icon='tabler:report-money' fontSize='1.25rem' /></InputAdornment>,
                      endAdornment: <InputAdornment position='end'>{symboleDev}</InputAdornment> 
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sx={{ mt: 2 }}>
              <Button type='submit' variant='contained' size='large' startIcon={<Icon icon='tabler:device-floppy' />}>
                Enregistrer l'emprunt
              </Button>
            </Grid>

          </Grid>
        </form>
      </CardContent>
    </Card>
  )
}

export default AjouterEmprunt