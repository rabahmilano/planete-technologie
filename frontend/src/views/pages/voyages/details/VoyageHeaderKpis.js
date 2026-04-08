import { Card, CardContent, Grid, Typography, Box, Divider, Chip } from '@mui/material'
import Icon from 'src/@core/components/icon'
import dayjs from 'dayjs'
import { formatMontant } from 'src/@core/utils/format'
import { getStatusColor, getStatusLabel } from 'src/@core/utils/voyageUtils'

const VoyageHeaderKpis = ({ voyage }) => {
  if (!voyage) return null

  const { kpis } = voyage

  const coeffEstime = kpis?.totalAchatsDZD > 0 ? kpis.coutTotalDZD / kpis.totalAchatsDZD : 0

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 6 }}>
          <Box>
            <Typography variant='h5' sx={{ fontWeight: 700, color: 'text.primary', mb: 4 }}>
              {voyage.des_voyage}
            </Typography>
            <Box sx={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant='caption' color='textSecondary' sx={{ textTransform: 'uppercase' }}>
                  Destination
                </Typography>
                <Typography variant='body2' fontWeight={600}>
                  {voyage.dest_voyage || '--'}
                </Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='textSecondary' sx={{ textTransform: 'uppercase' }}>
                  Devise
                </Typography>
                <Typography variant='body2' fontWeight={600}>
                  {voyage.dev_dest}
                </Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='textSecondary' sx={{ textTransform: 'uppercase' }}>
                  Compte par défaut
                </Typography>
                <Typography variant='body2' fontWeight={600}>
                  {voyage.compte_defaut?.designation_cpt || 'Non défini'}
                </Typography>
              </Box>
              {voyage.statut_voy === 'CLOTURE' && voyage.coeff_approche ? (
                <Box>
                  <Typography
                    variant='caption'
                    color='success.main'
                    sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}
                  >
                    Coeff Final
                  </Typography>
                  <Typography variant='body2' color='success.main' fontWeight={700}>
                    {parseFloat(voyage.coeff_approche).toFixed(4)}
                  </Typography>
                </Box>
              ) : coeffEstime > 0 ? (
                <Box>
                  <Typography
                    variant='caption'
                    color='info.main'
                    sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}
                  >
                    Coeff Estimé
                  </Typography>
                  <Typography variant='body2' color='info.main' fontWeight={700}>
                    {coeffEstime.toFixed(4)}
                  </Typography>
                </Box>
              ) : null}
            </Box>
          </Box>
          <Chip
            label={getStatusLabel(voyage.statut_voy)}
            color={getStatusColor(voyage.statut_voy)}
            sx={{ fontWeight: 700, px: 2 }}
          />
        </Box>

        <Divider sx={{ mb: 6 }} />

        <Grid container spacing={4} sx={{ textAlign: 'center' }}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 4, borderRadius: 1, backgroundColor: 'rgba(0,0,0,0.02)' }}>
              <Typography
                variant='body2'
                color='textSecondary'
                sx={{ textTransform: 'uppercase', fontWeight: 600, mb: 1 }}
              >
                Total Achats (TTC)
              </Typography>
              <Typography variant='h6' color='text.primary' fontWeight={700}>
                {formatMontant(kpis?.totalAchatsDZD)} DZD
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 4, borderRadius: 1, backgroundColor: 'rgba(0,0,0,0.02)' }}>
              <Typography
                variant='body2'
                color='textSecondary'
                sx={{ textTransform: 'uppercase', fontWeight: 600, mb: 1 }}
              >
                Frais Annexes
              </Typography>
              <Typography variant='h6' color='error.main' fontWeight={700}>
                {formatMontant(kpis?.totalDepensesDZD)} DZD
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 4, borderRadius: 1, backgroundColor: 'rgba(0,0,0,0.02)' }}>
              <Typography
                variant='body2'
                color='textSecondary'
                sx={{ textTransform: 'uppercase', fontWeight: 600, mb: 1 }}
              >
                Frais Bancaires
              </Typography>
              <Typography variant='h6' color='info.main' fontWeight={700}>
                {formatMontant(kpis?.totalCommBanqueDZD + kpis?.totalCommPaieDZD)} DZD
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 4, borderRadius: 1, backgroundColor: 'rgba(40, 199, 111, 0.1)' }}>
              <Typography
                variant='body2'
                color='success.main'
                sx={{ textTransform: 'uppercase', fontWeight: 700, mb: 1 }}
              >
                Coût Global Estimé
              </Typography>
              <Typography variant='h5' color='success.main' fontWeight={800}>
                {formatMontant(kpis?.coutTotalDZD)} DZD
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default VoyageHeaderKpis
