import { Grid, Card, CardContent, Typography, Avatar, Box } from '@mui/material'
import Icon from 'src/@core/components/icon'
import { formatMontant } from 'src/@core/utils/format'

const KpiCards = ({ stats }) => {
  return (
    <Card sx={{ height: '100%', bgcolor: 'transparent', boxShadow: 'none' }}>
      <Grid container spacing={4}>
        <Grid item xs={6}>
          <Card sx={{ height: '100%', boxShadow: 2 }}>
            <CardContent
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                p: '16px !important'
              }}
            >
              <Avatar variant='rounded' sx={{ mb: 2, width: 38, height: 38, bgcolor: 'primary.light' }}>
                <Icon icon='tabler:file-invoice' fontSize='1.25rem' color='white' />
              </Avatar>
              <Typography variant='h6'>{stats?.totalSorties || 0}</Typography>
              <Typography variant='caption' sx={{ color: 'text.disabled', lineHeight: 1.2 }}>
                Dossiers déclarés
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6}>
          <Card sx={{ height: '100%', boxShadow: 2 }}>
            <CardContent
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                p: '16px !important'
              }}
            >
              <Avatar variant='rounded' sx={{ mb: 2, width: 38, height: 38, bgcolor: 'error.light' }}>
                <Icon icon='tabler:trending-down' fontSize='1.25rem' color='white' />
              </Avatar>
              <Typography variant='h6'>
                {formatMontant(stats?.perteFinanciere || 0)}{' '}
                <Box component='span' sx={{ fontSize: '0.75rem' }}>
                  DA
                </Box>
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.disabled', lineHeight: 1.2 }}>
                Valeur d'achat (Perte)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6}>
          <Card sx={{ height: '100%', boxShadow: 2 }}>
            <CardContent
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                p: '16px !important'
              }}
            >
              <Avatar variant='rounded' sx={{ mb: 2, width: 38, height: 38, bgcolor: 'warning.light' }}>
                <Icon icon='tabler:clock-dollar' fontSize='1.25rem' color='white' />
              </Avatar>
              <Typography variant='h6'>
                {formatMontant(stats?.montantEnAttente || 0)}{' '}
                <Box component='span' sx={{ fontSize: '0.75rem' }}>
                  DA
                </Box>
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.disabled', lineHeight: 1.2 }}>
                Montant en attente
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6}>
          <Card sx={{ height: '100%', boxShadow: 2 }}>
            <CardContent
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                p: '16px !important'
              }}
            >
              <Avatar variant='rounded' sx={{ mb: 2, width: 38, height: 38, bgcolor: 'success.light' }}>
                <Icon icon='tabler:cash' fontSize='1.25rem' color='white' />
              </Avatar>
              <Typography variant='h6'>
                {formatMontant(stats?.montantRecupere || 0)}{' '}
                <Box component='span' sx={{ fontSize: '0.75rem' }}>
                  DA
                </Box>
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.disabled', lineHeight: 1.2 }}>
                Montant récupéré
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Card>
  )
}

export default KpiCards
