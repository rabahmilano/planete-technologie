import { Grid } from '@mui/material'

import AjouterEmprunt from 'src/views/pages/emprunts/ajouter'
import KpiEmprunts from 'src/views/pages/emprunts/ajouter/KpiEmprunts'
import DerniersEmprunts from 'src/views/pages/emprunts/ajouter/DerniersEmprunts'

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
      <Grid item xs={12}>
        <DerniersEmprunts />
      </Grid>
    </Grid>
  )
}

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
