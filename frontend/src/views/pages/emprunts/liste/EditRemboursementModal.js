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
import dayjs from 'dayjs'

import { useCompte } from 'src/context/CompteContext'
import { useEmprunt } from 'src/context/EmpruntContext'
import CleaveInput from 'src/components/CleaveInput'

const EditRemboursementModal = ({ open, handleClose, remboursement, empruntParent }) => {
  const { comptes, fetchComptes } = useCompte()
  const { modifierRemboursement } = useEmprunt()

  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    mntRembourse: '',
    cptCible: '',
    dateRembourse: ''
  })

  const devise = empruntParent?.compte?.dev_code || 'DZD'

  useEffect(() => {
    if (remboursement && open) {
      setFormData({
        mntRembourse: remboursement.mnt_remb || '',
        cptCible: remboursement.cpt_remb || '',
        dateRembourse: remboursement.date_remb ? dayjs(remboursement.date_remb).format('YYYY-MM-DD') : ''
      })
    }
  }, [remboursement, open])

  const handleSubmit = async () => {
    if (!formData.mntRembourse || !formData.cptCible || !formData.dateRembourse) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setLoading(true)

    const cleanMontant = parseFloat(formData.mntRembourse.toString().replace(/\s/g, ''))
    const dataToSend = {
      ...formData,
      mntRembourse: cleanMontant
    }

    const isSuccess = await modifierRemboursement(remboursement.id_remb, dataToSend)

    if (isSuccess) {
      await fetchComptes()
      handleClose()
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm'>
      <DialogTitle sx={{ borderBottom: '1px solid #eee', mb: 4 }}>Corriger un remboursement</DialogTitle>

      <DialogContent>
        {empruntParent && (
          <Box sx={{ mb: 4, p: 3, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 1 }}>
            <Typography variant='body2' color='textSecondary'>
              Emprunt concerné :
            </Typography>
            <Typography variant='subtitle1' fontWeight='bold'>
              {empruntParent.des_emprunt}
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 2 }}>
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={`Montant payé (${devise})`}
                value={formData.mntRembourse}
                onChange={e => setFormData({ ...formData, mntRembourse: e.target.value })}
                InputProps={{
                  inputComponent: CleaveInput
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label='Compte source (Prélèvement)'
                value={formData.cptCible || ''}
                onChange={e => setFormData({ ...formData, cptCible: e.target.value })}
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
                label='Date du paiement'
                InputLabelProps={{ shrink: true }}
                value={formData.dateRembourse}
                onChange={e => setFormData({ ...formData, dateRembourse: e.target.value })}
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

export default EditRemboursementModal
