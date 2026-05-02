import { Grid, Paper, Box, Typography, Chip } from '@mui/material'
import Icon from 'src/@core/components/icon'
import { formatMontant } from 'src/@core/utils/format'

const TransactionDetailKpis = ({ transaction }) => {
  if (!transaction) return null

  const devTrans = transaction.dev_trans
  const tauxTrans = parseFloat(transaction.taux_trans || 1)
  const totalFactureDevise = parseFloat(transaction.mnt_tot_fact || 0)

  const commBnk = parseFloat(transaction.mnt_comm_banque || 0)
  const commPaie = parseFloat(transaction.mnt_comm_paie || 0)
  const totalComm = commBnk + commPaie

  const totalFactureDZD = totalFactureDevise * tauxTrans
  const totalCommDZD = totalComm * tauxTrans
  const decaissementGlobalDZD = totalFactureDZD + totalCommDZD

  const devCarte = transaction.compte?.dev_code
  const tauxCarte = parseFloat(transaction.compte?.taux_change_actuel || 1)
  const totalPreleveCarte = devCarte ? decaissementGlobalDZD / tauxCarte : 0

  const nbLignes = transaction.colis_voyage?.length || 0
  const nbPieces = transaction.colis_voyage?.reduce((acc, item) => acc + (item.colis?.qte_achat || 0), 0) || 0

  return (
    <Grid container spacing={4} sx={{ mb: 6 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Paper
          sx={{
            p: 4,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderTop: '4px solid',
            borderColor: 'info.main',
            boxShadow: 3,
            borderRadius: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{ backgroundColor: 'rgba(0, 186, 209, 0.1)', p: 1, borderRadius: 1.5, display: 'flex' }}>
              <Icon icon='tabler:box-seam' color='#00bad1' />
            </Box>
            <Typography variant='caption' fontWeight={700} color='text.secondary' textTransform='uppercase'>
              Volume d'Articles
            </Typography>
          </Box>
          <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant='h5' fontWeight={700} color='info.main'>
              {nbLignes}{' '}
              <Typography component='span' variant='body1' fontWeight={600} color='text.secondary'>
                Produits
              </Typography>
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon='tabler:layers' color='#94a3b8' fontSize='1.1rem' />
              <Typography variant='body1' fontWeight={600} color='text.secondary'>
                {nbPieces} Unités
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Paper
          sx={{
            p: 4,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderTop: '4px solid',
            borderColor: '#7367F0',
            boxShadow: 3,
            borderRadius: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ backgroundColor: 'rgba(115, 103, 240, 0.1)', p: 1, borderRadius: 1.5, display: 'flex' }}>
                <Icon icon='tabler:file-invoice' color='#7367F0' />
              </Box>
              <Typography variant='caption' fontWeight={700} color='text.secondary' textTransform='uppercase'>
                Montant Facture
              </Typography>
            </Box>
            <Typography variant='caption' fontWeight={700} color='text.secondary'>
              1 {devTrans} ={' '}
              <Typography component='span' variant='caption' fontWeight={800} color='#7367F0'>
                {formatMontant(tauxTrans)} DA
              </Typography>
            </Typography>
          </Box>
          <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant='h5' fontWeight={700} sx={{ color: '#7367F0' }}>
              {formatMontant(totalFactureDevise)} {devTrans}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon='tabler:arrows-exchange' color='#94a3b8' fontSize='1.1rem' />
              <Typography variant='body1' fontWeight={600} color='text.secondary'>
                {formatMontant(totalFactureDZD)} DA
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Paper
          sx={{
            p: 4,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderTop: '4px solid',
            borderColor: 'warning.main',
            boxShadow: 3,
            borderRadius: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{ backgroundColor: 'rgba(255, 159, 67, 0.1)', p: 1, borderRadius: 1.5, display: 'flex' }}>
              <Icon icon='tabler:receipt-tax' color='#FF9F43' />
            </Box>
            <Typography variant='caption' fontWeight={700} color='text.secondary' textTransform='uppercase'>
              Commissions
            </Typography>
          </Box>
          <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Chip
                label={`Bnk: ${formatMontant(commBnk)}`}
                size='small'
                sx={{ backgroundColor: '#f8f9fa', color: '#475569', fontWeight: 600, borderRadius: 1 }}
              />
              <Chip
                label={`Paie: ${formatMontant(commPaie)}`}
                size='small'
                sx={{ backgroundColor: '#f8f9fa', color: '#475569', fontWeight: 600, borderRadius: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon='tabler:arrows-exchange' color='#94a3b8' fontSize='1.1rem' />
              <Typography variant='body1' fontWeight={700} color='warning.main'>
                {formatMontant(totalCommDZD)} DA
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Paper
          sx={{
            p: 4,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderTop: '4px solid',
            borderColor: '#475569',
            boxShadow: 3,
            borderRadius: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ backgroundColor: 'rgba(71, 85, 105, 0.1)', p: 1, borderRadius: 1.5, display: 'flex' }}>
                <Icon icon='tabler:credit-card' color='#475569' />
              </Box>
              <Typography variant='caption' fontWeight={700} color='text.secondary' textTransform='uppercase'>
                Total Prélevé
              </Typography>
            </Box>
            <Typography variant='caption' color='text.secondary' fontWeight={600}>
              {transaction.compte?.designation_cpt || 'Inconnu'}
            </Typography>
          </Box>
          <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Chip
                label={`${formatMontant(totalFactureDevise + totalComm)} ${devTrans}`}
                size='small'
                sx={{ backgroundColor: '#f1f5f9', color: '#1e293b', fontWeight: 700, borderRadius: 1 }}
              />
              {devCarte && devCarte !== devTrans && (
                <Chip
                  label={`${formatMontant(totalPreleveCarte)} ${devCarte}`}
                  size='small'
                  sx={{ backgroundColor: '#e2e8f0', color: '#1e293b', fontWeight: 700, borderRadius: 1 }}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon='tabler:arrows-exchange' color='#94a3b8' fontSize='1.1rem' />
              <Typography variant='h6' fontWeight={800} color='#1e293b'>
                {formatMontant(decaissementGlobalDZD)} DA
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  )
}

export default TransactionDetailKpis
