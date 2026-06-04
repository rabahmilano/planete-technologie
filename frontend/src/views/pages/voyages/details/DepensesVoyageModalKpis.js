import { Grid, Paper, Box, Typography } from '@mui/material'
import Icon from 'src/@core/components/icon'
import { formatMontant } from 'src/@core/utils/format'

const DepensesVoyageModalKpis = ({
  totalEntries,
  totalNatures,
  topNatureName,
  topNatureMontant,
  totalsParDevise,
  totalDepensesDA
}) => {
  return (
    <Grid container spacing={4} sx={{ mb: 6 }}>
      {/* 1. COÛT TOTAL (Bleu) */}
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
            <Icon icon='tabler:receipt-tax' color='white' fontSize='1.25rem' />
            <Typography
              variant='caption'
              color='white'
              fontWeight={700}
              textTransform='uppercase'
              sx={{ letterSpacing: '0.5px' }}
            >
              Coût Total des Frais
            </Typography>
          </Box>
          <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant='body2' color='text.secondary' fontWeight={600} sx={{ mb: 1 }}>
              Équivalent Converti
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon='tabler:sum' color='info.main' fontSize='1.1rem' />
              <Typography variant='h6' fontWeight={800} color='text.primary'>
                {formatMontant(totalDepensesDA)} DA
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>

      {/* 2. VOLUME D'OPÉRATIONS (Gris Foncé) */}
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
            <Icon icon='tabler:list-numbers' color='white' fontSize='1.25rem' />
            <Typography
              variant='caption'
              color='white'
              fontWeight={700}
              textTransform='uppercase'
              sx={{ letterSpacing: '0.5px' }}
            >
              Volume des Opérations
            </Typography>
          </Box>
          <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant='body2' color='text.secondary' fontWeight={600}>
                Total Frais Saisis
              </Typography>
              <Typography variant='h6' fontWeight={700}>
                {totalEntries}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant='body2' color='text.secondary' fontWeight={600}>
                Catégories distinctes
              </Typography>
              <Typography variant='h6' fontWeight={700} sx={{ color: '#475569' }}>
                {totalNatures}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>

      {/* 3. CATÉGORIE PRINCIPALE (Vert) */}
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
            <Icon icon='tabler:award' color='white' fontSize='1.25rem' />
            <Typography
              variant='caption'
              color='white'
              fontWeight={700}
              textTransform='uppercase'
              sx={{ letterSpacing: '0.5px' }}
            >
              Poste le plus coûteux
            </Typography>
          </Box>
          <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography
              variant='body2'
              fontWeight={700}
              color='text.primary'
              sx={{
                mb: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {topNatureName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon='tabler:arrow-up-right' color='#28c76f' fontSize='1.1rem' />
              <Typography variant='h6' fontWeight={700} color='success.main'>
                {formatMontant(topNatureMontant)} DA
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>

      {/* 4. DÉTAIL PAR DEVISE (Orange) - Design minimaliste */}
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
            <Icon icon='tabler:coins' color='white' fontSize='1.25rem' />
            <Typography
              variant='caption'
              color='white'
              fontWeight={700}
              textTransform='uppercase'
              sx={{ letterSpacing: '0.5px' }}
            >
              Détail par Devise
            </Typography>
          </Box>
          <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {Object.keys(totalsParDevise).length === 0 ? (
              <Typography variant='body2' color='text.disabled'>
                Aucune dépense active
              </Typography>
            ) : (
              <Box
                sx={{
                  maxHeight: 60,
                  overflowY: 'auto',
                  pr: 1,
                  '&::-webkit-scrollbar': { width: '4px' },
                  '&::-webkit-scrollbar-thumb': { backgroundColor: '#cbd5e1', borderRadius: '4px' }
                }}
              >
                {Object.entries(totalsParDevise).map(([devise, mnt]) => (
                  <Box
                    key={devise}
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}
                  >
                    <Typography variant='caption' fontWeight={700} color='text.secondary'>
                      {devise}
                    </Typography>
                    <Typography variant='body2' fontWeight={800} color='text.primary'>
                      {formatMontant(mnt)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  )
}

export default DepensesVoyageModalKpis
