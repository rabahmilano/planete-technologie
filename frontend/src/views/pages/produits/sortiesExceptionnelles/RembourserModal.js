import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  MenuItem,
  Typography,
  Box,
  IconButton,
  CircularProgress
} from '@mui/material'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'

import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { useSortieExceptionnelle } from 'src/context/SortieExceptionnelleContext'
import { useProduit } from 'src/context/ProduitContext'
import { formatMontant } from 'src/@core/utils/format'

const RembourserModal = ({ open, onClose, sortie, onSuccess }) => {
  const { rembourserSortie } = useSortieExceptionnelle()
  const { listCompte } = useProduit()

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    cpt_id: '',
    montant_encaisse: '',
    date_remb: dayjs()
  })

  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        montant_encaisse: sortie?.mnt_attendu || '',
        date_remb: dayjs()
      }))
    }
  }, [open, sortie])

  const handleSubmit = async () => {
    setLoading(true)
    const payload = {
      cpt_id: parseInt(formData.cpt_id, 10),
      montant_encaisse: parseFloat(formData.montant_encaisse),
      date_remb: formData.date_remb.toISOString()
    }

    const success = await rembourserSortie(sortie.id_sortie, payload)
    setLoading(false)
    if (success) {
      onSuccess()
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth='sm'
      PaperProps={{
        sx: { borderTop: theme => `5px solid ${theme.palette.success.main}` }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 3, pt: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box
            sx={{
              display: 'flex',
              p: 2,
              borderRadius: 1,
              backgroundColor: theme => theme.palette.success.main,
              color: '#ffffff'
            }}
          >
            <Icon icon='tabler:cash' fontSize='1.75rem' />
          </Box>
          <Typography variant='h5' sx={{ fontWeight: 600 }}>
            Valider un remboursement
          </Typography>
        </Box>
        <IconButton size='small' onClick={onClose} sx={{ alignSelf: 'flex-start' }}>
          <Icon icon='tabler:x' fontSize='1.25rem' />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 6, px: 6 }}>
        <Grid container spacing={5}>
          <Grid item xs={12}>
            <Typography variant='body1' sx={{ mb: 2 }}>
              Validation du remboursement pour la perte de{' '}
              <strong>
                {sortie?.qte_totale} {sortie?.produit?.designation_prd}
              </strong>
              .
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Montant initialement réclamé : <strong>{formatMontant(sortie?.mnt_attendu || 0)} DZD</strong>.
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <CustomTextField
              select
              fullWidth
              label='Compte de réception'
              value={formData.cpt_id}
              onChange={e => setFormData({ ...formData, cpt_id: e.target.value })}
            >
              {listCompte?.map(c => (
                <MenuItem key={c.id_cpt} value={c.id_cpt}>
                  {c.designation_cpt}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
              <DatePicker
                label='Date de réception'
                value={formData.date_remb}
                onChange={newValue => setFormData({ ...formData, date_remb: newValue })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12}>
            <CustomTextField
              fullWidth
              type='number'
              label='Montant réellement encaissé (DZD)'
              value={formData.montant_encaisse}
              onChange={e => setFormData({ ...formData, montant_encaisse: e.target.value })}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 6, pb: 6, justifyContent: 'center', gap: 2 }}>
        <Button onClick={onClose} color='secondary' variant='outlined' sx={{ px: 6 }} disabled={loading}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          color='success'
          variant='contained'
          sx={{ px: 6 }}
          disabled={loading || !formData.cpt_id || !formData.montant_encaisse}
          startIcon={loading ? <CircularProgress size={20} color='inherit' /> : null}
        >
          Encaisser
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RembourserModal
