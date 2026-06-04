import { useState, useEffect, useContext } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Alert,
  Box,
  CircularProgress,
  Grid,
  Paper
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import { VoyageContext } from 'src/context/VoyageContext'
import { formatMontant } from 'src/@core/utils/format'

const ModalCloturerVoyage = ({ open, onClose, onValidate, voyageId }) => {
  const { getVoyageById } = useContext(VoyageContext)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [details, setDetails] = useState(null)

  useEffect(() => {
    const fetchDetails = async () => {
      if (open && voyageId) {
        setLoading(true)
        const data = await getVoyageById(voyageId)
        setDetails(data)
        setLoading(false)
      }
    }
    fetchDetails()
  }, [open, voyageId, getVoyageById])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onValidate()
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  let totalDepenses = 0
  let totalAchatsPurs = 0
  let totalCommissions = 0

  if (details) {
    details.depenses?.forEach(d => {
      if (!d.isAnnule) totalDepenses += parseFloat(d.mnt_dep_dzd || 0)
    })

    details.transactions?.forEach(t => {
      const taux = parseFloat(t.taux_trans || 1)
      totalAchatsPurs += parseFloat(t.mnt_tot_fact || 0) * taux
      totalCommissions += (parseFloat(t.mnt_comm_paie || 0) + parseFloat(t.mnt_comm_banque || 0)) * taux
    })
  }

  const coutGlobal = totalAchatsPurs + totalCommissions + totalDepenses
  const coeffFinal = totalAchatsPurs > 0 ? coutGlobal / totalAchatsPurs : 1

  return (
    <Dialog open={open} onClose={!loading && !isSubmitting ? onClose : undefined} maxWidth='md' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'error.main' }}>
        <Icon icon='tabler:lock' fontSize='2rem' />
        Clôture Définitive du Voyage
      </DialogTitle>

      <DialogContent sx={{ minHeight: 250 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Alert severity='error' sx={{ mb: 6, fontWeight: 600 }}>
              Attention : La clôture d'un voyage fige toutes ses données. Aucune facture, dépense ou modification ne
              pourra être ajoutée par la suite. Les prix de revient de vos marchandises seront calculés sur la base de
              ce bilan.
            </Alert>

            <Grid container spacing={4} sx={{ mb: 6 }}>
              <Grid item xs={12} sm={4}>
                <Paper
                  sx={{
                    p: 4,
                    height: '100%',
                    backgroundColor: 'rgba(15, 23, 42, 0.04)',
                    border: '1px solid #e2e8f0',
                    borderRadius: 2
                  }}
                >
                  <Typography variant='caption' color='text.secondary' fontWeight={700} textTransform='uppercase'>
                    Achats Marchandises
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Icon icon='tabler:shopping-cart' color='#64748b' />
                    <Typography variant='h6' fontWeight={700}>
                      {formatMontant(totalAchatsPurs)} DA
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Paper
                  sx={{
                    p: 4,
                    height: '100%',
                    backgroundColor: 'rgba(255, 159, 67, 0.04)',
                    border: '1px solid #ffd1a3',
                    borderRadius: 2
                  }}
                >
                  <Typography variant='caption' color='warning.main' fontWeight={700} textTransform='uppercase'>
                    Commissions (Bnk & Paie)
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Icon icon='tabler:building-bank' color='#ff9f43' />
                    <Typography variant='h6' fontWeight={700} color='warning.main'>
                      {formatMontant(totalCommissions)} DA
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Paper
                  sx={{
                    p: 4,
                    height: '100%',
                    backgroundColor: 'rgba(234, 84, 85, 0.04)',
                    border: '1px solid #ffb5b6',
                    borderRadius: 2
                  }}
                >
                  <Typography variant='caption' color='error.main' fontWeight={700} textTransform='uppercase'>
                    Total Frais Annexes
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Icon icon='tabler:receipt-tax' color='#ea5455' />
                    <Typography variant='h6' fontWeight={700} color='error.main'>
                      {formatMontant(totalDepenses)} DA
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            <Box
              sx={{
                backgroundColor: '#0d1b2a',
                p: 4,
                borderRadius: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Box>
                <Typography variant='body2' color='rgba(255, 255, 255, 0.7)' fontWeight={600}>
                  Coefficient d'approche final généré
                </Typography>
                <Typography variant='caption' color='rgba(255, 255, 255, 0.5)'>
                  (Achats + Commissions + Frais) / Achats
                </Typography>
              </Box>
              <Typography variant='h4' color='success.main' fontWeight={800}>
                {coeffFinal.toFixed(4)}
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 4 }}>
        <Button onClick={onClose} color='secondary' variant='outlined' disabled={loading || isSubmitting}>
          Annuler et retourner au dossier
        </Button>
        <Button
          onClick={handleSubmit}
          variant='contained'
          color='error'
          disabled={loading || isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} color='inherit' /> : <Icon icon='tabler:lock' />}
        >
          {isSubmitting ? 'Clôture en cours...' : 'Confirmer et Clôturer le Voyage'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ModalCloturerVoyage
