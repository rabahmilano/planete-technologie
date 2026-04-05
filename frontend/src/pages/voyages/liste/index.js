import { Grid } from '@mui/material'
import VoyagesList from 'src/views/pages/voyages/liste'
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
