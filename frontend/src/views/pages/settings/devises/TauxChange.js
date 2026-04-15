import { forwardRef } from 'react'
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

import CustomTextField from 'src/@core/components/mui/text-field'
import { useForm, Controller } from 'react-hook-form'
import { useDevises } from 'src/context/DeviseContext'
import Cleave from 'cleave.js/react'

dayjs.locale('fr')

const defaultValues = {
  devise: '',
  taux: '',
  dateTaux: dayjs()
}

const CleaveInput = forwardRef((props, ref) => {
  const { ...rest } = props
  return <Cleave htmlRef={ref} {...rest} options={{ numeral: true, numeralThousandsGroupStyle: 'none' }} />
})

const TauxChange = () => {
  const { devises, ajouterTauxChange } = useDevises()

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

    const success = await ajouterTauxChange(updatedData)
    if (success) {
      reset()
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
                      slots={{ textField: CustomTextField }}
                      slotProps={{
                        textField: {
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
            <Grid item xs={12} sm={6}>
              <Controller
                name='devise'
                control={control}
                rules={{ required: true }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    select
                    fullWidth
                    value={value}
                    label='Devise'
                    onChange={onChange}
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
                    label='Taux de change'
                    placeholder='1.00'
                    onChange={onChange}
                    autoComplete='off'
                    error={Boolean(errors.taux)}
                    {...(errors.taux && { helperText: 'Ce champ doit être supérieur à 0' })}
                    InputProps={{
                      inputComponent: CleaveInput,
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
