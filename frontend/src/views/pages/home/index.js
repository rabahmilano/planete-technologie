import Grid from '@mui/material/Grid'
import TransactionsChart from './TransactionsChart'
import ProduitsChart from './ProduitsChart'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

const HomeView = () => {
  return (
    <Grid container spacing={6}>
      {/* Carte de bienvenue */}
      <Grid item xs={12}>
        <Card>
          <CardHeader title='Bienvenue sur Web Shop It 🚀'></CardHeader>
          <CardContent>
            <Typography>
              Utilisez le menu de navigation sur la gauche pour gérer vos produits, commandes et dépenses.
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Graphique pour les transactions (Colis vs Commandes) */}
      <Grid item xs={12}>
        <TransactionsChart />
      </Grid>

      {/* Graphique pour les quantités de produits */}
      <Grid item xs={12}>
        <ProduitsChart />
      </Grid>
    </Grid>
  )
}

export default HomeView
