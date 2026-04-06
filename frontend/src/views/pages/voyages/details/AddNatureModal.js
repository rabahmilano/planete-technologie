import { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'
import CustomTextField from 'src/@core/components/mui/text-field'
import { useDepense } from 'src/context/DepenseContext'

const AddNatureModal = ({ open, onClose }) => {
  const { ajouterNatureDepense } = useDepense()
  const [newNatureName, setNewNatureName] = useState('')

  const handleSave = async () => {
    if (!newNatureName.trim()) return
    const success = await ajouterNatureDepense({ natDep: newNatureName.trim(), contexte: 'VOYAGE' })
    if (success) {
      setNewNatureName('')
      onClose()
    }
  }

  const handleCloseModal = () => {
    setNewNatureName('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleCloseModal} maxWidth='xs' fullWidth>
      <DialogTitle>Nouvelle Nature</DialogTitle>
      <DialogContent sx={{ pt: 4 }}>
        <CustomTextField
          fullWidth
          label='Nom de la nature'
          value={newNatureName}
          onChange={e => setNewNatureName(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseModal} color='secondary'>
          Annuler
        </Button>
        <Button onClick={handleSave} variant='contained' disabled={!newNatureName.trim()}>
          Créer
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddNatureModal
