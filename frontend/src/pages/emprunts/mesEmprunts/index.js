import { Grid } from '@mui/material'
import { EmpruntProvider, useEmprunt } from 'src/context/EmpruntContext'
import EmpruntsTable from 'src/views/pages/emprunts/liste/EmpruntsTable'


// Le composant qui utilise le context DOIT être à l'intérieur du Provider
const MesEmpruntsContent = () => {
  // On récupère les états depuis notre Context fraîchement créé
  const { emprunts, loading } = useEmprunt()

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <EmpruntsTable loading={loading} emprunts={emprunts} />
      </Grid>
    </Grid>
  )
}

const EmpruntsPage = () => {
  return (
    <EmpruntProvider>
      <MesEmpruntsContent />
    </EmpruntProvider>
  )
}

export default EmpruntsPage