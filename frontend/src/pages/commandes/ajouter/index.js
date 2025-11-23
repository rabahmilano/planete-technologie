// ** MUI Imports
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import CardHeader from '@mui/material/CardHeader'
import PageHeader from 'src/@core/components/page-header'

import PasserCommande from 'src/views/pages/commandes/ajouter'

const Produits = () => {
  return (
    <Grid container spacing={5}>
      <PageHeader title={<Typography variant='h4'>Commande/ nouvelle</Typography>} />
      <Grid item xs={12}>
        <Card>
          <CardHeader title='Passer une commande'></CardHeader>
          <Divider sx={{ m: '0 !important' }} />
          <PasserCommande />
        </Card>
      </Grid>
    </Grid>
  )
}

export default Produits
