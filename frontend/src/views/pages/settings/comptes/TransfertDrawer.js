import { useState } from 'react'
import Drawer from '@mui/material/Drawer'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import InputAdornment from '@mui/material/InputAdornment'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import { useForm, Controller } from 'react-hook-form'
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import CleaveInput from 'src/components/CleaveInput'
import { useCompte } from 'src/context/CompteContext'
import { formatMontant } from 'src/@core/utils/format'

dayjs.locale('fr')

const Header = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(6),
  justifyContent: 'space-between'
}))

const defaultValues = {
  cptSource: '',
  cptDest: '',
  montant: '',
  dateTransfert: dayjs(),
  observation: ''
}

const TransfertDrawer = ({ open, toggle }) => {
  const { tousLesComptes, transferer } = useCompte()
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm({ defaultValues })

  const watchCptSource = watch('cptSource')
  const selectedSource = tousLesComptes?.find(c => c.id_cpt === watchCptSource)

  const destinationsValides =
    tousLesComptes?.filter(c => c.id_cpt !== watchCptSource && c.dev_code === selectedSource?.dev_code) || []

  const handleClose = () => {
    reset()
    toggle()
  }

  const onSubmit = async data => {
    setSubmitting(true)
    const cleanMontant = parseFloat(data.montant.toString().replace(/\s/g, ''))
    const payload = {
      cptSource: data.cptSource,
      cptDest: data.cptDest,
      montant: cleanMontant,
      dateTransfert: dayjs(data.dateTransfert).toISOString(),
      observation: data.observation?.trim() || ''
    }

    const success = await transferer(payload)
    if (success) {
      handleClose()
    }
    setSubmitting(false)
  }

  return (
    <Drawer
      open={open}
      anchor='right'
      onClose={handleClose}
      variant='temporary'
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 350, sm: 450 } } }}
    >
      <Header>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Icon icon='tabler:arrows-transfer-down' fontSize='1.75rem' color='primary' />
          <Typography variant='h5'>Nouveau Transfert</Typography>
        </Box>
        <IconButton size='small' onClick={handleClose} sx={{ color: 'text.primary' }}>
          <Icon icon='tabler:x' fontSize='1.25rem' />
        </IconButton>
      </Header>

      <Box sx={{ p: theme => theme.spacing(0, 6, 6) }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ mb: 4 }}>
            <Controller
              name='cptSource'
              control={control}
              rules={{ required: 'Obligatoire' }}
              render={({ field, fieldState: { error } }) => (
                <CustomTextField
                  {...field}
                  select
                  fullWidth
                  label='Compte Source (Débit)'
                  error={!!error}
                  helperText={error?.message}
                  onChange={e => {
                    field.onChange(e)
                    setValue('cptDest', '')
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Icon icon='tabler:building-bank' />
                      </InputAdornment>
                    )
                  }}
                >
                  {tousLesComptes?.map(c => {
                    const solde = parseFloat(c.solde_actuel || 0)
                    const bloque = parseFloat(c.solde_bloque || 0)
                    const dispo = solde - bloque
                    return (
                      <MenuItem key={c.id_cpt} value={c.id_cpt}>
                        {c.designation_cpt} ({formatMontant(dispo)} {c.dev_code})
                      </MenuItem>
                    )
                  })}
                </CustomTextField>
              )}
            />
          </Box>

          <Box sx={{ mb: 4 }}>
            {!watchCptSource ? (
              <Alert severity='info' variant='outlined'>
                Sélectionnez un compte source.
              </Alert>
            ) : destinationsValides.length === 0 ? (
              <Alert severity='warning' variant='outlined'>
                Aucune destination possible en {selectedSource?.dev_code}.
              </Alert>
            ) : (
              <Controller
                name='cptDest'
                control={control}
                rules={{ required: 'Obligatoire' }}
                render={({ field, fieldState: { error } }) => (
                  <CustomTextField
                    {...field}
                    select
                    fullWidth
                    label='Compte Destination (Crédit)'
                    error={!!error}
                    helperText={error?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position='start'>
                          <Icon icon='tabler:building-bank' />
                        </InputAdornment>
                      )
                    }}
                  >
                    {destinationsValides.map(c => (
                      <MenuItem key={c.id_cpt} value={c.id_cpt}>
                        {c.designation_cpt} ({c.dev_code})
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            )}
          </Box>

          {watchCptSource && destinationsValides.length > 0 && (
            <>
              <Box sx={{ mb: 4 }}>
                <Controller
                  name='montant'
                  control={control}
                  rules={{
                    required: 'Obligatoire',
                    validate: v => parseFloat(v.toString().replace(/\s/g, '')) > 0 || 'Montant invalide'
                  }}
                  render={({ field: { value, onChange }, fieldState: { error } }) => (
                    <CustomTextField
                      fullWidth
                      label='Montant à transférer'
                      value={value}
                      onChange={onChange}
                      error={!!error}
                      helperText={error?.message}
                      autoComplete='off'
                      InputProps={{
                        inputComponent: CleaveInput,
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Icon icon='tabler:report-money' />
                          </InputAdornment>
                        ),
                        endAdornment: <InputAdornment position='end'>{selectedSource?.dev_code}</InputAdornment>
                      }}
                    />
                  )}
                />
              </Box>

              <Box sx={{ mb: 4 }}>
                <Controller
                  name='dateTransfert'
                  control={control}
                  rules={{ required: 'Obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                      <DatePicker
                        {...field}
                        maxDate={dayjs()}
                        label='Date du transfert'
                        slots={{ textField: CustomTextField }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: !!error,
                            helperText: error?.message,
                            InputProps: {
                              startAdornment: (
                                <InputAdornment position='start'>
                                  <Icon icon='tabler:calendar' />
                                </InputAdornment>
                              )
                            }
                          }
                        }}
                      />
                    </LocalizationProvider>
                  )}
                />
              </Box>

              <Box sx={{ mb: 6 }}>
                <Controller
                  name='observation'
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      multiline
                      rows={3}
                      label='Observation'
                      error={!!error}
                      helperText={error?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position='start' sx={{ mt: 2 }}>
                            <Icon icon='tabler:file-description' />
                          </InputAdornment>
                        )
                      }}
                    />
                  )}
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  type='submit'
                  variant='contained'
                  sx={{ mr: 3 }}
                  disabled={submitting}
                  startIcon={<Icon icon='tabler:device-floppy' />}
                >
                  Valider le transfert
                </Button>
                <Button variant='tonal' color='secondary' onClick={handleClose}>
                  Annuler
                </Button>
              </Box>
            </>
          )}
        </form>
      </Box>
    </Drawer>
  )
}

export default TransfertDrawer
