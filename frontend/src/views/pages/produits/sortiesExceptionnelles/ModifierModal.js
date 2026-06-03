import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  MenuItem,
  InputAdornment
} from '@mui/material'
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { useSortieExceptionnelle } from 'src/context/SortieExceptionnelleContext'

const motifOptions = [
  { value: 'UTILISATION_PERSONNELLE', label: 'Utilisation Personnelle' },
  { value: 'PERTE_LIVRAISON', label: 'Perte Livraison' },
  { value: 'CASSE_DEFECTUEUX', label: 'Casse / Défectueux' },
  { value: 'VENTE_A_CREDIT', label: 'Vente à Crédit' },
  { value: 'SAISIE_DOUANE', label: 'Saisie Douane' }
]

const ModifierModal = ({ open, onClose, sortie, onSuccess }) => {
  const { modifierSortie } = useSortieExceptionnelle()

  const [motif, setMotif] = useState('')
  const [mntAttendu, setMntAttendu] = useState('')
  const [observation, setObservation] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Pré-remplir les données à l'ouverture
  useEffect(() => {
    if (open && sortie) {
      setMotif(sortie.motif || '')
      setMntAttendu(sortie.mnt_attendu ? sortie.mnt_attendu.toString() : '')
      setObservation(sortie.observation || '')
    }
  }, [open, sortie])

  const requiresMontant = motif !== 'UTILISATION_PERSONNELLE' && motif !== 'SAISIE_DOUANE' && motif !== ''

  const handleSubmit = async () => {
    setIsLoading(true)

    const payload = {
      motif,
      observation: observation || null,
      mnt_attendu: requiresMontant ? parseFloat(mntAttendu) : null
    }

    const success = await modifierSortie(sortie.id_sortie, payload)

    setIsLoading(false)
    if (success) {
      onSuccess()
    }
  }

  const isFormValid = () => {
    if (!motif) return false
    if (requiresMontant && (!mntAttendu || parseFloat(mntAttendu) <= 0)) return false
    return true
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Icon icon='tabler:edit' />
        Modifier la déclaration
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={4} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <CustomTextField
              select
              fullWidth
              label='Motif de la sortie'
              value={motif}
              onChange={e => setMotif(e.target.value)}
            >
              {motifOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          {requiresMontant && (
            <Grid item xs={12}>
              <CustomTextField
                fullWidth
                type='number'
                label='Montant de remboursement attendu'
                value={mntAttendu}
                onChange={e => setMntAttendu(e.target.value)}
                InputProps={{
                  endAdornment: <InputAdornment position='end'>DA</InputAdornment>
                }}
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <CustomTextField
              fullWidth
              multiline
              rows={3}
              label='Observation (Optionnelle)'
              value={observation}
              onChange={e => setObservation(e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={onClose} disabled={isLoading}>
          Annuler
        </Button>
        <Button
          variant='contained'
          onClick={handleSubmit}
          disabled={!isFormValid() || isLoading}
          startIcon={<Icon icon={isLoading ? 'tabler:loader' : 'tabler:check'} />}
        >
          {isLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ModifierModal
