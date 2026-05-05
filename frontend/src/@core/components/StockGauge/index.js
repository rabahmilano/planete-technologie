import React from 'react'
import { Box, CircularProgress, Typography, alpha, useTheme } from '@mui/material'

const StockGauge = ({ quantity }) => {
  const theme = useTheme()
  const isHealthy = quantity >= 5

  const stockColor = isHealthy ? theme.palette.success.main : theme.palette.error.main
  const stockBgColor = alpha(stockColor, 0.1)

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <CircularProgress variant='determinate' value={100} size={54} thickness={4} sx={{ color: stockBgColor }} />
      <CircularProgress
        variant='determinate'
        value={Math.min(quantity * 2, 100)}
        size={54}
        thickness={4}
        sx={{
          color: stockColor,
          position: 'absolute',
          left: 0,
          '& .MuiCircularProgress-circle': { strokeLinecap: 'round' }
        }}
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant='subtitle2' sx={{ color: stockColor, fontWeight: 'bold' }}>
          {quantity}
        </Typography>
      </Box>
    </Box>
  )
}

export default StockGauge
