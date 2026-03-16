import { Grid } from '@mui/material'

// Import de la Vue
import VoyageDetails from 'src/views/pages/voyages/details'

// Import des Providers métier selon ton architecture
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

// Injection des contextes
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
