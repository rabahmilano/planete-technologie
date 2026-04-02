import React from 'react'
import { Paper, Box, Typography, alpha, useTheme, Chip } from '@mui/material'
import Icon from 'src/@core/components/icon'
import { getProductIcon } from 'src/@core/utils/iconConfig'

const ProductCard = ({ produit, onClick }) => {
  const theme = useTheme()
  const isAvailable = produit.qte_dispo > 0

  return (
    <Paper
      onClick={onClick}
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        backgroundColor: theme.palette.background.paper,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: theme.palette.primary.main,
          boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.15)}`
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: '50%',
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            color: theme.palette.primary.main,
            display: 'flex',
            flexShrink: 0
          }}
        >
          <Icon icon={getProductIcon(produit.designation_prd)} fontSize='1.5rem' />
        </Box>
        <Box sx={{ overflow: 'hidden', flexGrow: 1 }}>
          <Typography
            variant='body2'
            sx={{
              fontWeight: 600,
              mb: 0.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.3
            }}
            title={produit.designation_prd}
          >
            {produit.designation_prd}
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.disabled', fontWeight: 500 }}>
            ID: #{produit.id_prd}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 'auto',
          pt: 2,
          borderTop: `1px dashed ${theme.palette.divider}`
        }}
      >
        <Typography variant='caption' color='text.secondary'>
          Disponibilité
        </Typography>
        <Chip
          label={isAvailable ? `${produit.qte_dispo} Unités` : 'Rupture'}
          color={isAvailable ? 'success' : 'error'}
          variant='tonal'
          size='small'
          sx={{ fontWeight: 'bold', height: 24 }}
        />
      </Box>
    </Paper>
  )
}

export default ProductCard
