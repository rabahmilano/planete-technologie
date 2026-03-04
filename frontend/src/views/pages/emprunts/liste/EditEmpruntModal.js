import { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField, MenuItem, Box, CircularProgress } from '@mui/material'
import axios from 'axios'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

import { useCompte } from 'src/context/CompteContext'
import { useEmprunt } from 'src/context/EmpruntContext'

const EditEmpruntModal = ({ open, handleClose, emprunt }) => {
  const { comptes, fetchComptes } = useCompte()
  const { fetchEmprunts } = useEmprunt()

  const [loading, setLoading] = useState(false)

  // États du formulaire
  const [formData, setFormData] = useState({
    desEmprunt: '',
    montant: '',
    cpt: '',
    dateEmprunt: ''
  })

  // Charger les données quand l'emprunt change ou quand la modale s'ouvre
  useEffect(() => {
    if (emprunt && open) {
      setFormData({
        desEmprunt: emprunt.designation || '',
        montant: emprunt.montant_emprunt || '',
        cpt: emprunt.cpt_id || '',
        // On formate proprement la date pour l'input type="date"
        dateEmprunt: emprunt.date_emprunt ? dayjs(emprunt.date_emprunt).format('YYYY-MM-DD') : ''
      })
    }
  }, [emprunt, open])

  const handleSubmit = async () => {
    // Mini validation front-end
    if (!formData.desEmprunt || !formData.montant || !formData.cpt || !formData.dateEmprunt) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setLoading(true)
    try {
      await axios.put(`${process.env.NEXT_PUBLIC_BASE_URL}emprunts/${emprunt.id_emprunt}`, formData)
      toast.success('Emprunt mis à jour avec succès')
      
      // Rafraîchissement global
      await fetchEmprunts()
      await fetchComptes()
      
      handleClose()
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
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
                type='number'
                label='Montant (DZD)'
                value={formData.montant}
                onChange={e => setFormData({ ...formData, montant: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label='Compte ciblé'
                value={formData.cpt || ''} // Fallback de sécurité
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
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default EditEmpruntModal