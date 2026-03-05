import { Grid, Card, CardContent, Typography, Box, Avatar } from '@mui/material'
import Icon from 'src/@core/components/icon'

const CommandesKpis = ({ stats }) => {
  const kpiData = [
    {
      title: "Chiffre d'Affaires Global",
      value: `${parseFloat(stats?.totalCA || 0).toLocaleString('fr-DZ')} DZD`,
      icon: 'tabler:currency-dollar',
      color: 'success'
    },
    {
      title: 'Nombre de Commandes',
      value: stats?.totalCommandes || 0,
      icon: 'tabler:shopping-cart',
      color: 'primary'
    },
    {
      title: 'Panier Moyen',
      value: `${parseFloat(stats?.panierMoyen || 0).toLocaleString('fr-DZ')} DZD`,
      icon: 'tabler:chart-bar',
      color: 'warning'
    }
  ]

  return (
    <Grid container spacing={6}>
      {kpiData.map((item, index) => (
        <Grid item xs={12} sm={4} key={index}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant='body2' sx={{ mb: 1, fontWeight: 600 }}>{item.title}</Typography>
                <Typography variant='h5' sx={{ fontWeight: 'bold' }}>{item.value}</Typography>
              </Box>
              <Avatar variant='rounded' sx={{ width: 48, height: 48, backgroundColor: `${item.color}.light`, color: `${item.color}.main` }}>
                <Icon icon={item.icon} fontSize='1.75rem' />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default CommandesKpis