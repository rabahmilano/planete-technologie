// ** MUI Imports
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import CardHeader from '@mui/material/CardHeader'
import PageHeader from 'src/@core/components/page-header'

import { ProduitProvider } from 'src/context/ProduitContext'

import AjouterProduit from 'src/views/pages/produits/ajouter'

const Produits = () => {
  return (
    <ProduitProvider>
      <Grid container spacing={5}>
        <PageHeader title={<Typography variant='h4'>Produit/nouveau</Typography>} />
        <Grid item xs={12}>
          <Card>
            <CardHeader title='Ajouter un nouveau produit'></CardHeader>
            <Divider sx={{ m: '0 !important' }} />
            <AjouterProduit />
          </Card>
        </Grid>
      </Grid>
    </ProduitProvider>
  )
}

export default Produits
