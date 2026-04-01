import { Grid, Card, CardContent, Typography, Box, Avatar } from '@mui/material'
import Icon from 'src/@core/components/icon'
import { formatMontant } from 'src/@core/utils/format'

const CommandesKpis = ({ stats }) => {
  const kpiData = [
    {
      title: "Chiffre d'Affaires",
      value: `${formatMontant(stats?.totalCA || 0)} DA`,
      subtitle: `Global absolu : ${formatMontant(stats?.globalCA || 0)} DA`,
      icon: 'tabler:currency-dollar',
      color: 'success'
    },
    {
      title: 'Nombre de Commandes',
      value: stats?.totalCommandes || 0,
      subtitle: `Global absolu : ${stats?.globalCommandes || 0}`,
      icon: 'tabler:shopping-cart',
      color: 'primary'
    },
    {
      title: 'Articles Vendus',
      value: stats?.totalArticles || 0,
      subtitle: `Global absolu : ${stats?.globalArticles || 0}`,
      icon: 'tabler:package',
      color: 'info'
    },
    {
      title: 'Panier Moyen',
      value: `${formatMontant(stats?.panierMoyen || 0)} DA`,
      icon: 'tabler:chart-bar',
      color: 'warning'
    }
  ]

  return (
    <Grid container spacing={6}>
      {kpiData.map((item, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant='body2' sx={{ mb: 1, fontWeight: 600 }}>
                  {item.title}
                </Typography>
                <Typography variant='h5' sx={{ fontWeight: 'bold' }}>
                  {item.value}
                </Typography>
                {item.subtitle && (
                  <Typography variant='caption' sx={{ mt: 1, color: 'text.secondary' }}>
                    {item.subtitle}
                  </Typography>
                )}
              </Box>
              <Avatar
                variant='rounded'
                sx={{ width: 48, height: 48, backgroundColor: `${item.color}.main`, color: '#ffffff' }}
              >
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
