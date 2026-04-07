import React from 'react'
import { Typography, Card, CardContent, Box, Divider, InputAdornment } from '@mui/material'
import { Controller } from 'react-hook-form'

import CustomTextField from 'src/@core/components/mui/text-field'
import CleaveInput from 'src/components/CleaveInput'
import { formatMontant } from 'src/@core/utils/format'

const RecapitulatifFinancier = ({ watchDevise, totalFacture, commissionPct, fraisCarte, montantPreleve, control }) => {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'visible', boxShadow: 3 }}>
      <CardContent sx={{ p: 6, flexGrow: 1 }}>
        <Typography
          variant='subtitle1'
          sx={{ mb: 6, fontWeight: 700, color: 'primary.main', textTransform: 'uppercase' }}
        >
          Récapitulatif
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
          <Typography variant='body1'>Total Articles</Typography>
          <Typography variant='body1' fontWeight={600}>
            {formatMontant(totalFacture)} {watchDevise}
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant='body2' sx={{ mb: 2 }}>
            Frais Intermédiaire
          </Typography>
          <Controller
            name='fraisIntermediaire'
            control={control}
            render={({ field, fieldState: { error } }) => (
              <CustomTextField
                {...field}
                fullWidth
                size='small'
                autoComplete='off'
                error={!!error}
                helperText={error?.message}
                InputProps={{
                  inputComponent: CleaveInput,
                  endAdornment: <InputAdornment position='end'>{watchDevise}</InputAdornment>
                }}
              />
            )}
          />
        </Box>

        <Divider sx={{ my: 5 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
          <Typography variant='body2' color='textSecondary'>
            Frais Bancaire ({commissionPct}%)
          </Typography>
          <Typography variant='body2' color='error.main'>
            + {formatMontant(fraisCarte)} {watchDevise}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mt: 6,
            p: 4,
            backgroundColor: 'rgba(40, 199, 111, 0.1)',
            borderRadius: 1
          }}
        >
          <Typography variant='h6' color='success.main'>
            Prélevé
          </Typography>
          <Typography variant='h6' color='success.main'>
            {formatMontant(montantPreleve)} {watchDevise}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

export default RecapitulatifFinancier
