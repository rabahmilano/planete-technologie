import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  MenuItem,
  Box,
  CircularProgress,
  Typography
} from '@mui/material'
import toast from 'react-hot-toast'
import { useDepense } from 'src/context/DepenseContext'
import { formatMontant } from 'src/@core/utils/format'

const EditDepenseModal = ({ open, handleClose, depense, naturesList, refreshData }) => {
  const [loading, setLoading] = useState(false)
  const { modifierDepense } = useDepense()

  const [formData, setFormData] = useState({
    nature: '',
    observation: ''
  })

  useEffect(() => {
    if (depense && open) {
      const natureObj = naturesList.find(n => n.designation_nat_dep === depense.nature)

      setFormData({
        nature: natureObj ? natureObj.id_nat_dep : '',
        observation: depense.observation || ''
      })
    }
  }, [depense, open, naturesList])

  const handleSubmit = async () => {
    if (!formData.nature) {
      toast.error('Veuillez sélectionner une nature de dépense')
      return
    }

    setLoading(true)

    const idStr = depense.id.replace('d-', '')
    const isSuccess = await modifierDepense(idStr, formData)

    if (isSuccess) {
      if (refreshData) refreshData()
      handleClose()
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm'>
      <DialogTitle sx={{ borderBottom: '1px solid #eee', mb: 4 }}>Modifier la dépense</DialogTitle>

      <DialogContent>
        {depense && (
          <Box sx={{ mb: 6, p: 3, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 1 }}>
            <Typography variant='body2' color='textSecondary'>
              Montant (Non modifiable) :
            </Typography>
            <Typography variant='subtitle1' fontWeight='bold' sx={{ color: 'error.main' }}>
              {formatMontant(depense.montant)} DZD
            </Typography>
            <Typography variant='caption' color='textSecondary'>
              Pour des raisons de sécurité comptable, le montant et la date ne peuvent pas être modifiés. En cas
              d'erreur de saisie, veuillez annuler la dépense.
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 2 }}>
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label='Nature de la dépense'
                value={formData.nature || ''}
                onChange={e => setFormData({ ...formData, nature: e.target.value })}
              >
                {naturesList.map(n => (
                  <MenuItem key={n.id_nat_dep} value={n.id_nat_dep}>
                    {n.designation_nat_dep}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label='Observation (Optionnel)'
                placeholder='Ex: Facture N°123, Fournisseur X...'
                value={formData.observation}
                onChange={e => setFormData({ ...formData, observation: e.target.value })}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 4 }}>
        <Button onClick={handleClose} color='secondary' variant='outlined' disabled={loading}>
          Fermer
        </Button>
        <Button onClick={handleSubmit} variant='contained' disabled={loading}>
          {loading ? <CircularProgress size={24} color='inherit' /> : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default EditDepenseModal
