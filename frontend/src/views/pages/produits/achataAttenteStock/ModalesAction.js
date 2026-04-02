import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Button,
  Switch,
  FormControlLabel,
  Typography,
  Box,
  useMediaQuery
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useForm, Controller } from 'react-hook-form'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'

dayjs.extend(utc)
const defaultValues = { dateStock: dayjs().utc(true).startOf('day') }

const ModalesAction = ({
  isUpdateOpen,
  isCancelOpen,
  selectedColis,
  onClose,
  onSubmitUpdate,
  onInitiateCancel,
  onConfirmCancel
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [droitsTimbre, setDroitsTimbre] = useState(false)
  const { control, handleSubmit, reset } = useForm({ defaultValues })

  useEffect(() => {
    if (!isUpdateOpen) {
      reset(defaultValues)
      setDroitsTimbre(false)
    }
  }, [isUpdateOpen, reset])

  const handleFormSubmit = data => {
    onSubmitUpdate({
      dateStock: data.dateStock,
      droitsTimbre
    })
  }

  return (
    <>
      <Dialog open={isUpdateOpen} onClose={onClose} fullWidth maxWidth='sm'>
        <DialogTitle variant='h5'>Mettre à jour l'état du colis</DialogTitle>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogContent>
            <Grid container spacing={5}>
              <Grid item xs={12}>
                <CustomTextField fullWidth value={selectedColis?.produit?.designation_prd || ''} disabled />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name='dateStock'
                  control={control}
                  rules={{ required: 'Ce champ est obligatoire' }}
                  render={({ field }) => (
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                      <DatePicker {...field} maxDate={dayjs()} label='Date de Stock' sx={{ width: '100%' }} />
                    </LocalizationProvider>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch checked={droitsTimbre} onChange={e => setDroitsTimbre(e.target.checked)} />}
                  label='Droits de Timbre Payés'
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions
            sx={{
              p: 3,
              flexDirection: { xs: 'column-reverse', sm: 'row' },
              justifyContent: 'space-between',
              gap: { xs: 2, sm: 0 }
            }}
          >
            <Button variant='contained' color='error' fullWidth={isMobile} onClick={onInitiateCancel}>
              Annuler l'Achat
            </Button>
            <Box
              sx={{
                display: 'flex',
                width: { xs: '100%', sm: 'auto' },
                gap: 2,
                flexDirection: { xs: 'column-reverse', sm: 'row' }
              }}
            >
              <Button onClick={onClose} fullWidth={isMobile}>
                Fermer
              </Button>
              <Button type='submit' variant='contained' color='success' fullWidth={isMobile}>
                Mettre à Jour
              </Button>
            </Box>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={isCancelOpen} onClose={onClose} fullWidth maxWidth='xs'>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Icon
              icon='tabler:alert-circle'
              style={{ color: 'var(--mui-palette-warning-main)', marginRight: 8, fontSize: '1.5rem' }}
            />
            Confirmation d'Annulation
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir annuler le colis pour <strong>{selectedColis?.produit?.designation_prd}</strong> ?
          </Typography>
          <Typography variant='body2' sx={{ mt: 2 }}>
            Le montant de l'achat sera remboursé. <strong>Cette action est irréversible.</strong>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
          <Button onClick={onClose} fullWidth={isMobile}>
            Non, retour
          </Button>
          <Button variant='contained' color='error' onClick={onConfirmCancel} fullWidth={isMobile}>
            Oui, Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ModalesAction
