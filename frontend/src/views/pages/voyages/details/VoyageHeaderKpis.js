import { Card, CardContent, Grid, Typography, Box, Chip } from '@mui/material'
import Icon from 'src/@core/components/icon'
import dayjs from 'dayjs'

const VoyageHeaderKpis = ({ voyage }) => {
  const getStatusColor = statut => {
    switch (statut) {
      case 'EN_PREPARATION':
        return 'warning'
      case 'EN_COURS':
        return 'primary'
      case 'CLOTURE':
        return 'success'
      default:
        return 'secondary'
    }
  }

  const formatNumber = num =>
    parseFloat(num || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
      <CardContent>
        <Grid container spacing={4} alignItems='center'>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
              <Icon icon='tabler:plane' fontSize='2.5rem' color='#primary.main' />
              <Typography variant='h4'>{voyage.designation}</Typography>
              <Chip
                label={voyage.statut.replace('_', ' ')}
                color={getStatusColor(voyage.statut)}
                size='small'
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
            <Typography variant='body1' color='textSecondary' sx={{ mb: 1 }}>
              <Icon icon='tabler:map-pin' fontSize='1.1rem' style={{ verticalAlign: 'sub', marginRight: 4 }} />
              {voyage.destination || 'Destination non précisée'}
            </Typography>
            <Typography variant='body2' color='textSecondary'>
              <Icon icon='tabler:calendar-event' fontSize='1.1rem' style={{ verticalAlign: 'sub', marginRight: 4 }} />
              Du {dayjs(voyage.date_depart).format('DD/MM/YYYY')} au {dayjs(voyage.date_retour).format('DD/MM/YYYY')}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={4}>
                <Box
                  sx={{
                    p: 3,
                    backgroundColor: 'rgba(234, 84, 85, 0.1)',
                    borderRadius: 1,
                    border: '1px solid rgba(234, 84, 85, 0.2)'
                  }}
                >
                  <Typography variant='caption' color='error.main' sx={{ fontWeight: 600 }}>
                    FRAIS ANNEXES
                  </Typography>
                  <Typography variant='h6' sx={{ color: 'error.main', mt: 1 }}>
                    {formatNumber(voyage.kpis?.totalDepensesDZD)} DA
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box
                  sx={{
                    p: 3,
                    backgroundColor: 'rgba(40, 199, 111, 0.1)',
                    borderRadius: 1,
                    border: '1px solid rgba(40, 199, 111, 0.2)'
                  }}
                >
                  <Typography variant='caption' color='success.main' sx={{ fontWeight: 600 }}>
                    MARCHANDISES
                  </Typography>
                  <Typography variant='h6' sx={{ color: 'success.main', mt: 1 }}>
                    {formatNumber(voyage.kpis?.totalAchatsDZD)} DA
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box
                  sx={{
                    p: 3,
                    backgroundColor: 'rgba(115, 103, 240, 0.1)',
                    borderRadius: 1,
                    border: '1px solid rgba(115, 103, 240, 0.2)'
                  }}
                >
                  <Typography variant='caption' color='primary.main' sx={{ fontWeight: 600 }}>
                    COÛT DE REVIENT
                  </Typography>
                  <Typography variant='h6' sx={{ color: 'primary.main', mt: 1 }}>
                    {formatNumber(voyage.kpis?.coutTotalDZD)} DA
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            {voyage.statut === 'CLOTURE' && (
              <Box sx={{ mt: 3, textAlign: 'right' }}>
                <Typography variant='body2' color='textSecondary'>
                  Coefficient d'approche calculé : <strong>{parseFloat(voyage.coefficient_approche).toFixed(4)}</strong>
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default VoyageHeaderKpis
