import { useState, useEffect, useContext } from 'react'
import { useRouter } from 'next/router'
import { Grid, Box, CircularProgress, Card, CardContent, Typography, Button } from '@mui/material'

// Context
import { VoyageContext } from 'src/context/VoyageContext'

// Sous-composants
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
  const [loading, setLoading] = useState(true)
  const [openTransactionModal, setOpenTransactionModal] = useState(false)
  const [openDepenseModal, setOpenDepenseModal] = useState(false)

  const fetchDetails = async () => {
    if (id) {
      setLoading(true)
      const data = await getVoyageById(id)
      if (data) setVoyage(data)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetails()
  }, [id])

  if (loading) {
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
        <VoyageHeaderKpis voyage={voyage} />
      </Grid>

      <Grid item xs={12} md={7}>
        <TransactionsTable
          transactions={voyage.transactions}
          statut={voyage.statut}
          onAddFacture={() => setOpenTransactionModal(true)}
        />
      </Grid>

      <Grid item xs={12} md={5}>
        <Grid item xs={12} md={5}>
          <DepensesTable
            depenses={voyage.depenses}
            statut={voyage.statut}
            onAddFrais={() => setOpenDepenseModal(true)}
          />
        </Grid>
      </Grid>

      <AddTransactionModal
        open={openTransactionModal}
        handleClose={() => setOpenTransactionModal(false)}
        voyageId={id}
        deviseDest={voyage.devise_destination}
        onSuccess={fetchDetails}
      />

      <AddDepenseModal
        open={openDepenseModal}
        handleClose={() => setOpenDepenseModal(false)}
        voyageId={id}
        onSuccess={fetchDetails}
      />
    </Grid>
  )
}

export default VoyageDetails
