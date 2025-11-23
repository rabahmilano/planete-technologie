import { Grid, Card, CardContent, Typography, Box } from '@mui/material'
import Icon from 'src/@core/components/icon'

const StatCard = ({ title, value, icon, color }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ p: 2, borderRadius: '50%', backgroundColor: `${color}.lightest`, mr: 4 }}>
          <Icon icon={icon} style={{ color: `var(--mui-palette-${color}-main)` }} />
        </Box>
        <Box>
          <Typography variant='body2'>{title}</Typography>
          <Typography variant='h5' sx={{ fontWeight: 'bold' }}>
            {parseFloat(value || 0).toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
          </Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
)

const GlobalStats = ({ stats }) => (
  // MISE À JOUR: La grille affiche maintenant 3 cartes
  <Grid container spacing={6}>
    <Grid item xs={12} md={4}>
      <StatCard
        title='Dépenses Opérationnelles (Global)'
        value={stats.totalDepenses}
        icon='tabler:cash'
        color='error'
      />
    </Grid>
    <Grid item xs={12} md={4}>
      <StatCard
        title='Droits de Timbre (Colis Global)'
        value={stats.totalDroitsTimbreColis}
        icon='tabler:stamp'
        color='warning'
      />
    </Grid>
    <Grid item xs={12} md={4}>
      <StatCard
        title='Total Épargné (Coffre Fort Global)'
        value={stats.totalEpargne}
        icon='tabler:pig-money'
        color='success'
      />
    </Grid>
  </Grid>
)

export default GlobalStats
