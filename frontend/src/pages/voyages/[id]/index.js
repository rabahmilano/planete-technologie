import { Grid } from '@mui/material'
import VoyageDetails from 'src/views/pages/voyages/details'
import { VoyageProvider } from 'src/context/VoyageContext'
import { CompteProvider } from 'src/context/CompteContext'

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
    <CompteProvider>
      <VoyageProvider>
        <VoyageDetailsPageContent />
      </VoyageProvider>
    </CompteProvider>
  )
}

export default VoyageDetailsPage
