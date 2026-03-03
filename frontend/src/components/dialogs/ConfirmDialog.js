import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, IconButton } from '@mui/material'
import Icon from 'src/@core/components/icon'

// Dictionnaire sémantique des actions
const actionConfig = {
  create: { color: 'primary', icon: 'tabler:device-floppy', defaultTitle: 'Confirmer la création' },
  delete: { color: 'error', icon: 'tabler:trash', defaultTitle: 'Confirmer la suppression' },
  warning: { color: 'warning', icon: 'tabler:alert-triangle', defaultTitle: 'Attention' },
  info: { color: 'info', icon: 'tabler:info-circle', defaultTitle: 'Information' }
}

const ConfirmDialog = ({ 
  open, 
  handleClose, 
  handleConfirm, 
  title, 
  content, 
  confirmText = 'Confirmer', 
  cancelText = 'Annuler',
  actionType = 'warning' // Valeurs possibles : 'create', 'delete', 'warning', 'info'
}) => {
  const config = actionConfig[actionType] || actionConfig.warning

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          // Ligne de couleur en haut de la modale pour le contexte visuel
          borderTop: theme => `5px solid ${theme.palette[config.color].main}`
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 3, pt: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {/* Bloc d'icône coloré */}
          <Box sx={{ 
            display: 'flex', 
            p: 2, 
            borderRadius: 1, 
            backgroundColor: theme => theme.palette[config.color].light, 
            color: theme => theme.palette[config.color].main 
          }}>
            <Icon icon={config.icon} fontSize="1.75rem" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {title || config.defaultTitle}
          </Typography>
        </Box>
        <IconButton size='small' onClick={handleClose} aria-label='close' sx={{ alignSelf: 'flex-start' }}>
          <Icon icon='tabler:x' fontSize='1.25rem' />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ pb: 6, px: 6 }}>
        {content}
      </DialogContent>
      
      <DialogActions sx={{ px: 6, pb: 6, justifyContent: 'center', gap: 2 }}>
        <Button onClick={handleClose} color="secondary" variant="outlined" sx={{ px: 6 }}>
          {cancelText}
        </Button>
        <Button onClick={handleConfirm} color={config.color} variant="contained" sx={{ px: 6 }}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConfirmDialog