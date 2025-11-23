import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import PageHeader from 'src/@core/components/page-header'
import { DepenseProvider } from 'src/context/DepenseContext'
import ListeDepensesView from 'src/views/pages/depenses/liste'

const MesDepensesPage = () => {
  return (
    <DepenseProvider>
      <Grid container spacing={6}>
        <PageHeader title={<Typography variant='h4'>Dépenses / Tableau de Bord</Typography>} />
        <Grid item xs={12}>
          <ListeDepensesView />
        </Grid>
      </Grid>
    </DepenseProvider>
  )
}

export default MesDepensesPage
