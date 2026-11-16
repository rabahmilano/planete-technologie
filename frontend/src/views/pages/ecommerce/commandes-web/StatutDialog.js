import { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, MenuItem, Typography, Box } from '@mui/material'
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { useCommandeWeb } from 'src/context/CommandeWebContext'

const statutsSuivants = ['NOUVELLE', 'CONFIRMEE', 'EXPEDIEE', 'LIVREE']

const StatutDialog = ({ open, commande, onClose }) => {
  const { changerStatut } = useCommandeWeb()

  const [statutCommande, setStatutCommande] = useState('')
  const [codeTracking, setCodeTracking] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && commande) {
      setStatutCommande(commande.statut_commande === 'ANNULEE' ? 'NOUVELLE' : commande.statut_commande)
      setCodeTracking(commande.code_tracking || '')
    }
  }, [open, commande])

  const handleSubmit = async () => {
    setIsLoading(true)
    const success = await changerStatut(commande.id_cmd_web, statutCommande, codeTracking || null)
    setIsLoading(false)
    if (success) onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Icon icon='tabler:refresh-dot' />
        Statut de la commande #{commande?.id_cmd_web}
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={4} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Typography variant='body2' color='textSecondary'>
              Client : <strong>{commande?.nom_client}</strong> — statut actuel :{' '}
              <strong>{commande?.statut_commande}</strong>
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <CustomTextField
              select
              fullWidth
              label='Nouveau statut'
              value={statutCommande}
              onChange={e => setStatutCommande(e.target.value)}
            >
              {statutsSuivants.map(statutOption => (
                <MenuItem key={statutOption} value={statutOption}>
                  {statutOption}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          <Grid item xs={12}>
            <CustomTextField
              fullWidth
              label="Code de suivi Yalidine (à l'expédition)"
              value={codeTracking}
              onChange={e => setCodeTracking(e.target.value)}
              placeholder='Ex : LB123456789'
            />
          </Grid>

          <Grid item xs={12}>
            <Box>
              <Typography variant='caption' color='textSecondary'>
                Le code de suivi est renseigné lors du passage à EXPEDIEE. Il reste modifiable à tout moment.
              </Typography>
            </Box>
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
          disabled={!statutCommande || isLoading}
          startIcon={<Icon icon={isLoading ? 'tabler:loader' : 'tabler:check'} />}
        >
          {isLoading ? 'Enregistrement...' : 'Mettre à jour'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default StatutDialog
