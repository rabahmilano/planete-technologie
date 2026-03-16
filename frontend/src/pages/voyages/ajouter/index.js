import { Grid } from '@mui/material'

// Import de la Vue
import AjouterVoyage from 'src/views/pages/voyages/ajouter'

// Import des Providers selon ton architecture exacte
import { VoyageProvider } from 'src/context/VoyageContext'
import { CompteProvider } from 'src/context/CompteContext'

const AjouterVoyageContent = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <AjouterVoyage />
      </Grid>
      {/* Tu pourras ajouter DerniersVoyages ou KpiVoyages ici plus tard si tu en as besoin */}
    </Grid>
  )
}

// Injection des contextes locaux (Ton architecture)
const AjouterVoyagePage = () => {
  return (
    <CompteProvider>
      <VoyageProvider>
        <AjouterVoyageContent />
      </VoyageProvider>
    </CompteProvider>
  )
}

export default AjouterVoyagePage
