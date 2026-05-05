import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import { useTheme } from '@mui/material/styles'
import Icon from 'src/@core/components/icon'
import { formatMontant } from 'src/@core/utils/format'
import { hexToRGBA } from 'src/@core/utils/hex-to-rgba'

const formatCompact = number => {
  return new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(number)
}

const KpiCards = ({ rollingData, globalStats }) => {
  const theme = useTheme()

  const actuel = rollingData?.actuel || { revenus: 0, sorties_globales: 0, marge: 0 }
  const precedent = rollingData?.precedent || { revenus: 0, sorties_globales: 0, marge: 0 }

  const colisCount = globalStats?.colis?.totalCount || 0
  const articlesCount = globalStats?.colis?.totalProduits || 0

  const calculateTrend = (current, previous, inverseColors = false) => {
    const change = previous === 0 ? (current === 0 ? 0 : 100) : ((current - previous) / previous) * 100
    const isPositive = change >= 0
    return {
      percent: Math.abs(change).toFixed(1),
      isGood: inverseColors ? !isPositive : isPositive,
      rawPrevious: previous,
      actualChange: change
    }
  }

  const kpis = [
    {
      title: "Chiffre d'Affaires (30J)",
      stats: `${formatMontant(actuel.revenus)} DA`,
      icon: 'tabler:currency-dollar',
      color: 'primary',
      trend: calculateTrend(actuel.revenus, precedent.revenus)
    },
    {
      title: 'Dépenses Globales (30J)',
      stats: `${formatMontant(actuel.sorties_globales)} DA`,
      icon: 'tabler:wallet',
      color: 'error',
      trend: calculateTrend(actuel.sorties_globales, precedent.sorties_globales, true)
    },
    {
      title: 'Marge Brute (30J)',
      stats: `${formatMontant(actuel.marge)} DA`,
      icon: 'tabler:chart-pie-2',
      color: 'success',
      trend: calculateTrend(actuel.marge, precedent.marge)
    },
    {
      title: 'Colis en Route',
      stats: `${colisCount} colis`,
      icon: 'tabler:truck',
      color: 'warning',
      trend: null,
      bottomText: `${articlesCount} articles`
    }
  ]

  return (
    <Grid container spacing={6} sx={{ height: '100%' }}>
      {kpis.map((item, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent
              sx={{
                display: 'flex',
                flexDirection: 'column',
                p: theme => `${theme.spacing(5)} !important`,
                height: '100%'
              }}
            >
              <Avatar
                variant='rounded'
                sx={{
                  mb: 3,
                  width: 44,
                  height: 44,
                  color: `${item.color}.main`,
                  backgroundColor: hexToRGBA(theme.palette[item.color].main, 0.16)
                }}
              >
                <Icon icon={item.icon} fontSize='1.75rem' />
              </Avatar>

              <Typography variant='h5' sx={{ mb: 0.5, fontWeight: 600 }}>
                {item.stats}
              </Typography>
              <Typography variant='body2' sx={{ color: 'text.secondary', fontWeight: 500, mb: 1.5 }}>
                {item.title}
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  columnGap: 1.5,
                  rowGap: 0.5,
                  width: '100%',
                  pt: 2,
                  mt: 'auto',
                  borderTop: `1px dashed ${theme.palette.divider}`
                }}
              >
                {item.trend ? (
                  <>
                    <Typography
                      variant='caption'
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 600,
                        color: item.trend.isGood ? 'success.main' : 'error.main',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Icon
                        icon={item.trend.actualChange >= 0 ? 'tabler:trending-up' : 'tabler:trending-down'}
                        fontSize='1rem'
                        style={{ marginRight: 4 }}
                      />
                      {item.trend.actualChange >= 0 ? '+' : '-'}
                      {item.trend.percent}%
                    </Typography>

                    <Typography
                      variant='caption'
                      sx={{
                        color: 'text.disabled',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      vs {formatCompact(item.trend.rawPrevious)} DA
                    </Typography>
                  </>
                ) : (
                  <Typography
                    variant='caption'
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Icon icon='tabler:box' fontSize='1rem' style={{ marginRight: 4 }} />
                    {item.bottomText}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default KpiCards
