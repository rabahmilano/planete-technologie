import { useState, useMemo } from 'react'
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

const defaultValues = {
  idEmpruntCible: '',
  cptCible: '',
  mntRembourse: '',
  dateRembourse: dayjs()
}

const RembourserEmprunt = () => {
  const [symboleDev, setSymboleDev] = useState('')
  const [maxRemboursable, setMaxRemboursable] = useState(0)

  const [openModal, setOpenModal] = useState(false)
  const [formDataToSubmit, setFormDataToSubmit] = useState(null)

  const { comptes, fetchComptes } = useCompte()
  const { emprunts, ajouterRemboursement } = useEmprunt()

  const { control, handleSubmit, reset } = useForm({ defaultValues })

  const empruntsActifs = useMemo(() => {
    return emprunts.filter(emp => emp.statut_emprunt !== 'SOLDE')
  }, [emprunts])

  const handleEmpruntChange = idEmprunt => {
    const empruntSelectionne = empruntsActifs.find(emp => emp.id_emprunt === idEmprunt)
    if (empruntSelectionne) {
      const totalDejaRembourse =
        empruntSelectionne.remboursements?.reduce((acc, curr) => acc + parseFloat(curr.mnt_remb || 0), 0) || 0
      const reste = parseFloat(empruntSelectionne.mnt_emprunt || 0) - totalDejaRembourse
      setMaxRemboursable(reste)
    } else {
      setMaxRemboursable(0)
    }
  }

  const handleCompteChange = idCpt => {
    const selectedCompte = comptes.find(compte => compte.id_cpt === idCpt)
    if (selectedCompte && selectedCompte.devise) {
      setSymboleDev(selectedCompte.devise.symbole_dev)
    }
  }

  const onPreSubmit = data => {
    setFormDataToSubmit(data)
    setOpenModal(true)
  }

  const executeApiCall = async () => {
    setOpenModal(false)

    const cleanMontant = parseFloat(formDataToSubmit.mntRembourse.toString().replace(/\s/g, ''))

    const formattedData = {
      idEmpruntCible: parseInt(formDataToSubmit.idEmpruntCible),
      cptCible: parseInt(formDataToSubmit.cptCible),
      mntRembourse: cleanMontant,
      dateRembourse: dayjs(formDataToSubmit.dateRembourse).toISOString()
    }

    const isSuccess = await ajouterRemboursement(formattedData)

    if (isSuccess) {
      await fetchComptes()
      reset()
      setSymboleDev('')
      setMaxRemboursable(0)
    }
  }

  const empSelectionne = empruntsActifs.find(e => e.id_emprunt === parseInt(formDataToSubmit?.idEmpruntCible))
  const cptSelectionne = comptes.find(c => c.id_cpt === parseInt(formDataToSubmit?.cptCible))

  return (
    <>
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
          <form onSubmit={handleSubmit(onPreSubmit)}>
            <Grid container spacing={6}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name='idEmpruntCible'
                  control={control}
                  rules={{ required: "Sélectionnez l'emprunt" }}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextField
                      select
                      fullWidth
                      label='Emprunt à rembourser'
                      error={!!error}
                      helperText={error?.message}
                      value={field.value}
                      onChange={e => {
                        field.onChange(e)
                        handleEmpruntChange(e.target.value)
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Icon icon='tabler:file-invoice' />
                          </InputAdornment>
                        )
                      }}
                    >
                      {empruntsActifs.map(emp => {
                        const reste =
                          parseFloat(emp.mnt_emprunt || 0) -
                          (emp.remboursements?.reduce((sum, r) => sum + parseFloat(r.mnt_remb || 0), 0) || 0)
                        return (
                          <MenuItem key={emp.id_emprunt} value={emp.id_emprunt}>
                            {emp.des_emprunt} (Reste: {formatMontant(reste)} DA)
                          </MenuItem>
                        )
                      })}
                    </CustomTextField>
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name='dateRembourse'
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
                        label='Date remboursement'
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
                  name='cptCible'
                  control={control}
                  rules={{ required: 'Obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextField
                      select
                      fullWidth
                      label='Compte de prélèvement'
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
                  name='mntRembourse'
                  control={control}
                  rules={{
                    required: 'Obligatoire',
                    validate: v => {
                      const cleanVal = parseFloat(v.toString().replace(/\s/g, ''))
                      if (cleanVal <= 0) return '> 0'
                      if (cleanVal > maxRemboursable) return `Max : ${formatMontant(maxRemboursable)}`
                      return true
                    }
                  }}
                  render={({ field: { value, onChange }, fieldState: { error } }) => (
                    <CustomTextField
                      fullWidth
                      label='Montant remboursé'
                      value={value}
                      onChange={onChange}
                      error={!!error}
                      helperText={
                        error?.message ||
                        (maxRemboursable > 0 && `Max remboursable : ${formatMontant(maxRemboursable)}`)
                      }
                      disabled={!maxRemboursable}
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
                <Button
                  type='submit'
                  variant='contained'
                  color='warning'
                  size='large'
                  startIcon={<Icon icon='tabler:cash-banknote-off' />}
                >
                  Valider le remboursement
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
        actionType='warning'
        title='Confirmer le remboursement'
        confirmText='Confirmer le paiement'
        content={
          <>
            <Typography variant='body1' sx={{ mb: 4 }}>
              Attention : vous allez enregistrer une sortie de fonds. Cette action diminuera le solde de votre compte et
              mettra à jour l'emprunt sélectionné.
            </Typography>
            {formDataToSubmit && (
              <Box
                sx={{ p: 4, backgroundColor: 'rgba(255, 159, 67, 0.08)', border: '1px dashed orange', borderRadius: 1 }}
              >
                <Typography variant='body2'>
                  <strong>Emprunt :</strong> {empSelectionne?.des_emprunt}
                </Typography>
                <Typography variant='body2'>
                  <strong>Source :</strong> {cptSelectionne?.designation_cpt}
                </Typography>
                <Typography variant='h6' sx={{ mt: 2, fontWeight: 'bold', color: 'warning.main' }}>
                  Montant payé : {formatMontant(formDataToSubmit.mntRembourse.toString().replace(/\s/g, ''))}{' '}
                  {symboleDev}
                </Typography>
              </Box>
            )}
          </>
        }
      />
    </>
  )
}

export default RembourserEmprunt
