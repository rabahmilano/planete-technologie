import React from 'react'
import { Grid, Card, CardContent, Typography, Box, alpha, useTheme } from '@mui/material'
import Icon from 'src/@core/components/icon'

const KpiCards = ({ stats }) => {
  const theme = useTheme()

  const kpis = [
    { title: 'Produits Uniques', value: stats.totalProduits, icon: 'tabler:box', color: theme.palette.primary.main },
    {
      title: 'Produits en Stock',
      value: stats.produitsEnStock,
      icon: 'tabler:checkbox',
      color: theme.palette.success.main
    },
    { title: 'Articles Achetés', value: stats.totalQteAchetee, icon: 'tabler:packages', color: theme.palette.info.main }
  ]

  return (
    <Grid container spacing={6}>
      {kpis.map((kpi, index) => (
        <Grid item xs={12} md={4} key={index}>
          <Card sx={{ boxShadow: 3, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: alpha(kpi.color, 0.1),
                  color: kpi.color,
                  display: 'flex'
                }}
              >
                <Icon icon={kpi.icon} fontSize='2rem' />
              </Box>
              <Box sx={{ ml: 4 }}>
                <Typography variant='h5' sx={{ fontWeight: 'bold' }}>
                  {kpi.value}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ fontWeight: 500 }}>
                  {kpi.title}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default KpiCards
