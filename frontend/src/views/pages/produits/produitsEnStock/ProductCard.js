import React from 'react'
import { Paper, Box, Typography, alpha, useTheme } from '@mui/material'
import Icon from 'src/@core/components/icon'
import { getProductIcon } from 'src/@core/utils/iconConfig'
import StockGauge from 'src/@core/components/StockGauge'

const ProductCard = ({ produit }) => {
  const theme = useTheme()

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        backgroundColor: theme.palette.background.paper,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          borderColor: theme.palette.primary.main,
          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden' }}>
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
        <Box sx={{ overflow: 'hidden' }}>
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

      <StockGauge quantity={produit.qte_dispo} />
    </Paper>
  )
}

export default ProductCard
