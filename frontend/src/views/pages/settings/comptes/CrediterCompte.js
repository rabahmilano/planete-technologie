// ** React Imports
import { forwardRef, useState, useEffect } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import { InputAdornment } from '@mui/material'

import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import 'dayjs/locale/fr'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Third Party Imports
import toast from 'react-hot-toast'
import { useForm, Controller } from 'react-hook-form'
import axios from 'axios'

import { useCompte } from 'src/context/CompteContext'

dayjs.extend(utc)
dayjs.locale('fr')

const defaultValues = {
  cpt: '',
  mnt: '',
  taux: '',
  dateOp: dayjs()
  // dateOp: dayjs('2024-10-01').utc(true).startOf('day')
}

const CustomInput = forwardRef(({ ...props }, ref) => {
  return <CustomTextField fullWidth inputRef={ref} {...props} sx={{ width: '100%' }} />
})

const CrediterCompte = () => {
  const { comptes, fetchComptes } = useCompte()
  const [devise, setDevise] = useState('')
  const [isTauxEnabled, setIsTauxEnabled] = useState(false)
  const [totalMontantDZD, setTotalMontantDZD] = useState(0)

  // ** Hooks
  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
    reset
  } = useForm({ defaultValues })

  const handleCompteChange = newCompte => {
    const selectedCompte = comptes.find(compte => compte.id_cpt === newCompte)
    const newDevise = selectedCompte.dev_code
    setDevise(newDevise)
    updateTauxEnabled()
    updateTotalMontantDZD()
  }

  const handleMontantChange = montant => {
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

  const handleTauxChange = taux => {
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

    try {
      const url = `${process.env.NEXT_PUBLIC_BASE_URL}comptes/crediterCompte`
      const reponse = await axios.post(url, updatedData)
      if (reponse.status === 200) {
        toast.success(reponse.data.message)
        fetchComptes()
        reset()
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        toast.error(error.response.data.error.message)
      } else {
        toast.error('Une erreur est survenue')
      }
    }
  }

  return (
    <Card>
      <CardHeader title='Créditer un compte' />
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={5}>
            <Grid item xs={12} sm={6}>
              <Controller
                name='cpt'
                control={control}
                rules={{ required: true }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    select
                    fullWidth
                    defaultValue=''
                    label='Compte à créditer'
                    SelectProps={{
                      value: value,
                      onChange: e => {
                        onChange(e)
                        handleCompteChange(e.target.value)
                      }
                    }}
                    error={Boolean(errors.cpt)}
                    {...(errors.cpt && { helperText: 'Ce champ est obligatoire' })}
                  >
                    {comptes.map(compte => (
                      <MenuItem key={compte.id_cpt} value={compte.id_cpt}>
                        {compte.designation_cpt}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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
                rules={{ required: true, min: '0' }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    fullWidth
                    type='number'
                    label='Montant total en devise'
                    autoComplete='off'
                    value={value}
                    onChange={e => {
                      onChange(e)
                      handleMontantChange(e.target.value)
                    }}
                    error={Boolean(errors.mnt)}
                    {...(errors.mnt && { helperText: 'Ce champ doit être supérieur à 0 ' })}
                    InputProps={{
                      endAdornment: <InputAdornment position='end'>{devise}</InputAdornment>
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
                      handleTauxChange(e.target.value)
                    }}
                    autoComplete='off'
                    disabled={!isTauxEnabled}
                    error={Boolean(errors.taux)}
                    {...(errors.taux && { helperText: 'Ce champ doit être supérieur à 0' })}
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
                type='number'
                label='Montant total en DZD'
                value={totalMontantDZD.toFixed(2)}
                disabled
                InputProps={{
                  endAdornment: <InputAdornment position='end'>DZD</InputAdornment>
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Button type='submit' variant='contained'>
                Envoyer
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  )
}

export default CrediterCompte
