import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import { useTheme } from '@mui/material/styles'

import Icon from 'src/@core/components/icon'
import { formatMontant } from 'src/@core/utils/format'
import { hexToRGBA } from 'src/@core/utils/hex-to-rgba'

const KpiCards = ({ data }) => {
  const theme = useTheme()

  const kpis = [
    {
      title: "Chiffre d'Affaires",
      stats: `${formatMontant(data?.chiffreAffaires || 0)} DZD`,
      icon: 'tabler:currency-dollar',
      color: 'primary'
    },
    {
      title: 'Investissement',
      stats: `${formatMontant(data?.investissement || 0)} DZD`,
      icon: 'tabler:wallet',
      color: 'error'
    },
    {
      title: 'Marge Brute',
      stats: `${formatMontant(data?.margeBrute || 0)} DZD`,
      icon: 'tabler:chart-pie-2',
      color: 'success'
    },
    {
      title: 'Colis en Route',
      stats: `${data?.colisEnRoute || 0} articles`,
      icon: 'tabler:truck',
      color: 'warning'
    }
  ]

  return (
    <Grid container spacing={6}>
      {kpis.map((item, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card sx={{ boxShadow: 3, transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-5px)' } }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Avatar
                variant='rounded'
                sx={{
                  mb: 4,
                  width: 48,
                  height: 48,
                  color: `${item.color}.main`,
                  backgroundColor: hexToRGBA(theme.palette[item.color].main, 0.16) // La magie Vuexy est ici
                }}
              >
                <Icon icon={item.icon} fontSize='1.75rem' />
              </Avatar>

              <Typography variant='h5' sx={{ mb: 1, fontWeight: 600 }}>
                {item.stats}
              </Typography>
              <Typography variant='body2' sx={{ color: 'text.secondary', fontWeight: 500 }}>
                {item.title}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default KpiCards
