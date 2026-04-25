import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Icon from 'src/@core/components/icon'
import Link from 'next/link'

const WelcomeCard = () => {
  return (
    <Card sx={{ height: '100%', width: '100%', position: 'relative', overflow: 'hidden', boxShadow: 3 }}>
      <CardContent
        sx={{
          p: theme => `${theme.spacing(6)} !important`,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'center',
          zIndex: 1,
          position: 'relative'
        }}
      >
        <Typography variant='h4' sx={{ mb: 2, fontWeight: 700, color: 'text.primary' }}>
          Planète Technologie
        </Typography>
        <Typography variant='body1' sx={{ mb: 6, color: 'text.secondary' }}>
          Bienvenue sur votre tableau de bord.
        </Typography>

        <Box sx={{ display: 'flex', gap: 3 }}>
          <Button
            component={Link}
            href='/commandes/ajouter'
            variant='contained'
            color='primary'
            startIcon={<Icon icon='tabler:shopping-cart-plus' />}
          >
            Vendre
          </Button>
          <Button
            component={Link}
            href='/produits/ajouter'
            variant='outlined'
            color='primary'
            startIcon={<Icon icon='tabler:box' />}
          >
            Acheter
          </Button>
        </Box>
      </CardContent>

      <Box
        sx={{
          position: 'absolute',
          bottom: -20,
          right: -20,
          opacity: 0.1,
          transform: 'rotate(-10deg)',
          pointerEvents: 'none'
        }}
      >
        <Icon icon='tabler:device-analytics' fontSize='140px' color='primary.main' />
      </Box>
    </Card>
  )
}

export default WelcomeCard
