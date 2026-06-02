import { Grid, Typography } from '@mui/material'
import PageHeader from 'src/@core/components/page-header'
import { SortieExceptionnelleProvider } from 'src/context/SortieExceptionnelleContext'
import { ProduitProvider } from 'src/context/ProduitContext'
import SortiesExceptionnellesView from 'src/views/pages/produits/sortiesExceptionnelles'

const SortiesExceptionnellesPage = () => {
  return (
    <ProduitProvider>
      <SortieExceptionnelleProvider>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <PageHeader title={<Typography variant='h4'>Sorties Exceptionnelles</Typography>} />
          </Grid>

          <Grid item xs={12}>
            <SortiesExceptionnellesView />
          </Grid>
        </Grid>
      </SortieExceptionnelleProvider>
    </ProduitProvider>
  )
}

export default SortiesExceptionnellesPage
