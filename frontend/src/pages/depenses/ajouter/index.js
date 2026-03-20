// ** MUI Imports
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import PageHeader from 'src/@core/components/page-header'

// ** Context Imports
import { DepenseProvider } from 'src/context/DepenseContext'
import { CompteProvider } from 'src/context/CompteContext' // <-- 1. IMPORTER LE COMPTE PROVIDER

import NouvelleDepense from 'src/views/pages/depenses/ajouter'

const AjouterDepense = () => {
  return (
    <CompteProvider>
      {' '}
      {/* <-- 2. ENVELOPPER LE TOUT AVEC LE COMPTE PROVIDER */}
      <DepenseProvider>
        <Grid container spacing={6}>
          <PageHeader title={<Typography variant='h4'>Dépenses/nouvelle</Typography>} />

          <Grid item xs={12}>
            <NouvelleDepense />
          </Grid>
        </Grid>
      </DepenseProvider>
    </CompteProvider>
  )
}

export default AjouterDepense
