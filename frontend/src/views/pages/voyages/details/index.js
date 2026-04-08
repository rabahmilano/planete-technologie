import { useState, useEffect, useContext, useCallback } from 'react'
import { useRouter } from 'next/router'
import { Grid, Box, CircularProgress, Card, CardContent, Typography, Button } from '@mui/material'
import Icon from 'src/@core/components/icon'
import { VoyageContext } from 'src/context/VoyageContext'
import VoyageHeaderKpis from './VoyageHeaderKpis'
import TransactionsTable from './TransactionsTable'
import DepensesTable from './DepensesTable'
import AddTransactionModal from './AddTransactionModal'
import AddDepenseModal from './AddDepenseModal'

const VoyageDetails = () => {
  const router = useRouter()
  const { id } = router.query

  const { getVoyageById } = useContext(VoyageContext)

  const [voyage, setVoyage] = useState(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [openTransactionModal, setOpenTransactionModal] = useState(false)
  const [openDepenseModal, setOpenDepenseModal] = useState(false)

  const fetchDetails = useCallback(
    async (isSilentRefresh = false) => {
      if (id) {
        if (!isSilentRefresh) {
          setInitialLoading(true)
        }

        const data = await getVoyageById(id)
        if (data) setVoyage(data)

        if (!isSilentRefresh) {
          setInitialLoading(false)
        }
      }
    },
    [id, getVoyageById]
  )

  useEffect(() => {
    fetchDetails(false)
  }, [fetchDetails])

  const handleSilentRefresh = () => {
    fetchDetails(true)
  }

  if (initialLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!voyage) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 10 }}>
          <Typography variant='h5' color='error'>
            Dossier de voyage introuvable.
          </Typography>
          <Button variant='contained' sx={{ mt: 4 }} onClick={() => router.push('/voyages/liste')}>
            Retour à la liste
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Button
          size='small'
          startIcon={<Icon icon='tabler:arrow-left' />}
          onClick={() => router.push('/voyages/liste')}
          sx={{ mb: 4 }}
        >
          Retour à la liste
        </Button>
      </Grid>

      <Grid item xs={12}>
        <VoyageHeaderKpis voyage={voyage} />
      </Grid>

      <Grid item xs={12} md={7}>
        <TransactionsTable
          transactions={voyage.transactions}
          statut={voyage.statut_voy}
          onAddFacture={() => setOpenTransactionModal(true)}
        />
      </Grid>

      <Grid item xs={12} md={5}>
        <DepensesTable
          depenses={voyage.depenses}
          statut={voyage.statut_voy}
          onAddFrais={() => setOpenDepenseModal(true)}
        />
      </Grid>

      <AddTransactionModal
        open={openTransactionModal}
        handleClose={() => setOpenTransactionModal(false)}
        voyage={voyage}
        onSuccess={handleSilentRefresh}
      />

      <AddDepenseModal
        open={openDepenseModal}
        handleClose={() => setOpenDepenseModal(false)}
        voyageId={id}
        onSuccess={handleSilentRefresh}
      />
    </Grid>
  )
}

export default VoyageDetails
