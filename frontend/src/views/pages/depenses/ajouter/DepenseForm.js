import React, { useState } from 'react'
import { Grid, Button, MenuItem, InputAdornment, IconButton, Box } from '@mui/material'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { useForm, Controller } from 'react-hook-form'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import CleaveInput from 'src/components/CleaveInput'

dayjs.locale('fr')

const defaultValues = {
  cpt: '',
  montant: '',
  nature: '',
  dateDepense: dayjs(),
  observation: ''
}

const DepenseForm = ({ listNature, listCompte, onSubmit, onOpenDrawer }) => {
  const [symboleDev, setSymboleDev] = useState('')

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({ defaultValues })

  const handleCompteChange = newCompte => {
    const selectedCompte = listCompte.find(compte => compte.id_cpt === newCompte)
    if (selectedCompte) {
      setSymboleDev(selectedCompte.devise?.symbole_dev || '')
    }
  }

  const submitForm = data => {
    onSubmit(data, reset, setSymboleDev)
  }

  return (
    <form onSubmit={handleSubmit(submitForm)}>
      <Grid container spacing={5}>
        <Grid item xs={12} sm={6} md={3}>
          <Controller
            name='dateDepense'
            control={control}
            rules={{ required: 'Ce champ est obligatoire' }}
            render={({ field, fieldState: { error } }) => (
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                <DatePicker
                  {...field}
                  maxDate={dayjs().endOf('day')}
                  label='Date de la dépense'
                  slotProps={{
                    textField: {
                      fullWidth: true,
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

        <Grid item xs={12} sm={6} md={3}>
          <Controller
            name='nature'
            control={control}
            rules={{ required: true }}
            render={({ field: { value, onChange } }) => (
              <CustomTextField
                select
                fullWidth
                defaultValue=''
                label='Nature de la dépense'
                SelectProps={{ value: value, onChange: e => onChange(e) }}
                error={Boolean(errors.nature)}
                {...(errors.nature && { helperText: 'Ce champ est obligatoire' })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start' sx={{ ml: '-10px', mr: 2 }}>
                      <IconButton edge='end' onMouseDown={e => e.preventDefault()} onClick={onOpenDrawer} color='info'>
                        <Icon fontSize='1.25rem' icon='tabler:circle-plus' />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              >
                {listNature.map(item => (
                  <MenuItem key={item.id_nat_dep} value={item.id_nat_dep}>
                    {item.designation_nat_dep}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Controller
            name='cpt'
            control={control}
            rules={{ required: true }}
            render={({ field: { value, onChange } }) => (
              <CustomTextField
                select
                fullWidth
                defaultValue=''
                label='Compte de paiement'
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
                {listCompte.map(compte => (
                  <MenuItem key={compte.id_cpt} value={compte.id_cpt}>
                    {compte.designation_cpt}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Controller
            name='montant'
            control={control}
            rules={{ required: true }}
            render={({ field: { value, onChange } }) => (
              <CustomTextField
                fullWidth
                value={value}
                onChange={onChange}
                label='Montant'
                autoComplete='off'
                error={Boolean(errors.montant)}
                {...(errors.montant && { helperText: 'Ce champ est obligatoire' })}
                InputProps={{
                  inputComponent: CleaveInput,
                  endAdornment: <InputAdornment position='end'>{symboleDev}</InputAdornment>
                }}
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <Controller
            name='observation'
            control={control}
            rules={{
              maxLength: { value: 255, message: "L'observation ne peut pas dépasser 255 caractères" }
            }}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <CustomTextField
                fullWidth
                multiline
                rows={3}
                value={value}
                onChange={onChange}
                label='Observation (Optionnel)'
                placeholder='Ex: Paiement facture internet N°1234...'
                autoComplete='off'
                error={Boolean(error)}
                helperText={error ? error.message : `${value.length}/255`}
                FormHelperTextProps={{
                  sx: { textAlign: 'right', color: value.length >= 250 ? 'error.main' : 'text.secondary' }
                }}
                inputProps={{ maxLength: 255 }}
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
            <Button
              type='submit'
              variant='contained'
              color='success'
              size='large'
              startIcon={<Icon icon='tabler:check' />}
              sx={{ px: 8, fontWeight: 'bold' }}
            >
              Enregistrer la dépense
            </Button>
          </Box>
        </Grid>
      </Grid>
    </form>
  )
}

export default DepenseForm
