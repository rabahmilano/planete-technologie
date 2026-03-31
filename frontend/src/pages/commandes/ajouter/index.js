import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import { CommandeProvider } from 'src/context/CommandeContext'
import PasserCommande from 'src/views/pages/commandes/ajouter'

const AjouterCommande = () => {
  return (
    <CommandeProvider>
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title={<Typography variant='h4'>Passer une commande</Typography>}
              subheader={<Typography variant='body2'>Création d'une nouvelle commande client</Typography>}
            />
          </Card>
        </Grid>

        <Grid item xs={12}>
          <PasserCommande />
        </Grid>
      </Grid>
    </CommandeProvider>
  )
}

export default AjouterCommande
