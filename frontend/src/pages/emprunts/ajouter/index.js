import { Grid } from '@mui/material'

// Import des Vues
import AjouterEmprunt from 'src/views/pages/emprunts/ajouter'
import KpiEmprunts from 'src/views/pages/emprunts/ajouter/KpiEmprunts'

// Import des Providers
import { EmpruntProvider } from 'src/context/EmpruntContext'
import { CompteProvider } from 'src/context/CompteContext'

const AjouterEmpruntContent = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <KpiEmprunts />
      </Grid>
      <Grid item xs={12}>
        <AjouterEmprunt />
      </Grid>
    </Grid>
  )
}

// Injection des contextes pour que les KPIs et le formulaire communiquent
const AjouterEmpruntPage = () => {
  return (
    <CompteProvider>
      <EmpruntProvider>
        <AjouterEmpruntContent />
      </EmpruntProvider>
    </CompteProvider>
  )
}

export default AjouterEmpruntPage