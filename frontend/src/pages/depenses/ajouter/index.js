// ** MUI Imports
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import PageHeader from 'src/@core/components/page-header'

import { DepenseProvider } from 'src/context/DepenseContext'

import NouvelleDepense from 'src/views/pages/depenses/ajouter'

const AjouterDepense = () => {
  return (
    <DepenseProvider>
      <Grid container spacing={6}>
        <PageHeader title={<Typography variant='h4'>Dépenses/nouvelle</Typography>} />

        <Grid item xs={12}>
          <NouvelleDepense />
        </Grid>
      </Grid>
    </DepenseProvider>
  )
}

export default AjouterDepense
