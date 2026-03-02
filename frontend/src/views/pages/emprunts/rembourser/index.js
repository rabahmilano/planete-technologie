import { useState, useMemo } from 'react'
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

const defaultValues = {
  idEmpruntCible: '',
  cptCible: '',
  mntRembourse: '',
  dateRembourse: dayjs()
}

const RembourserEmprunt = () => {
  const [symboleDev, setSymboleDev] = useState('')
  const [maxRemboursable, setMaxRemboursable] = useState(0)

  const { comptes, fetchComptes } = useCompte()
  const { emprunts, fetchEmprunts } = useEmprunt()

  const { control, handleSubmit, formState: { errors }, getValues, reset } = useForm({ defaultValues })

  // Règle métier : Ne lister que les emprunts non soldés
  const empruntsActifs = useMemo(() => {
    return emprunts.filter(emp => emp.statut_emprunt !== 'SOLDE')
  }, [emprunts])

  // Lorsqu'on choisit un emprunt, on calcule son reste à payer exact
  const handleEmpruntChange = (idEmprunt) => {
    const empruntSelectionne = empruntsActifs.find(emp => emp.id_emprunt === idEmprunt)
    if (empruntSelectionne) {
      const totalDejaRembourse = empruntSelectionne.remboursements.reduce((acc, curr) => acc + parseFloat(curr.montant_remb), 0)
      const reste = parseFloat(empruntSelectionne.montant_emprunt) - totalDejaRembourse
      setMaxRemboursable(reste)
    } else {
      setMaxRemboursable(0)
    }
  }

  const handleCompteChange = (idCpt) => {
    const selectedCompte = comptes.find(compte => compte.id_cpt === idCpt)
    if (selectedCompte && selectedCompte.devise) {
      setSymboleDev(selectedCompte.devise.symbole_dev)
    }
  }

  const onSubmit = async () => {
    const data = getValues()
    const formattedData = {
      idEmpruntCible: parseInt(data.idEmpruntCible),
      cptCible: parseInt(data.cptCible),
      mntRembourse: parseFloat(data.mntRembourse),
      dateRembourse: dayjs(data.dateRembourse).toISOString()
    }

    try {
      const url = `${process.env.NEXT_PUBLIC_BASE_URL}emprunts/addRemboursement`
      await axios.post(url, formattedData)
      toast.success('Remboursement enregistré avec succès')
      
      // Rafraîchissement des KPIs (La dette va baisser, le solde aussi !)
      await fetchComptes()
      await fetchEmprunts()

      reset()
      setSymboleDev('')
      setMaxRemboursable(0)
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
            <Icon icon='tabler:receipt-refund' fontSize='1.75rem' color='warning.main' />
            <Typography variant='h5'>Déclarer un remboursement (Sortie de fonds)</Typography>
          </Box>
        } 
      />
      <Divider sx={{ m: '0 !important' }} />
      <CardContent sx={{ pt: 6 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={6}>
            
            {/* EMPRUNT CIBLE */}
            <Grid item xs={12} sm={6}>
              <Controller
                name='idEmpruntCible'
                control={control}
                rules={{ required: "Veuillez sélectionner l'emprunt à rembourser" }}
                render={({ field, fieldState: { error } }) => (
                  <CustomTextField
                    select fullWidth label='Emprunt à rembourser'
                    error={!!error} helperText={error?.message} value={field.value}
                    onChange={(e) => { field.onChange(e); handleEmpruntChange(e.target.value) }}
                    InputProps={{
                      startAdornment: <InputAdornment position='start'><Icon icon='tabler:file-invoice' fontSize='1.25rem' /></InputAdornment>
                    }}
                  >
                    {empruntsActifs.length === 0 ? (
                      <MenuItem disabled value=''>Aucun emprunt en cours</MenuItem>
                    ) : (
                      empruntsActifs.map(emp => (
                        <MenuItem key={emp.id_emprunt} value={emp.id_emprunt}>
                          {emp.designation} (Reste: {parseFloat(emp.montant_emprunt - emp.remboursements.reduce((sum, r) => sum + parseFloat(r.montant_remb), 0)).toLocaleString('fr-DZ')} DZD)
                        </MenuItem>
                      ))
                    )}
                  </CustomTextField>
                )}
              />
            </Grid>

            {/* DATE */}
            <Grid item xs={12} sm={6}>
              <Controller
                name='dateRembourse'
                control={control}
                rules={{ 
                  required: 'La date est obligatoire',
                  validate: value => dayjs(value).isBefore(dayjs().add(1, 'day')) || 'La date ne peut pas être dans le futur'
                }}
                render={({ field, fieldState: { error } }) => (
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                    <DatePicker 
                      {...field} maxDate={dayjs()} label='Date de remboursement' 
                      slotProps={{ 
                        textField: { 
                          fullWidth: true, error: !!error, helperText: error?.message,
                          InputProps: { startAdornment: <InputAdornment position='start'><Icon icon='tabler:calendar' fontSize='1.25rem' /></InputAdornment> }
                        } 
                      }} 
                    />
                  </LocalizationProvider>
                )}
              />
            </Grid>

            {/* COMPTE SOURCE */}
            <Grid item xs={12} sm={6}>
              <Controller
                name='cptCible'
                control={control}
                rules={{ required: 'Le compte source est obligatoire' }}
                render={({ field, fieldState: { error } }) => (
                  <CustomTextField
                    select fullWidth label='Compte de prélèvement'
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

            {/* MONTANT (Validation stricte) */}
            <Grid item xs={12} sm={6}>
              <Controller
                name='mntRembourse'
                control={control}
                rules={{ 
                  required: 'Le montant est obligatoire', 
                  min: { value: 1, message: 'Le montant doit être > 0' },
                  max: { value: maxRemboursable, message: `Maximum autorisé: ${maxRemboursable.toLocaleString('fr-DZ')}` }
                }}
                render={({ field, fieldState: { error } }) => (
                  <CustomTextField
                    {...field} fullWidth type='number' label='Montant remboursé'
                    error={!!error} helperText={error?.message || (maxRemboursable > 0 && `Reste à payer : ${maxRemboursable.toLocaleString('fr-DZ')}`)}
                    disabled={!maxRemboursable} // Désactivé si aucun emprunt n'est sélectionné
                    InputProps={{ 
                      startAdornment: <InputAdornment position='start'><Icon icon='tabler:report-money' fontSize='1.25rem' /></InputAdornment>,
                      endAdornment: <InputAdornment position='end'>{symboleDev}</InputAdornment> 
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sx={{ mt: 2 }}>
              <Button type='submit' variant='contained' color='warning' size='large' startIcon={<Icon icon='tabler:cash-banknote-off' />}>
                Valider le remboursement
              </Button>
            </Grid>

          </Grid>
        </form>
      </CardContent>
    </Card>
  )
}

export default RembourserEmprunt