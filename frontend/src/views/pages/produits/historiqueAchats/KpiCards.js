import { Grid, Card, CardContent, Typography, Box } from '@mui/material'
import Icon from 'src/@core/components/icon'
import { formatMontant } from 'src/@core/utils/format'

const KpiCards = ({ stats }) => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
            <Icon icon='tabler:archive' fontSize='2.5rem' color='var(--mui-palette-primary-main)' />
            <Box sx={{ ml: 4 }}>
              <Typography variant='h5'>{stats.totalCount}</Typography>
              <Typography variant='body2'>Colis Trouvés</Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
            <Icon icon='tabler:packages' fontSize='2.5rem' color='var(--mui-palette-info-main)' />
            <Box sx={{ ml: 4 }}>
              <Typography variant='h5'>{stats.totalProduits}</Typography>
              <Typography variant='body2'>Produits Trouvés</Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
            <Icon icon='tabler:cash' fontSize='2.5rem' color='var(--mui-palette-success-main)' />
            <Box sx={{ ml: 4 }}>
              <Typography variant='h5'>{formatMontant(stats.totalValueDZD)} DA</Typography>
              <Typography variant='body2'>Valeur Totale</Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default KpiCards
