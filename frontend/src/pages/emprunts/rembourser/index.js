import { Grid } from '@mui/material'

import RembourserEmprunt from 'src/views/pages/emprunts/rembourser'
import KpiEmprunts from 'src/views/pages/emprunts/ajouter/KpiEmprunts'
import DerniersRemboursements from 'src/views/pages/emprunts/rembourser/DerniersRemboursements'

import { EmpruntProvider } from 'src/context/EmpruntContext'
import { CompteProvider } from 'src/context/CompteContext'

const RembourserEmpruntContent = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <KpiEmprunts />
      </Grid>
      <Grid item xs={12}>
        <RembourserEmprunt />
      </Grid>
      <Grid item xs={12}>
        <DerniersRemboursements />
      </Grid>
    </Grid>
  )
}

const RembourserEmpruntPage = () => {
  return (
    <CompteProvider>
      <EmpruntProvider>
        <RembourserEmpruntContent />
      </EmpruntProvider>
    </CompteProvider>
  )
}

export default RembourserEmpruntPage
