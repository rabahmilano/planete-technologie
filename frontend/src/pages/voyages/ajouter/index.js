import { Grid } from '@mui/material'
import AjouterVoyage from 'src/views/pages/voyages/ajouter'
import { VoyageProvider } from 'src/context/VoyageContext'
import { CompteProvider } from 'src/context/CompteContext'

const AjouterVoyageContent = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <AjouterVoyage />
      </Grid>
    </Grid>
  )
}

{
  /* ajouter DerniersVoyages ou KpiVoyages ici plus tard si tu besoin */
}

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
