import { useState } from 'react'

import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import InputAdornment from '@mui/material/InputAdornment'

import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import 'dayjs/locale/fr'

import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { useForm, Controller } from 'react-hook-form'

import { useCompte } from 'src/context/CompteContext'
import { formatMontant } from 'src/@core/utils/format'
import CleaveInput from 'src/components/CleaveInput'

dayjs.extend(utc)
dayjs.locale('fr')

const defaultValues = {
  cpt: '',
  mnt: '',
  taux: '',
  dateOp: dayjs()
}

const CrediterCompte = () => {
  const { comptes, crediter } = useCompte()
  const [devise, setDevise] = useState('')
  const [isTauxEnabled, setIsTauxEnabled] = useState(false)
  const [totalMontantDZD, setTotalMontantDZD] = useState(0)

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
    reset
  } = useForm({ defaultValues })

  const handleCompteChange = newCompte => {
    const selectedCompte = comptes.find(compte => compte.id_cpt === newCompte)
    const newDevise = selectedCompte?.dev_code || ''
    setDevise(newDevise)
    updateTauxEnabled()
    updateTotalMontantDZD()
  }

  const handleMontantChange = () => {
    updateTauxEnabled()
    updateTotalMontantDZD()
  }

  const updateTauxEnabled = () => {
    const compte = getValues('cpt')
    const montant = getValues('mnt')
    setIsTauxEnabled(!!compte && !!montant)
  }

  const updateTotalMontantDZD = () => {
    const montant = parseFloat(getValues('mnt')) || 0
    const taux = parseFloat(getValues('taux')) || 0
    setTotalMontantDZD(montant * taux)
  }

  const handleTauxChange = () => {
    updateTotalMontantDZD()
  }

  const onSubmit = async () => {
    const data = getValues()
    const updatedData = {
      ...data,
      dateOp: dayjs(data.dateOp).toISOString(),
      mnt: parseFloat(data.mnt),
      taux: parseFloat(data.taux)
    }

    const isSuccess = await crediter(updatedData)
    if (isSuccess) {
      reset(defaultValues)
      setTotalMontantDZD(0)
      setDevise('')
      setIsTauxEnabled(false)
    }
  }

  return (
    <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Icon icon='tabler:cash' fontSize='1.75rem' color='primary' />
            <Typography variant='h6'>Créditer un compte</Typography>
          </Box>
        }
      />
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={5} alignItems='flex-end'>
            <Grid item xs={12} sm={6}>
              <Controller
                name='cpt'
                control={control}
                rules={{ required: true }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    select
                    fullWidth
                    label='Compte à créditer'
                    value={value}
                    onChange={e => {
                      onChange(e)
                      handleCompteChange(e.target.value)
                    }}
                    error={Boolean(errors.cpt)}
                    {...(errors.cpt && { helperText: 'Ce champ est obligatoire' })}
                  >
                    {comptes?.map(compte => (
                      <MenuItem key={compte.id_cpt} value={compte.id_cpt}>
                        {compte.designation_cpt} ({compte.dev_code})
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name='dateOp'
                control={control}
                rules={{ required: 'Ce champ est obligatoire' }}
                render={({ field, fieldState: { error } }) => (
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                    <DatePicker
                      {...field}
                      maxDate={dayjs()}
                      label='Date'
                      slotProps={{
                        textField: {
                          variant: 'outlined',
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

            <Grid item xs={12} sm={4}>
              <Controller
                name='mnt'
                control={control}
                rules={{ required: true, min: '0.01' }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    fullWidth
                    label='Montant total en devise'
                    autoComplete='off'
                    value={value}
                    onChange={e => {
                      onChange(e)
                      handleMontantChange()
                    }}
                    error={Boolean(errors.mnt)}
                    {...(errors.mnt && { helperText: 'Doit être supérieur à 0' })}
                    InputProps={{
                      inputComponent: CleaveInput,
                      endAdornment: <InputAdornment position='end'>{devise || '---'}</InputAdornment>
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Controller
                name='taux'
                control={control}
                rules={{ required: true, min: 1 }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    fullWidth
                    value={value}
                    type='number'
                    label='Taux de change'
                    placeholder='1.00'
                    onChange={e => {
                      onChange(e)
                      handleTauxChange()
                    }}
                    autoComplete='off'
                    disabled={!isTauxEnabled}
                    error={Boolean(errors.taux)}
                    {...(errors.taux && { helperText: 'Doit être supérieur à 0' })}
                    InputProps={{
                      endAdornment: <InputAdornment position='end'>DZD</InputAdornment>
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <CustomTextField
                fullWidth
                type='text'
                label='Montant total calculé'
                value={formatMontant(totalMontantDZD)}
                disabled
                InputProps={{
                  endAdornment: <InputAdornment position='end'>DZD</InputAdornment>
                }}
              />
            </Grid>

            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button type='submit' variant='contained' startIcon={<Icon icon='tabler:send' />}>
                Créditer le compte
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  )
}

export default CrediterCompte
