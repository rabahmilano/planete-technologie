import { useState } from 'react'
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
  Paper
} from '@mui/material'
import Icon from 'src/@core/components/icon'

const ModalReouvrirVoyage = ({ open, onClose, onValidate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  return (
    <Dialog open={open} onClose={!isSubmitting ? onClose : undefined} maxWidth='md' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'warning.main' }}>
        <Icon icon='tabler:lock-open' fontSize='2rem' />
        Réouverture du Voyage
      </DialogTitle>

      <DialogContent sx={{ minHeight: 250 }}>
        <Alert severity='warning' sx={{ mb: 6, fontWeight: 600 }}>
          Attention : Vous êtes sur le point de réouvrir un dossier clôturé. Cette action effacera le coefficient
          d'approche actuel et déverrouillera toutes les modifications.
        </Alert>

        <Paper
          sx={{
            p: 4,
            backgroundColor: 'rgba(255, 159, 67, 0.04)',
            border: '1px solid #ffd1a3',
            borderRadius: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
            <Icon icon='tabler:info-circle' color='#ff9f43' fontSize='2.5rem' />
            <Box>
              <Typography variant='subtitle1' fontWeight={700} color='text.primary' sx={{ mb: 2 }}>
                Conséquences de la réouverture :
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Icon icon='tabler:point' size='1rem' />
                Le statut du dossier repassera à <strong>En Cours</strong>.
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Icon icon='tabler:point' size='1rem' />
                Le coefficient d'approche sera réinitialisé.
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon icon='tabler:point' size='1rem' />
                Les prix de revient TTC (réels) ne seront mis à jour que lors de la prochaine clôture.
              </Typography>
            </Box>
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 4 }}>
        <Button onClick={onClose} color='secondary' variant='outlined' disabled={isSubmitting}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          variant='contained'
          color='warning'
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} color='inherit' /> : <Icon icon='tabler:lock-open' />}
        >
          {isSubmitting ? 'Réouverture en cours...' : 'Confirmer la réouverture'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ModalReouvrirVoyage
