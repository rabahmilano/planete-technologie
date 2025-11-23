// ** MUI Imports
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import PageHeader from 'src/@core/components/page-header'

import { CompteProvider } from 'src/context/CompteContext'

import CreerCompte from 'src/views/pages/settings/comptes/CreerCompte.js'
import ListeComptes from 'src/views/pages/settings/comptes/ListeCompte.js'
import CrediterCompte from 'src/views/pages/settings/comptes/CrediterCompte.js'

const Comptes = () => {
  return (
    <CompteProvider>
      <Grid container spacing={6}>
        <PageHeader title={<Typography variant='h4'>Setting/comptes</Typography>} />
        <Grid item xs={12}>
          <CreerCompte />
        </Grid>

        <Grid item xs={12}>
          <CrediterCompte />
        </Grid>

        <Grid item xs={12}>
          <ListeComptes />
        </Grid>
      </Grid>
    </CompteProvider>
  )
}

export default Comptes
