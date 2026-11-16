import { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, MenuItem, Typography, FormControlLabel, Switch } from '@mui/material'
import dayjs from 'dayjs'
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { useCodePromo } from 'src/context/CodePromoContext'

const typesReduction = [
  { value: 'POURCENTAGE', label: 'Pourcentage (%)' },
  { value: 'MONTANT', label: 'Montant fixe (DA)' }
]

const CodePromoDialog = ({ open, codePromo, onClose }) => {
  const { ajouterCodePromo, modifierCodePromo } = useCodePromo()

  const [code, setCode] = useState('')
  const [typeReduction, setTypeReduction] = useState('POURCENTAGE')
  const [valeurReduction, setValeurReduction] = useState('')
  const [dateExpiration, setDateExpiration] = useState('')
  const [montantMinPromo, setMontantMinPromo] = useState('')
  const [estActifPromo, setEstActifPromo] = useState(true)
  const [utilisationMax, setUtilisationMax] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setCode(codePromo?.code || '')
      setTypeReduction(codePromo?.type_reduction || 'POURCENTAGE')
      setValeurReduction(codePromo?.valeur_reduction !== undefined ? String(codePromo.valeur_reduction) : '')
      setDateExpiration(codePromo?.date_expiration ? dayjs(codePromo.date_expiration).format('YYYY-MM-DD') : '')
      setMontantMinPromo(codePromo?.montant_min_promo ? String(codePromo.montant_min_promo) : '')
      setEstActifPromo(codePromo?.est_actif_promo !== undefined ? codePromo.est_actif_promo : true)
      setUtilisationMax(codePromo?.utilisation_max !== undefined ? String(codePromo.utilisation_max) : '')
    }
  }, [open, codePromo])

  const erreurPourcentage =
    typeReduction === 'POURCENTAGE' && valeurReduction !== '' && parseFloat(valeurReduction) > 100

  const handleSubmit = async () => {
    setIsLoading(true)
    const donnees = {
      code,
      typeReduction,
      valeurReduction: parseFloat(valeurReduction),
      dateExpiration,
      montantMinPromo: montantMinPromo === '' ? 0 : parseFloat(montantMinPromo),
      estActifPromo,
      utilisationMax: parseInt(utilisationMax, 10)
    }
    const success = codePromo
      ? await modifierCodePromo(codePromo.id_code, donnees)
      : await ajouterCodePromo(donnees)
    setIsLoading(false)
    if (success) onClose()
  }

  const formulaireValide = () => {
    if (!code.trim()) return false
    if (!valeurReduction || parseFloat(valeurReduction) <= 0 || erreurPourcentage) return false
    if (!dateExpiration) return false
    if (!utilisationMax || parseInt(utilisationMax, 10) <= 0) return false
    return true
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Icon icon='tabler:discount-2' />
        {codePromo ? `Modifier le code ${codePromo.code}` : 'Nouveau code promo'}
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={4} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={5}>
            <CustomTextField
              fullWidth
              label='Code'
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder='PROMO10'
              helperText='Saisi par le client dans le panier'
            />
          </Grid>
          <Grid item xs={12} sm={7}>
            <CustomTextField
              select
              fullWidth
              label='Type de réduction'
              value={typeReduction}
              onChange={e => setTypeReduction(e.target.value)}
            >
              {typesReduction.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          <Grid item xs={12} sm={4}>
            <CustomTextField
              fullWidth
              type='number'
              label={typeReduction === 'POURCENTAGE' ? 'Valeur (%)' : 'Valeur (DA)'}
              value={valeurReduction}
              onChange={e => setValeurReduction(e.target.value)}
              InputProps={{ inputProps: { min: 0, step: '0.01' } }}
              error={erreurPourcentage}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <CustomTextField
              fullWidth
              type='date'
              label='Expiration'
              value={dateExpiration}
              onChange={e => setDateExpiration(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <CustomTextField
              fullWidth
              type='number'
              label='Utilisations max'
              value={utilisationMax}
              onChange={e => setUtilisationMax(e.target.value)}
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <CustomTextField
              fullWidth
              type='number'
              label='Montant minimum de commande (DA)'
              value={montantMinPromo}
              onChange={e => setMontantMinPromo(e.target.value)}
              InputProps={{ inputProps: { min: 0, step: '0.01' } }}
              helperText='0 = aucun minimum'
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={<Switch checked={estActifPromo} onChange={e => setEstActifPromo(e.target.checked)} />}
              label='Code actif'
              sx={{ mt: 2.5 }}
            />
          </Grid>

          {erreurPourcentage && (
            <Grid item xs={12}>
              <Typography color='error' variant='body2'>
                Une réduction en pourcentage ne peut pas dépasser 100.
              </Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={onClose} disabled={isLoading}>
          Annuler
        </Button>
        <Button
          variant='contained'
          onClick={handleSubmit}
          disabled={!formulaireValide() || isLoading}
          startIcon={<Icon icon={isLoading ? 'tabler:loader' : 'tabler:check'} />}
        >
          {isLoading ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CodePromoDialog
