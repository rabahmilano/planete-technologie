import React from 'react'
import { Grid, Typography, MenuItem, Card, CardContent } from '@mui/material'
import { Controller } from 'react-hook-form'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import 'dayjs/locale/fr'

import CustomTextField from 'src/@core/components/mui/text-field'
import CleaveInput from 'src/components/CleaveInput'

const InfosGlobalesForm = ({ control, minDate, maxDate, comptes }) => {
  return (
    <Card sx={{ overflow: 'visible', boxShadow: 3 }}>
      <CardContent sx={{ p: 6 }}>
        <Typography
          variant='subtitle1'
          sx={{ mb: 6, fontWeight: 700, color: 'primary.main', textTransform: 'uppercase' }}
        >
          1. Informations Générales
        </Typography>
        <Grid container spacing={5}>
          <Grid item xs={12} sm={4}>
            <Controller
              name='fournisseur'
              control={control}
              render={({ field }) => (
                <CustomTextField {...field} fullWidth label='Fournisseur (Optionnel)' autoComplete='off' />
              )}
            />
          </Grid>
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
                    label="Date d'achat"
                    slots={{ textField: CustomTextField }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!error,
                        helperText: error?.message
                      }
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
                  {...field}
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
              name='deviseFacture'
              control={control}
              rules={{ required: 'Obligatoire' }}
              render={({ field, fieldState: { error } }) => (
                <CustomTextField
                  {...field}
                  fullWidth
                  label='Devise de la facture'
                  error={!!error}
                  helperText={error?.message}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Controller
              name='tauxChange'
              control={control}
              rules={{ required: 'Obligatoire' }}
              render={({ field, fieldState: { error } }) => (
                <CustomTextField
                  {...field}
                  fullWidth
                  autoComplete='off'
                  label='Taux de change'
                  error={!!error}
                  helperText={error?.message}
                  InputProps={{ inputComponent: CleaveInput }}
                />
              )}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default InfosGlobalesForm
