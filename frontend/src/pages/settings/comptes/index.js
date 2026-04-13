import { useState } from 'react'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import PageHeader from 'src/@core/components/page-header'
import Icon from 'src/@core/components/icon'
import { CompteProvider } from 'src/context/CompteContext'
import { DeviseProvider } from 'src/context/DeviseContext'
import CreerCompte from 'src/views/pages/settings/comptes/CreerCompte.js'
import ListeComptes from 'src/views/pages/settings/comptes/ListeCompte.js'
import CrediterCompte from 'src/views/pages/settings/comptes/CrediterCompte.js'
import TransfertDrawer from 'src/views/pages/settings/comptes/TransfertDrawer'

const Comptes = () => {
  const [transfertOpen, setTransfertOpen] = useState(false)

  return (
    <CompteProvider>
      <DeviseProvider>
        <Grid container spacing={6}>
          <PageHeader
            title={<Typography variant='h4'>Paramètres / Comptes</Typography>}
            subtitle={
              <Box sx={{ mt: 2 }}>
                <Button
                  variant='contained'
                  startIcon={<Icon icon='tabler:arrows-transfer-down' />}
                  onClick={() => setTransfertOpen(true)}
                >
                  Nouveau Transfert
                </Button>
              </Box>
            }
          />

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

        <TransfertDrawer open={transfertOpen} toggle={() => setTransfertOpen(!transfertOpen)} />
      </DeviseProvider>
    </CompteProvider>
  )
}

export default Comptes
