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
  CircularProgress
} from '@mui/material'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

import { useCompte } from 'src/context/CompteContext'
import { useEmprunt } from 'src/context/EmpruntContext'
import CleaveInput from 'src/components/CleaveInput'

const EditEmpruntModal = ({ open, handleClose, emprunt }) => {
  const { comptes, fetchComptes } = useCompte()
  const { modifierEmprunt } = useEmprunt()

  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    desEmprunt: '',
    montant: '',
    cpt: '',
    dateEmprunt: ''
  })

  useEffect(() => {
    if (emprunt && open) {
      setFormData({
        desEmprunt: emprunt.des_emprunt || '',
        montant: emprunt.mnt_emprunt || '',
        cpt: emprunt.cpt_id || '',
        dateEmprunt: emprunt.date_emprunt ? dayjs(emprunt.date_emprunt).format('YYYY-MM-DD') : ''
      })
    }
  }, [emprunt, open])

  const handleSubmit = async () => {
    if (!formData.desEmprunt || !formData.montant || !formData.cpt || !formData.dateEmprunt) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setLoading(true)

    const cleanMontant = parseFloat(formData.montant.toString().replace(/\s/g, ''))
    const dataToSend = {
      ...formData,
      montant: cleanMontant
    }

    const isSuccess = await modifierEmprunt(emprunt.id_emprunt, dataToSend)

    if (isSuccess) {
      await fetchComptes()
      handleClose()
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm'>
      <DialogTitle sx={{ borderBottom: '1px solid #eee', mb: 4 }}>Modifier l'emprunt</DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Désignation'
                value={formData.desEmprunt}
                onChange={e => setFormData({ ...formData, desEmprunt: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Montant'
                value={formData.montant}
                onChange={e => setFormData({ ...formData, montant: e.target.value })}
                InputProps={{
                  inputComponent: CleaveInput
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label='Compte ciblé'
                value={formData.cpt || ''}
                onChange={e => setFormData({ ...formData, cpt: e.target.value })}
              >
                {comptes.map(c => (
                  <MenuItem key={c.id_cpt} value={c.id_cpt}>
                    {c.designation_cpt}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type='date'
                label="Date d'emprunt"
                InputLabelProps={{ shrink: true }}
                value={formData.dateEmprunt}
                onChange={e => setFormData({ ...formData, dateEmprunt: e.target.value })}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 4 }}>
        <Button onClick={handleClose} color='secondary' variant='outlined' disabled={loading}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} variant='contained' disabled={loading}>
          {loading ? <CircularProgress size={24} color='inherit' /> : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default EditEmpruntModal
