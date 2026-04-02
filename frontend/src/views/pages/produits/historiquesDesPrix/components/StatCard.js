import React from 'react'
import { Card, CardContent, Typography, Box, alpha, useTheme } from '@mui/material'
import Icon from 'src/@core/components/icon'

const StatCard = ({ title, value, subValue = '', color = 'text.primary', icon }) => {
  const theme = useTheme()
  const iconColor = color === 'text.primary' ? theme.palette.primary.main : color

  return (
    <Card
      elevation={0}
      sx={{
        textAlign: 'center',
        height: '100%',
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 6px 14px ${alpha(theme.palette.divider, 0.15)}`
        }
      }}
    >
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 1
        }}
      >
        {icon && (
          <Box
            sx={{
              p: 1.5,
              borderRadius: '50%',
              backgroundColor: alpha(iconColor, 0.1),
              color: iconColor,
              mb: 1
            }}
          >
            <Icon icon={icon} fontSize='1.5rem' />
          </Box>
        )}
        <Typography variant='body2' sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant='h5' sx={{ fontWeight: 'bold', color }}>
          {value}
        </Typography>
        {subValue && (
          <Typography variant='caption' sx={{ display: 'block', color: 'text.disabled', fontWeight: 500 }}>
            {subValue}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default StatCard
