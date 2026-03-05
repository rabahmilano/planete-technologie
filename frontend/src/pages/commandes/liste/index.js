import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import PageHeader from 'src/@core/components/page-header'
import { CommandeProvider } from 'src/context/CommandeContext'
import ListeCommandesView from 'src/views/pages/commandes/liste'

const ListeCommandesPage = () => {
  return (
    <CommandeProvider>
      <Grid container spacing={6}>
        <PageHeader title={<Typography variant='h4'>Liste des Commandes</Typography>} />
        <Grid item xs={12}>
          <ListeCommandesView />
        </Grid>
      </Grid>
    </CommandeProvider>
  )
}

export default ListeCommandesPage