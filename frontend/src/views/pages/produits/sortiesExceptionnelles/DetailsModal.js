import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Box,
  IconButton,
  Divider
} from '@mui/material'
import dayjs from 'dayjs'
import Icon from 'src/@core/components/icon'
import { formatMontant } from 'src/@core/utils/format'
import CustomChip from 'src/@core/components/mui/chip'

const statutColors = {
  NON_APPLICABLE: 'secondary',
  EN_ATTENTE: 'warning',
  REMBOURSE: 'success',
  REFUSE: 'error'
}

const motifLabels = {
  UTILISATION_PERSONNELLE: 'Utilisation Personnelle',
  PERTE_LIVRAISON: 'Perte Livraison',
  CASSE_DEFECTUEUX: 'Casse / Défectueux',
  VENTE_A_CREDIT: 'Vente à Crédit',
  SAISIE_DOUANE: 'Saisie Douane'
}

const DetailsModal = ({ open, onClose, sortie }) => {
  if (!sortie) return null

  const coutReel =
    sortie.lignes_colis?.reduce((sum, ligne) => {
      return sum + ligne.qte * parseFloat(ligne.colis?.pu_dzd || 0)
    }, 0) || 0

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth='sm'
      PaperProps={{
        sx: { borderTop: theme => `5px solid ${theme.palette.info.main}` }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 3, pt: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box
            sx={{
              display: 'flex',
              p: 2,
              borderRadius: 1,
              backgroundColor: theme => theme.palette.info.main,
              color: '#ffffff'
            }}
          >
            <Icon icon='tabler:info-circle' fontSize='1.75rem' />
          </Box>
          <Typography variant='h5' sx={{ fontWeight: 600 }}>
            Détails de la sortie #{sortie.id_sortie}
          </Typography>
        </Box>
        <IconButton size='small' onClick={onClose} sx={{ alignSelf: 'flex-start' }}>
          <Icon icon='tabler:x' fontSize='1.25rem' />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 6, px: 6 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sx={{ mb: 2 }}>
            <Typography variant='h6'>{sortie.produit?.designation_prd}</Typography>
            <CustomChip
              rounded
              size='small'
              skin='light'
              color={statutColors[sortie.statut_remb]}
              label={sortie.statut_remb.replace('_', ' ')}
              sx={{ mt: 1 }}
            />
          </Grid>

          <Grid item xs={6}>
            <Typography variant='caption' color='text.secondary'>
              Motif
            </Typography>
            <Typography variant='body1' sx={{ fontWeight: 500 }}>
              {motifLabels[sortie.motif]}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant='caption' color='text.secondary'>
              Date de déclaration
            </Typography>
            <Typography variant='body1' sx={{ fontWeight: 500 }}>
              {dayjs(sortie.date_sortie).format('DD/MM/YYYY')}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant='caption' color='text.secondary'>
              Quantité perdue
            </Typography>
            <Typography variant='body1' sx={{ fontWeight: 600, color: 'primary.main' }}>
              {sortie.qte_totale} Unités
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant='caption' color='text.secondary'>
              Coût financier de la perte
            </Typography>
            <Typography variant='body1' sx={{ fontWeight: 600, color: 'error.main' }}>
              {formatMontant(coutReel)} DZD
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <Grid item xs={12}>
            <Typography variant='caption' color='text.secondary'>
              Observation
            </Typography>
            <Typography variant='body2' sx={{ mt: 1, p: 3, bgcolor: 'action.hover', borderRadius: 1 }}>
              {sortie.observation || 'Aucune observation fournie.'}
            </Typography>
          </Grid>

          {sortie.statut_remb === 'REMBOURSE' && sortie.operation_credit && (
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Box sx={{ p: 3, border: 1, borderColor: 'success.main', borderRadius: 1, bgcolor: 'background.paper' }}>
                <Typography variant='subtitle1' sx={{ mb: 2, color: 'success.main', fontWeight: 600 }}>
                  Détails du Remboursement
                </Typography>
                <Typography variant='body2' sx={{ mb: 1, color: 'text.secondary' }}>
                  Encaissé le :{' '}
                  <Box component='span' sx={{ color: 'text.primary', fontWeight: 600 }}>
                    {dayjs(sortie.operation_credit.date_op).format('DD/MM/YYYY')}
                  </Box>
                </Typography>
                <Typography variant='body2' sx={{ mb: 1, color: 'text.secondary' }}>
                  Montant :{' '}
                  <Box component='span' sx={{ color: 'text.primary', fontWeight: 600 }}>
                    {formatMontant(sortie.operation_credit.montant_op)} DZD
                  </Box>
                </Typography>
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  Compte :{' '}
                  <Box component='span' sx={{ color: 'text.primary', fontWeight: 600 }}>
                    {sortie.operation_credit.compte?.designation_cpt}
                  </Box>
                </Typography>
              </Box>
            </Grid>
          )}

          {sortie.statut_remb === 'REFUSE' && sortie.date_refus && (
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Box sx={{ p: 3, border: 1, borderColor: 'error.main', borderRadius: 1, bgcolor: 'background.paper' }}>
                <Typography variant='subtitle1' sx={{ mb: 2, color: 'error.main', fontWeight: 600 }}>
                  Détails du Refus
                </Typography>
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  Refus acté le :{' '}
                  <Box component='span' sx={{ color: 'text.primary', fontWeight: 600 }}>
                    {dayjs(sortie.date_refus).format('DD/MM/YYYY')}
                  </Box>
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 6, pb: 6, justifyContent: 'center' }}>
        <Button onClick={onClose} color='primary' variant='contained' sx={{ px: 6 }}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DetailsModal
