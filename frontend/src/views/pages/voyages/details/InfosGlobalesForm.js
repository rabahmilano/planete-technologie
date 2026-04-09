import React from 'react'
import { Grid, Typography, MenuItem, Box } from '@mui/material'
import { Controller } from 'react-hook-form'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import 'dayjs/locale/fr'

import CustomTextField from 'src/@core/components/mui/text-field'
import CleaveInput from 'src/components/CleaveInput'

const InfosGlobalesForm = ({
  control,
  minDate,
  maxDate,
  comptes,
  voyage,
  isLocked,
  handleCompteChange,
  handleDeviseChange,
  selectedCpt
}) => {
  const devisesBrutes = [voyage?.dev_dest, selectedCpt?.dev_code]
  const devisesDisponibles = devisesBrutes.filter((item, index) => item && devisesBrutes.indexOf(item) === index)

  return (
    <Box>
      <Typography variant='h6' sx={{ mb: 4, fontWeight: 700 }}>
        Informations Générales
      </Typography>
      <Grid container spacing={4}>
        <Grid item xs={12} sm={4}>
          <Controller
            name='dateAchat'
            control={control}
            rules={{ required: 'Obligatoire' }}
            render={({ field, fieldState: { error } }) => (
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                <DatePicker
                  {...field}
                  minDate={minDate}
                  maxDate={maxDate}
                  label='Date de facture'
                  disabled={isLocked}
                  slots={{ textField: CustomTextField }}
                  slotProps={{
                    textField: { fullWidth: true, error: !!error, helperText: error?.message, autoComplete: 'off' }
                  }}
                />
              </LocalizationProvider>
            )}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Controller
            name='cptPaiementId'
            control={control}
            rules={{ required: 'Obligatoire' }}
            render={({ field, fieldState: { error } }) => (
              <CustomTextField
                select
                fullWidth
                label='Compte de paiement'
                error={!!error}
                helperText={error?.message}
                disabled={isLocked}
                value={field.value}
                onChange={e => handleCompteChange(e.target.value)}
              >
                {comptes.map(c => (
                  <MenuItem key={c.id_cpt} value={c.id_cpt}>
                    {c.designation_cpt} ({c.dev_code})
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Controller
            name='fournisseur'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                fullWidth
                label='Fournisseur (Optionnel)'
                autoComplete='off'
                disabled={isLocked}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            name='deviseFacture'
            control={control}
            rules={{ required: 'Obligatoire' }}
            render={({ field, fieldState: { error } }) => (
              <CustomTextField
                select
                fullWidth
                label='Devise de la facture'
                error={!!error}
                helperText={error?.message}
                disabled={isLocked}
                value={field.value}
                onChange={e => handleDeviseChange(e.target.value)}
              >
                {devisesDisponibles.map(dev => (
                  <MenuItem key={dev} value={dev}>
                    {dev}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            name='tauxChange'
            control={control}
            rules={{ required: 'Obligatoire' }}
            render={({ field, fieldState: { error } }) => (
              <CustomTextField
                {...field}
                fullWidth
                label='Taux de change appliqué'
                error={!!error}
                helperText={error?.message}
                disabled={true}
                autoComplete='off'
                InputProps={{ inputComponent: CleaveInput }}
                sx={{ backgroundColor: 'rgba(0,0,0,0.03)' }}
              />
            )}
          />
        </Grid>
      </Grid>
    </Box>
  )
}

export default InfosGlobalesForm
