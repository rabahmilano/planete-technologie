// ** MUI Imports
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import PageHeader from 'src/@core/components/page-header'

import { DeviseProvider } from 'src/context/DeviseContext'

import AjouterDevise from 'src/views/pages/settings/devises/AjouterDevise.js'
import TauxChange from 'src/views/pages/settings/devises/TauxChange.js'
import ListeDevises from 'src/views/pages/settings/devises/ListeDevise'

const Devises = () => {
  return (
    <DeviseProvider>
      <Grid container spacing={6}>
        <PageHeader title={<Typography variant='h4'>Setting/devises</Typography>} />
        <Grid item xs={12}>
          <AjouterDevise />
        </Grid>
        {/* <Grid item xs={12}>
          <TauxChange />
        </Grid> */}
        <Grid item xs={12}>
          <ListeDevises />
        </Grid>
      </Grid>
    </DeviseProvider>
  )
}

export default Devises
