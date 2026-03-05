import { Grid } from '@mui/material'

// Imports des contextes
import { EmpruntProvider, useEmprunt } from 'src/context/EmpruntContext'
import { CompteProvider } from 'src/context/CompteContext'

// Imports de tes Vues
import EmpruntsTable from 'src/views/pages/emprunts/liste/EmpruntsTable'
import EmpruntsChart from 'src/views/pages/emprunts/dashboard/EmpruntsChart'
import EmpruntsKpiGrid from 'src/views/pages/emprunts/dashboard/EmpruntsKpiGrid'
import EmpruntsActivite from 'src/views/pages/emprunts/dashboard/EmpruntsActivite'

const MesEmpruntsContent = () => {
  const { emprunts, loading } = useEmprunt()

  return (
    <Grid container spacing={6}>

      {/* --- LIGNE DU HAUT : TON DASHBOARD EXPERIMENTAL --- */}
      <Grid item xs={12} md={4}>
        <EmpruntsChart />
      </Grid>

      <Grid item xs={12} md={4}>
        <EmpruntsKpiGrid />
      </Grid>

      <Grid item xs={12} md={4}>
        <EmpruntsActivite />
      </Grid>

      {/* --- LIGNE DU BAS : LE TABLEAU --- */}
      <Grid item xs={12}>
        <EmpruntsTable loading={loading} emprunts={emprunts} />
      </Grid>

    </Grid>
  )
}

const EmpruntsPage = () => {
  return (
    <CompteProvider>
      <EmpruntProvider>
        <MesEmpruntsContent />
      </EmpruntProvider>
    </CompteProvider>
  )
}

export default EmpruntsPage