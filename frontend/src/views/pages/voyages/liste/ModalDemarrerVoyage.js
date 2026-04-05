import { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button } from '@mui/material'
import CustomTextField from 'src/@core/components/mui/text-field'

const ModalDemarrerVoyage = ({ open, onClose, onValidate, deviseDest }) => {
  const [tauxSaisi, setTauxSaisi] = useState('')

  const handleValidate = () => {
    if (!tauxSaisi || isNaN(tauxSaisi) || parseFloat(tauxSaisi) <= 0) return
    onValidate(parseFloat(tauxSaisi))
    setTauxSaisi('')
  }

  const handleClose = () => {
    setTauxSaisi('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Démarrer le voyage</DialogTitle>
      <DialogContent sx={{ minWidth: 400 }}>
        <Typography variant='body2' sx={{ mb: 4 }}>
          Pour passer ce voyage "En Cours", veuillez saisir le taux de change prévisionnel de la devise de destination (
          {deviseDest}).
        </Typography>
        <CustomTextField
          fullWidth
          type='number'
          label={`Taux de change (1 ${deviseDest} = ? DZD)`}
          value={tauxSaisi}
          onChange={e => setTauxSaisi(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color='secondary'>
          Annuler
        </Button>
        <Button onClick={handleValidate} variant='contained' disabled={!tauxSaisi}>
          Valider
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ModalDemarrerVoyage
