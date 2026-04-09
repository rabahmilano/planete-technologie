import React from 'react'
import { Typography, Box, InputAdornment, Grid } from '@mui/material'
import { Controller } from 'react-hook-form'

import CustomTextField from 'src/@core/components/mui/text-field'
import CleaveInput from 'src/components/CleaveInput'
import { formatMontant } from 'src/@core/utils/format'

const RecapitulatifFinancier = ({
  control,
  watchDevise,
  deviseCompte,
  totalFacture,
  tauxTrans,
  tauxCompte,
  commissionPct,
  fraisCarte,
  montantPreleve,
  articlesCount
}) => {
  const totalDzd = totalFacture * tauxTrans
  const totalDeviseCompte = totalDzd / tauxCompte
  const totalAPayerCompte = (montantPreleve * tauxTrans) / tauxCompte

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 6, alignItems: 'flex-start' }}>
        <Typography variant='h6' sx={{ fontWeight: 700 }}>
          Total articles : {articlesCount}
        </Typography>
        <Box textAlign='right'>
          <Typography variant='h6' fontWeight={800} color='primary.main'>
            {formatMontant(totalFacture)} {watchDevise}
          </Typography>
          {watchDevise !== deviseCompte && (
            <Typography variant='body2' color='textSecondary'>
              {formatMontant(totalDeviseCompte)} {deviseCompte}
            </Typography>
          )}
          <Typography variant='body2' color='success.main' fontWeight='bold'>
            {formatMontant(totalDzd)} DZD
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid item xs={12}>
          <Controller
            name='fraisIntermediaire'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                fullWidth
                label='Frais intermédiaire'
                size='small'
                autoComplete='off'
                InputProps={{
                  inputComponent: CleaveInput,
                  endAdornment: <InputAdornment position='end'>{watchDevise}</InputAdornment>
                }}
              />
            )}
          />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 6 }}>
        <Typography variant='body2' color='textSecondary'>
          Frais bancaire ({commissionPct}%)
        </Typography>
        <Typography variant='body2' color='error.main' fontWeight='bold'>
          + {formatMontant(fraisCarte)} {watchDevise}
        </Typography>
      </Box>

      <Box
        sx={{
          p: 4,
          backgroundColor: 'rgba(115, 103, 240, 0.08)',
          border: '1px solid rgba(115, 103, 240, 0.2)',
          borderRadius: 1
        }}
      >
        <Typography variant='caption' sx={{ textTransform: 'uppercase', fontWeight: 700, color: 'primary.main' }}>
          Montant total à payer
        </Typography>
        <Typography variant='h4' color='primary.main' sx={{ fontWeight: 800, mt: 1 }}>
          {formatMontant(montantPreleve)} {watchDevise}
        </Typography>
        {watchDevise !== deviseCompte && (
          <Typography variant='body1' color='textSecondary' sx={{ mt: 1, fontWeight: 600 }}>
            Prélèvement compte : ~ {formatMontant(totalAPayerCompte)} {deviseCompte}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

export default RecapitulatifFinancier
