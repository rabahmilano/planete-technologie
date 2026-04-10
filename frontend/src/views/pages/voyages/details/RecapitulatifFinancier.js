import React from 'react'
import { Typography, Box, InputAdornment, Grid, TextField } from '@mui/material'
import { Controller } from 'react-hook-form'

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'flex-start' }}>
        <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
          Total articles : {articlesCount}
        </Typography>
        <Box textAlign='right'>
          <Typography variant='subtitle1' fontWeight={800} color='primary.main'>
            {formatMontant(totalFacture)} {watchDevise}
          </Typography>
          {watchDevise !== deviseCompte && (
            <Typography variant='caption' color='textSecondary' display='block'>
              {formatMontant(totalDeviseCompte)} {deviseCompte}
            </Typography>
          )}
          <Typography variant='caption' color='success.main' fontWeight='bold' display='block'>
            {formatMontant(totalDzd)} DZD
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={4} sx={{ mb: 4, alignItems: 'stretch' }}>
        <Grid item xs={6}>
          <Controller
            name='fraisIntermediaire'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Frais intermédiaire'
                autoComplete='off'
                InputProps={{
                  inputComponent: CleaveInput,
                  endAdornment: <InputAdornment position='end'>{watchDevise}</InputAdornment>
                }}
              />
            )}
          />
        </Grid>
        <Grid item xs={6}>
          <Box
            sx={{
              height: '100%',
              px: 3,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              borderRadius: 1,
              border: '1px dashed #ccc'
            }}
          >
            <Typography variant='caption' color='textSecondary' display='block'>
              Frais bancaire ({commissionPct}%)
            </Typography>
            <Typography variant='body2' color='error.main' fontWeight='bold'>
              + {formatMontant(fraisCarte)} {watchDevise}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Box
        sx={{
          p: 3,
          backgroundColor: 'rgba(115, 103, 240, 0.05)',
          border: '1px solid rgba(115, 103, 240, 0.2)',
          borderRadius: 1
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant='caption' sx={{ textTransform: 'uppercase', fontWeight: 700, color: 'primary.main' }}>
            Montant prélevé
          </Typography>
          <Typography variant='h5' color='primary.main' sx={{ fontWeight: 800 }}>
            {formatMontant(montantPreleve)} {watchDevise}
          </Typography>
        </Box>

        {watchDevise !== deviseCompte && (
          <Typography variant='body2' color='textSecondary' sx={{ mt: 0.5, fontWeight: 600, textAlign: 'right' }}>
            Soit : {formatMontant(totalAPayerCompte)} {deviseCompte}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

export default RecapitulatifFinancier
