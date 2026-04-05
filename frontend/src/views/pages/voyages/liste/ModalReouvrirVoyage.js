import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button } from '@mui/material'
import Icon from 'src/@core/components/icon'

const ModalReouvrirVoyage = ({ open, onClose, onValidate }) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'warning.main' }}>
        <Icon icon='tabler:alert-triangle' fontSize='2rem' />
        Réouverture du voyage
      </DialogTitle>
      <DialogContent sx={{ minWidth: 400 }}>
        <Typography variant='body1' sx={{ mb: 2, fontWeight: 600 }}>
          Êtes-vous sûr de vouloir réouvrir ce voyage ?
        </Typography>
        <Typography variant='body2' color='textSecondary' sx={{ mb: 2 }}>
          La réouverture permet d'ajouter des dépenses ou des transactions oubliées.
        </Typography>
        <Typography variant='body2' color='textSecondary'>
          Attention : Les prix de revient TTC actuels de ce voyage resteront figés jusqu'à ce que vous le clôturiez à
          nouveau, moment où ils seront intégralement recalculés.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color='secondary'>
          Annuler
        </Button>
        <Button onClick={onValidate} variant='contained' color='warning'>
          Confirmer la réouverture
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ModalReouvrirVoyage
