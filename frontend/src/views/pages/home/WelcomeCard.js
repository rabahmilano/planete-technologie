import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'
import { formatMontant } from 'src/@core/utils/format'
import Icon from 'src/@core/components/icon'
import Link from 'next/link'

const WelcomeCard = ({ data }) => {
  const theme = useTheme()
  const ca = data?.chiffreAffaires || 0

  return (
    <Card sx={{ position: 'relative', overflow: 'visible', height: '100%', boxShadow: 4 }}>
      <CardContent sx={{ p: theme => `${theme.spacing(6.75, 7.5)} !important` }}>
        <Grid container spacing={6}>
          <Grid item xs={12} sm={8}>
            <Typography variant='h5' sx={{ mb: 1.5, fontWeight: 600, color: 'primary.main' }}>
              Tableau de bord PTech 🚀
            </Typography>
            <Typography variant='body2' sx={{ mb: 4, color: 'text.secondary' }}>
              Aperçu immédiat de votre trésorerie et de l'état de votre stock. Vous avez généré un chiffre d'affaires
              total de :
            </Typography>

            <Typography variant='h3' sx={{ fontWeight: 700, color: 'text.primary', mb: 4 }}>
              {formatMontant(ca)}{' '}
              <Typography component='span' variant='h5' color='text.secondary'>
                DZD
              </Typography>
            </Typography>

            <Box sx={{ display: 'flex', gap: 3 }}>
              <Button
                component={Link}
                href='/commandes/ajouter'
                variant='contained'
                startIcon={<Icon icon='tabler:shopping-cart-plus' />}
              >
                Vendre
              </Button>
              <Button
                component={Link}
                href='/produits/ajouter'
                variant='tonal'
                color='secondary'
                startIcon={<Icon icon='tabler:box' />}
              >
                Acheter
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12} sm={4} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {/* L'icône géante en fond qui donne l'esprit Vuexy */}
            <Box
              sx={{
                backgroundColor: 'primary.light',
                borderRadius: '50%',
                p: 4,
                display: 'flex',
                opacity: 0.15,
                position: 'absolute',
                right: 30
              }}
            >
              <Icon icon='tabler:device-analytics' fontSize='8rem' color={theme.palette.primary.main} />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default WelcomeCard
