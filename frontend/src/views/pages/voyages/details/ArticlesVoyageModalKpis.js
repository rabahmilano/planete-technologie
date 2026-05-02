import { Grid, Paper, Box, Typography, Chip } from '@mui/material'
import Icon from 'src/@core/components/icon'
import { formatMontant } from 'src/@core/utils/format'

const ArticlesVoyageModalKpis = ({
  totalProduits,
  totalPieces,
  totalAchatsDA,
  totalsParDevise,
  totalCommBanqueDA,
  totalCommPaieDA,
  transactions
}) => {
  const devisesStats = {}
  const decaissementParTransDev = {}
  const decaissementParCarte = {}

  const factures = transactions?.filter(t => t.colis_voyage?.length > 0) || []

  factures.forEach(t => {
    const devTrans = t.dev_trans
    const devCarte = t.compte?.dev_code
    const tauxTrans = parseFloat(t.taux_trans || 1)
    const tauxCarte = parseFloat(t.compte?.taux_change_actuel || 1)

    // Initialisation des stats par devise de transaction
    if (!devisesStats[devTrans]) {
      devisesStats[devTrans] = { commBanque: 0, commPaie: 0 }
    }
    if (!decaissementParTransDev[devTrans]) {
      decaissementParTransDev[devTrans] = 0
    }

    let totalFactureDevise = 0
    t.colis_voyage.forEach(article => {
      totalFactureDevise += parseFloat(article.mnt_tot_dest || 0)
    })

    const commBnk = parseFloat(t.mnt_comm_banque || 0)
    const commPaie = parseFloat(t.mnt_comm_paie || 0)

    // Cumul Commissions
    devisesStats[devTrans].commBanque += commBnk
    devisesStats[devTrans].commPaie += commPaie

    // Cumul Décaissement Global en devise de transaction (ex: CNY)
    const totalDecaissementTrans = totalFactureDevise + commBnk + commPaie
    decaissementParTransDev[devTrans] += totalDecaissementTrans

    // Cumul Décaissement Global en devise de carte (ex: EUR)
    if (devCarte) {
      const totalTransDA = totalDecaissementTrans * tauxTrans
      if (!decaissementParCarte[devCarte]) decaissementParCarte[devCarte] = 0
      decaissementParCarte[devCarte] += totalTransDA / tauxCarte
    }
  })

  const decaissementGlobalDA = totalAchatsDA + totalCommBanqueDA + totalCommPaieDA

  return (
    <Grid container spacing={4} sx={{ mb: 6 }}>
      {/* KPI 1 : VOLUME D'ARTICLES */}
      <Grid item xs={12} sm={6} md={3}>
        <Paper
          sx={{
            p: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 2,
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <Box sx={{ backgroundColor: 'info.main', p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Icon icon='tabler:box-seam' color='white' fontSize='1.25rem' />
            <Typography
              variant='caption'
              color='white'
              fontWeight={700}
              textTransform='uppercase'
              sx={{ letterSpacing: '0.5px' }}
            >
              Articles & Quantités
            </Typography>
          </Box>
          <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant='body2' color='text.secondary' fontWeight={600}>
                Produits
              </Typography>
              <Typography variant='h6' fontWeight={700}>
                {totalProduits}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant='body2' color='text.secondary' fontWeight={600}>
                Unités totales
              </Typography>
              <Typography variant='h6' fontWeight={700} color='info.main'>
                {totalPieces}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>

      {/* KPI 2 : ACHATS MARCHANDISES */}
      <Grid item xs={12} sm={6} md={3}>
        <Paper
          sx={{
            p: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 2,
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <Box sx={{ backgroundColor: 'success.main', p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Icon icon='tabler:shopping-bag' color='white' fontSize='1.25rem' />
            <Typography
              variant='caption'
              color='white'
              fontWeight={700}
              textTransform='uppercase'
              sx={{ letterSpacing: '0.5px' }}
            >
              Achats Marchandises
            </Typography>
          </Box>
          <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
              {Object.entries(totalsParDevise).map(([devise, mnt]) => (
                <Chip
                  key={devise}
                  label={`${formatMontant(mnt)} ${devise}`}
                  size='small'
                  sx={{
                    backgroundColor: 'rgba(40, 199, 111, 0.1)',
                    color: 'success.main',
                    fontWeight: 600,
                    border: 'none'
                  }}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon='tabler:arrows-exchange' color='#64748b' fontSize='1.1rem' />
              <Typography variant='h6' fontWeight={700} color='success.main'>
                {formatMontant(totalAchatsDA)} DA
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>

      {/* KPI 3 : COMMISSIONS */}
      <Grid item xs={12} sm={6} md={3}>
        <Paper
          sx={{
            p: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 2,
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <Box sx={{ backgroundColor: 'warning.main', p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Icon icon='tabler:receipt-tax' color='white' fontSize='1.25rem' />
            <Typography
              variant='caption'
              color='white'
              fontWeight={700}
              textTransform='uppercase'
              sx={{ letterSpacing: '0.5px' }}
            >
              Commissions
            </Typography>
          </Box>
          <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
              {Object.entries(devisesStats).map(([devise, stats]) => (
                <Box key={devise} sx={{ display: 'flex', gap: 0.5, width: '100%' }}>
                  <Chip
                    label={`Bnk: ${formatMontant(stats.commBanque)} ${devise}`}
                    size='small'
                    sx={{
                      backgroundColor: 'rgba(255, 159, 67, 0.1)',
                      color: 'warning.main',
                      fontWeight: 600,
                      border: 'none',
                      flexGrow: 1
                    }}
                  />
                  <Chip
                    label={`Paie: ${formatMontant(stats.commPaie)} ${devise}`}
                    size='small'
                    sx={{
                      backgroundColor: 'rgba(255, 159, 67, 0.1)',
                      color: 'warning.main',
                      fontWeight: 600,
                      border: 'none',
                      flexGrow: 1
                    }}
                  />
                </Box>
              ))}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon='tabler:arrows-exchange' color='#64748b' fontSize='1.1rem' />
              <Typography variant='h6' fontWeight={700} color='warning.main'>
                {formatMontant(totalCommBanqueDA + totalCommPaieDA)} DA
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>

      {/* KPI 4 : DÉCAISSEMENT GLOBAL */}
      <Grid item xs={12} sm={6} md={3}>
        <Paper
          sx={{
            p: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 2,
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <Box sx={{ backgroundColor: '#475569', p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Icon icon='tabler:building-bank' color='white' fontSize='1.25rem' />
            <Typography
              variant='caption'
              color='white'
              fontWeight={700}
              textTransform='uppercase'
              sx={{ letterSpacing: '0.5px' }}
            >
              Décaissement Global
            </Typography>
          </Box>
          <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
              {/* Devise de la transaction (ex: CNY) */}
              {Object.entries(decaissementParTransDev).map(([devise, mnt]) => (
                <Chip
                  key={`trans-${devise}`}
                  label={`${formatMontant(mnt)} ${devise}`}
                  size='small'
                  sx={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 700, border: 'none' }}
                />
              ))}
              {/* Devise de la carte (ex: EUR) */}
              {Object.entries(decaissementParCarte).map(([devise, mnt]) => (
                <Chip
                  key={`carte-${devise}`}
                  label={`${formatMontant(mnt)} ${devise} (Carte)`}
                  size='small'
                  sx={{ backgroundColor: '#e2e8f0', color: '#1e293b', fontWeight: 700, border: 'none' }}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon='tabler:arrows-exchange' color='#64748b' fontSize='1.1rem' />
              <Typography variant='h6' fontWeight={800} color='#334155'>
                {formatMontant(decaissementGlobalDA)} DA
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  )
}

export default ArticlesVoyageModalKpis
