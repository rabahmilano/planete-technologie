import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, IconButton, CircularProgress } from '@mui/material'
import Icon from 'src/@core/components/icon'

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
  actionType = 'warning',
  loading = false,
  loadingText = 'Traitement en cours…'
}) => {
  const config = actionConfig[actionType] || actionConfig.warning

  return (
    <Dialog 
      open={open} 
      onClose={loading ? undefined : handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderTop: theme => `5px solid ${theme.palette[config.color].main}`
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 3, pt: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            p: 2, 
            borderRadius: 1, 
            backgroundColor: theme => theme.palette[config.color].main,
            color: '#ffffff'
          }}>
            <Icon icon={config.icon} fontSize="1.75rem" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {title || config.defaultTitle}
          </Typography>
        </Box>
        <IconButton size='small' onClick={handleClose} disabled={loading} aria-label='close' sx={{ alignSelf: 'flex-start' }}>
          <Icon icon='tabler:x' fontSize='1.25rem' />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ pb: 6, px: 6 }}>
        {content}
      </DialogContent>
      
      <DialogActions sx={{ px: 6, pb: 6, justifyContent: 'center', gap: 2 }}>
        <Button onClick={handleClose} disabled={loading} color="secondary" variant="outlined" sx={{ px: 6 }}>
          {cancelText}
        </Button>
        <Button onClick={handleConfirm} disabled={loading} color={config.color} variant="contained" sx={{ px: 6, minWidth: 150, gap: 2 }}>
          {loading && <CircularProgress size={18} color='inherit' />}
          {loading ? loadingText : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConfirmDialog