import { useState } from 'react'
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
import { useForm, Controller } from 'react-hook-form'

import { useCompte } from 'src/context/CompteContext'
import { useEmprunt } from 'src/context/EmpruntContext'

import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import CleaveInput from 'src/components/CleaveInput'
import { formatMontant } from 'src/@core/utils/format'

const defaultValues = { desEmprunt: '', cpt: '', montant: '', dateEmprunt: dayjs() }

const AjouterEmprunt = () => {
  const [symboleDev, setSymboleDev] = useState('')
  const [openModal, setOpenModal] = useState(false)
  const [formDataToSubmit, setFormDataToSubmit] = useState(null)

  const { comptes, fetchComptes } = useCompte()
  const { ajouterEmprunt } = useEmprunt()

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({ defaultValues })

  const handleCompteChange = newCompteId => {
    const selectedCompte = comptes.find(compte => compte.id_cpt === newCompteId)
    if (selectedCompte && selectedCompte.devise) setSymboleDev(selectedCompte.devise.symbole_dev)
  }

  const onPreSubmit = data => {
    setFormDataToSubmit(data)
    setOpenModal(true)
  }

  const executeApiCall = async () => {
    setOpenModal(false)

    const cleanMontant = parseFloat(formDataToSubmit.montant.toString().replace(/\s/g, ''))

    const formattedData = {
      desEmprunt: formDataToSubmit.desEmprunt.trim(),
      montant: cleanMontant,
      cpt: parseInt(formDataToSubmit.cpt),
      dateEmprunt: dayjs(formDataToSubmit.dateEmprunt).toISOString()
    }

    const isSuccess = await ajouterEmprunt(formattedData)

    if (isSuccess) {
      await fetchComptes()
      reset()
      setSymboleDev('')
    }
  }

  const nomCompteSelectionne = comptes.find(c => c.id_cpt === parseInt(formDataToSubmit?.cpt))?.designation_cpt

  return (
    <>
      <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Icon icon='tabler:cash-banknote' fontSize='1.75rem' color='primary.main' />
              <Typography variant='h5'>Déclaration d'un nouvel emprunt</Typography>
            </Box>
          }
        />
        <Divider sx={{ m: '0 !important' }} />
        <CardContent sx={{ pt: 6 }}>
          <form onSubmit={handleSubmit(onPreSubmit)}>
            <Grid container spacing={6}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name='dateEmprunt'
                  control={control}
                  rules={{
                    required: 'Obligatoire',
                    validate: v => dayjs(v).isBefore(dayjs().add(1, 'day')) || 'Date invalide'
                  }}
                  render={({ field, fieldState: { error } }) => (
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                      <DatePicker
                        {...field}
                        maxDate={dayjs()}
                        label='Date de réception'
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
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name='desEmprunt'
                  control={control}
                  rules={{ required: 'Obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      label='Désignation'
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
                  name='cpt'
                  control={control}
                  rules={{ required: 'Obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextField
                      select
                      fullWidth
                      label='Compte crédité'
                      error={!!error}
                      helperText={error?.message}
                      value={field.value}
                      onChange={e => {
                        field.onChange(e)
                        handleCompteChange(e.target.value)
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Icon icon='tabler:building-bank' />
                          </InputAdornment>
                        )
                      }}
                    >
                      {comptes.map(c => (
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
                  name='montant'
                  control={control}
                  rules={{
                    required: 'Obligatoire',
                    validate: v => parseFloat(v.toString().replace(/\s/g, '')) > 0 || '> 0'
                  }}
                  render={({ field: { value, onChange }, fieldState: { error } }) => (
                    <CustomTextField
                      fullWidth
                      label='Montant emprunté'
                      value={value}
                      onChange={onChange}
                      error={!!error}
                      helperText={error?.message}
                      InputProps={{
                        inputComponent: CleaveInput,
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Icon icon='tabler:report-money' />
                          </InputAdornment>
                        ),
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

      <ConfirmDialog
        open={openModal}
        handleClose={() => setOpenModal(false)}
        handleConfirm={executeApiCall}
        actionType='create'
        title="Confirmer l'emprunt"
        content={
          <>
            <Typography variant='body1' sx={{ mb: 4 }}>
              Voulez-vous vraiment enregistrer cette entrée de fonds ? Cette action mettra à jour votre dette et le
              solde du compte.
            </Typography>
            {formDataToSubmit && (
              <Box sx={{ p: 4, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 1 }}>
                <Typography variant='body2'>
                  <strong>Désignation :</strong> {formDataToSubmit.desEmprunt}
                </Typography>
                <Typography variant='body2'>
                  <strong>Compte :</strong> {nomCompteSelectionne}
                </Typography>
                <Typography variant='body2' sx={{ mt: 2, fontWeight: 'bold', color: 'error.main' }}>
                  Montant : {formatMontant(formDataToSubmit.montant.toString().replace(/\s/g, ''))} {symboleDev}
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
