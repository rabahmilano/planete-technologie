import { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, Divider, Typography } from '@mui/material'
import dayjs from 'dayjs'
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { useProduitEcommerce } from 'src/context/ProduitEcommerceContext'

const versValeurLocale = date => (date ? dayjs(date).format('YYYY-MM-DDTHH:mm') : '')

const PrixPromoDialog = ({ open, produit, onClose }) => {
  const { majPrix } = useProduitEcommerce()

  const [prixVente, setPrixVente] = useState('')
  const [prixPromo, setPrixPromo] = useState('')
  const [debutPromo, setDebutPromo] = useState('')
  const [finPromo, setFinPromo] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setPrixVente(produit?.prix_vente ? String(produit.prix_vente) : '')
      setPrixPromo(produit?.prix_promo ? String(produit.prix_promo) : '')
      setDebutPromo(versValeurLocale(produit?.debut_promo))
      setFinPromo(versValeurLocale(produit?.fin_promo))
    }
  }, [open, produit])

  const promoRenseignee = prixPromo !== '' && parseFloat(prixPromo) > 0
  const erreurDates = promoRenseignee && (!debutPromo || !finPromo)
  const erreurOrdreDates =
    promoRenseignee && debutPromo && finPromo && new Date(finPromo) <= new Date(debutPromo)
  const erreurPrixPromo = promoRenseignee && prixVente !== '' && parseFloat(prixPromo) >= parseFloat(prixVente)

  const handleSubmit = async () => {
    setIsLoading(true)
    const success = await majPrix(produit.id_prd, {
      prixVente: parseFloat(prixVente),
      prixPromo: promoRenseignee ? parseFloat(prixPromo) : null,
      debutPromo: promoRenseignee && debutPromo ? new Date(debutPromo).toISOString() : null,
      finPromo: promoRenseignee && finPromo ? new Date(finPromo).toISOString() : null
    })
    setIsLoading(false)
    if (success) onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Icon icon='tabler:tag' />
        Prix & promotion — {produit?.designation_prd}
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={4} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <CustomTextField
              fullWidth
              type='number'
              label='Prix de vente (DZD)'
              value={prixVente}
              onChange={e => setPrixVente(e.target.value)}
              InputProps={{
                inputProps: { min: 0, step: '0.01' },
                endAdornment: <Typography sx={{ pr: 2 }}>DA</Typography>
              }}
              helperText='Chaque changement est enregistré dans lhistorique des prix de vente'
            />
          </Grid>

          <Grid item xs={12}>
            <Divider>
              <Typography variant='body2' color='textSecondary'>
                Promotion (prix barré automatique)
              </Typography>
            </Divider>
          </Grid>

          <Grid item xs={12} sm={6}>
            <CustomTextField
              fullWidth
              type='number'
              label='Prix promo (DZD)'
              value={prixPromo}
              onChange={e => setPrixPromo(e.target.value)}
              InputProps={{
                inputProps: { min: 0, step: '0.01' },
                endAdornment: <Typography sx={{ pr: 2 }}>DA</Typography>
              }}
              helperText='Vide = aucune promotion'
              error={erreurPrixPromo}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <CustomTextField
              fullWidth
              type='datetime-local'
              label='Début'
              value={debutPromo}
              onChange={e => setDebutPromo(e.target.value)}
              error={erreurDates || erreurOrdreDates}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <CustomTextField
              fullWidth
              type='datetime-local'
              label='Fin'
              value={finPromo}
              onChange={e => setFinPromo(e.target.value)}
              error={erreurDates || erreurOrdreDates}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {erreurDates && (
            <Grid item xs={12}>
              <Typography color='error' variant='body2'>
                Les dates de début et de fin sont obligatoires pour une promotion.
              </Typography>
            </Grid>
          )}
          {erreurOrdreDates && (
            <Grid item xs={12}>
              <Typography color='error' variant='body2'>
                La fin de la promotion doit être après son début.
              </Typography>
            </Grid>
          )}
          {erreurPrixPromo && (
            <Grid item xs={12}>
              <Typography color='error' variant='body2'>
                Le prix promo doit être inférieur au prix de vente.
              </Typography>
            </Grid>
          )}

          {!erreurDates && !erreurOrdreDates && (
            <Grid item xs={12}>
              <Typography variant='caption' color='textSecondary'>
                Pendant la fenêtre de promotion, la boutique affiche le prix promo et le prix de vente d'origine comme
                prix barré. En dehors de cette fenêtre, seul le prix de vente normal est renvoyé.
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
          disabled={
            !prixVente ||
            parseFloat(prixVente) <= 0 ||
            erreurDates ||
            erreurOrdreDates ||
            erreurPrixPromo ||
            isLoading
          }
          startIcon={<Icon icon={isLoading ? 'tabler:loader' : 'tabler:check'} />}
        >
          {isLoading ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default PrixPromoDialog
