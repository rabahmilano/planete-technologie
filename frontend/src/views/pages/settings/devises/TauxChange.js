// ** React Imports
import { forwardRef } from 'react'

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
import 'dayjs/locale/fr'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Third Party Imports
import toast from 'react-hot-toast'
import { useForm, Controller } from 'react-hook-form'
import axios from 'axios'

import { useDevises } from 'src/context/DeviseContext'

dayjs.locale('fr')

const defaultValues = {
  devise: '',
  taux: '',
  dateTaux: dayjs()
}

const CustomInput = forwardRef(({ ...props }, ref) => {
  return <CustomTextField fullWidth inputRef={ref} {...props} sx={{ width: '100%' }} />
})

const TauxChange = () => {
  const { devises, fetchDevisesDetails } = useDevises()

  // ** Hooks
  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
    reset
  } = useForm({ defaultValues })

  const onSubmit = async () => {
    const data = getValues()
    const updatedData = { ...data, dateTaux: dayjs(data.dateTaux).toISOString() }

    try {
      const url = `${process.env.NEXT_PUBLIC_BASE_URL}devises/addTauxChange`
      const reponse = await axios.post(url, updatedData)
      if (reponse.status === 200) {
        toast.success('Le nouveau taux de change est appliqué')
        fetchDevisesDetails()
        reset()
      }
    } catch (error) {
      toast.error('Erreur: ' + error.message)
    }
  }

  return (
    <Card>
      <CardHeader title='Ajouter un nouveau taux de change' />
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={5}>
            <Grid item xs={12}>
              <Controller
                name='dateTaux'
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
            <Grid item xs={12} sm={6}>
              <Controller
                name='devise'
                control={control}
                rules={{ required: true }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    select
                    fullWidth
                    defaultValue=''
                    label='Devise'
                    SelectProps={{
                      value: value,
                      onChange: e => onChange(e)
                    }}
                    error={Boolean(errors.devise)}
                    {...(errors.devise && { helperText: 'Ce champ est obligatoire' })}
                  >
                    {devises.map(devise => (
                      <MenuItem key={devise.code_dev} value={devise.code_dev}>
                        {devise.code_dev}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
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
                    onChange={onChange}
                    autoComplete='off'
                    error={Boolean(errors.taux)}
                    {...(errors.taux && { helperText: 'Ce champ doit être supérieur à 0' })}
                    InputProps={{
                      endAdornment: <InputAdornment position='end'>DZD</InputAdornment>
                    }}
                  />
                )}
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

export default TauxChange
