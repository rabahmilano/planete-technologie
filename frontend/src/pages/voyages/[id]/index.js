import { Grid } from '@mui/material'
import VoyageDetails from 'src/views/pages/voyages/details'
import { VoyageProvider } from 'src/context/VoyageContext'
import { CompteProvider } from 'src/context/CompteContext'
import { DepenseProvider } from 'src/context/DepenseContext'
import { ProduitProvider } from 'src/context/ProduitContext'

const VoyageDetailsPageContent = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <VoyageDetails />
      </Grid>
    </Grid>
  )
}

const VoyageDetailsPage = () => {
  return (
    <ProduitProvider>
      <DepenseProvider>
        <CompteProvider>
          <VoyageProvider>
            <VoyageDetailsPageContent />
          </VoyageProvider>
        </CompteProvider>
      </DepenseProvider>
    </ProduitProvider>
  )
}

export default VoyageDetailsPage
