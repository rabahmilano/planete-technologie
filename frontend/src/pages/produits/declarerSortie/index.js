import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import PageHeader from 'src/@core/components/page-header'
import { ProduitProvider } from 'src/context/ProduitContext'
import { SortieExceptionnelleProvider } from 'src/context/SortieExceptionnelleContext'
import DeclarerSortieView from 'src/views/pages/produits/declarerSortie'

const DeclarerSortiePage = () => {
  return (
    <ProduitProvider>
      <SortieExceptionnelleProvider>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <PageHeader title={<Typography variant='h4'>Nouvelle Sortie</Typography>} />
          </Grid>

          <Grid item xs={12}>
            <DeclarerSortieView />
          </Grid>
        </Grid>
      </SortieExceptionnelleProvider>
    </ProduitProvider>
  )
}

export default DeclarerSortiePage
