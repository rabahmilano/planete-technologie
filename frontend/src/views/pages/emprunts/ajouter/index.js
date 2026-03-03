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

import { useCompte } from 'src/context/CompteContext'
import { useEmprunt } from 'src/context/EmpruntContext'

// Import de notre nouveau composant générique
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'

const defaultValues = { desEmprunt: '', cpt: '', montant: '', dateEmprunt: dayjs() }

const AjouterEmprunt = () => {
  const [symboleDev, setSymboleDev] = useState('')
  // États pour la modale
  const [openModal, setOpenModal] = useState(false)
  const [formDataToSubmit, setFormDataToSubmit] = useState(null)
  
  const { comptes, fetchComptes } = useCompte()
  const { fetchEmprunts } = useEmprunt()

  const { control, handleSubmit, formState: { errors }, reset } = useForm({ defaultValues })

  const handleCompteChange = (newCompteId) => {
    const selectedCompte = comptes.find(compte => compte.id_cpt === newCompteId)
    if (selectedCompte && selectedCompte.devise) setSymboleDev(selectedCompte.devise.symbole_dev)
  }

  // Interception de la soumission : on stocke les données et on ouvre la modale
  const onPreSubmit = (data) => {
    setFormDataToSubmit(data)
    setOpenModal(true)
  }

  // Exécution réelle de l'API après confirmation
  const executeApiCall = async () => {
    setOpenModal(false) 

    const formattedData = {
      desEmprunt: formDataToSubmit.desEmprunt.trim(),
      montant: parseFloat(formDataToSubmit.montant),
      cpt: parseInt(formDataToSubmit.cpt),
      dateEmprunt: dayjs(formDataToSubmit.dateEmprunt).toISOString()
    }

    try {
      const url = `${process.env.NEXT_PUBLIC_BASE_URL}emprunts/addEmprunt`
      await axios.post(url, formattedData)
      toast.success('Emprunt enregistré avec succès')
      
      await fetchComptes()
      await fetchEmprunts()

      reset()
      setSymboleDev('')
    } catch (error) {
      toast.error('Erreur: ' + (error.response?.data?.error?.message || error.message))
    }
  }

  // Préparation des données pour le résumé dans la modale
  const nomCompteSelectionne = comptes.find(c => c.id_cpt === parseInt(formDataToSubmit?.cpt))?.designation_cpt

  return (
    <>
      <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
        <CardHeader title={<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><Icon icon='tabler:cash-banknote' fontSize='1.75rem' color='#primary.main' /><Typography variant='h5'>Déclaration d'un nouvel emprunt</Typography></Box>} />
        <Divider sx={{ m: '0 !important' }} />
        <CardContent sx={{ pt: 6 }}>
          {/* L'attribut onSubmit déclenche désormais onPreSubmit */}
          <form onSubmit={handleSubmit(onPreSubmit)}>
            <Grid container spacing={6}>
              
              <Grid item xs={12} sm={6}>
                <Controller name='dateEmprunt' control={control} rules={{ required: 'Obligatoire', validate: v => dayjs(v).isBefore(dayjs().add(1, 'day')) || 'Date invalide' }} render={({ field, fieldState: { error } }) => (
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                    <DatePicker {...field} maxDate={dayjs()} label='Date de réception' slotProps={{ textField: { fullWidth: true, error: !!error, helperText: error?.message, InputProps: { startAdornment: <InputAdornment position='start'><Icon icon='tabler:calendar' /></InputAdornment> } } }} />
                  </LocalizationProvider>
                )} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller name='desEmprunt' control={control} rules={{ required: 'Obligatoire' }} render={({ field, fieldState: { error } }) => (
                  <CustomTextField {...field} fullWidth label='Désignation' error={!!error} helperText={error?.message} InputProps={{ startAdornment: <InputAdornment position='start'><Icon icon='tabler:file-description' /></InputAdornment> }} />
                )} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller name='cpt' control={control} rules={{ required: 'Obligatoire' }} render={({ field, fieldState: { error } }) => (
                  <CustomTextField select fullWidth label='Compte crédité' error={!!error} helperText={error?.message} value={field.value} onChange={(e) => { field.onChange(e); handleCompteChange(e.target.value) }} InputProps={{ startAdornment: <InputAdornment position='start'><Icon icon='tabler:building-bank' /></InputAdornment> }}>
                    {comptes.map(c => <MenuItem key={c.id_cpt} value={c.id_cpt}>{c.designation_cpt}</MenuItem>)}
                  </CustomTextField>
                )} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller name='montant' control={control} rules={{ required: 'Obligatoire', min: { value: 1, message: '> 0' } }} render={({ field, fieldState: { error } }) => (
                  <CustomTextField {...field} fullWidth type='number' label='Montant emprunté' error={!!error} helperText={error?.message} InputProps={{ startAdornment: <InputAdornment position='start'><Icon icon='tabler:report-money' /></InputAdornment>, endAdornment: <InputAdornment position='end'>{symboleDev}</InputAdornment> }} />
                )} />
              </Grid>

              <Grid item xs={12} sx={{ mt: 2 }}>
                <Button type='submit' variant='contained' size='large' startIcon={<Icon icon='tabler:device-floppy' />}>Enregistrer l'emprunt</Button>
              </Grid>

            </Grid>
          </form>
        </CardContent>
      </Card>

      {/* Appel du composant générique */}
      <ConfirmDialog 
        open={openModal}
        handleClose={() => setOpenModal(false)}
        handleConfirm={executeApiCall}
        actionType="create"
        title="Confirmer l'emprunt"
        content={
          <>
            <Typography variant='body1' sx={{ mb: 4 }}>
              Voulez-vous vraiment enregistrer cette entrée de fonds ? Cette action mettra à jour votre dette et le solde du compte.
            </Typography>
            {formDataToSubmit && (
              <Box sx={{ p: 4, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 1 }}>
                <Typography variant='body2'><strong>Désignation :</strong> {formDataToSubmit.desEmprunt}</Typography>
                <Typography variant='body2'><strong>Compte :</strong> {nomCompteSelectionne}</Typography>
                <Typography variant='body2' sx={{ mt: 2, fontWeight: 'bold', color: 'error.main' }}>
                  Montant : {parseFloat(formDataToSubmit.montant).toLocaleString('fr-DZ')} {symboleDev}
                </Typography>
              </Box>
            )}
          </>
        }
      />
    </>
  )
}

export default AjouterEmprunt