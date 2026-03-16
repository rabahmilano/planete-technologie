import { Grid } from '@mui/material'

// Import de la Vue
import VoyagesList from 'src/views/pages/voyages/liste'

// Import des Providers selon ton architecture
import { VoyageProvider } from 'src/context/VoyageContext'
import { CompteProvider } from 'src/context/CompteContext'

const VoyagesListPageContent = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <VoyagesList />
      </Grid>
    </Grid>
  )
}

// Injection des contextes
const VoyagesListPage = () => {
  return (
    <CompteProvider>
      <VoyageProvider>
        <VoyagesListPageContent />
      </VoyageProvider>
    </CompteProvider>
  )
}

export default VoyagesListPage
