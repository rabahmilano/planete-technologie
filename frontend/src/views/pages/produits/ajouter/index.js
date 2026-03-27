import { useState, useCallback } from 'react'
import {
  Grid,
  Button,
  Typography,
  Divider,
  CardContent,
  MenuItem,
  IconButton,
  InputAdornment,
  Drawer
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

import CustomTextField from 'src/@core/components/mui/text-field'
import CustomAutocomplete from 'src/@core/components/mui/autocomplete'
import Icon from 'src/@core/components/icon'
import CleaveInput from 'src/components/CleaveInput'
import { useProduit } from 'src/context/ProduitContext'
import { formatMontant } from 'src/@core/utils/format'
import AjouterCategorie from '../ajouterCategorie'

dayjs.locale('fr')

const defaultValues = {
  desPrd: '',
  cat: '',
  cpt: '',
  mntTotDev: '',
  qte: '',
  dateAchat: dayjs()
}

const debounce = (fn, delay) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

const AjouterProduit = () => {
  const { listCategorie, listCompte, ajouterProduit, rechercherProduits } = useProduit()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [taux, setTaux] = useState(0)
  const [deviseInfo, setDeviseInfo] = useState({ code: '', symbole: '' })
  const [calculs, setCalculs] = useState({ mntDzd: 0, puDev: 0, puDzd: 0 })
  const [options, setOptions] = useState([])

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
    reset
  } = useForm({ defaultValues })

  // Règle métier : Aperçu financier dynamique pour validation humaine avant soumission
  const updateFinancePreview = (mnt, q, tx) => {
    const montant = parseFloat(mnt) || 0
    const quantite = parseFloat(q) || 0
    const tauxActuel = tx || taux

    if (montant && quantite && tauxActuel) {
      setCalculs({
        mntDzd: montant * tauxActuel,
        puDev: montant / quantite,
        puDzd: (montant * tauxActuel) / quantite
      })
    }
  }

  const handleSearch = useCallback(
    debounce(async val => {
      if (val && val.length >= 3) {
        const res = await rechercherProduits(val)
        setOptions(res || [])
      } else {
        setOptions([])
      }
    }, 300),
    [rechercherProduits]
  )

  const handleCompteChange = id => {
    const cpt = listCompte.find(c => c.id_cpt === id)
    if (cpt) {
      setTaux(cpt.taux_change_actuel)
      setDeviseInfo({ code: cpt.dev_code, symbole: cpt.devise.symbole_dev })
      updateFinancePreview(getValues('mntTotDev'), getValues('qte'), cpt.taux_change_actuel)
    }
  }

  const onSubmit = async data => {
    const formattedData = {
      ...data,
      desPrd: typeof data.desPrd === 'string' ? data.desPrd : data.desPrd?.designation_prd,
      dateAchat: dayjs(data.dateAchat).toISOString(),
      qte: parseInt(data.qte, 10),
      mntTotDev: parseFloat(data.mntTotDev)
    }

    if (await ajouterProduit(formattedData)) {
      reset()
      setCalculs({ mntDzd: 0, puDev: 0, puDzd: 0 })
      setTaux(0)
      setDeviseInfo({ code: '', symbole: '' })
      setOptions([])
    }
  }

  return (
    <CardContent>
      <form onSubmit={handleSubmit(onSubmit)} autoComplete='off'>
        <Grid container spacing={5}>
          <Grid item xs={12}>
            <Typography variant='subtitle1' sx={{ fontWeight: 600, color: 'primary.main' }}>
              1. Informations sur le produit
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name='desPrd'
              control={control}
              rules={{ required: 'Ce champ est obligatoire' }}
              render={({ field: { onChange, value } }) => (
                <CustomAutocomplete
                  freeSolo
                  fullWidth
                  options={options}
                  value={value}
                  onInputChange={(e, val) => {
                    onChange(val)
                    handleSearch(val)
                  }}
                  getOptionLabel={opt => opt?.designation_prd || opt || ''}
                  isOptionEqualToValue={(option, val) => {
                    const optLabel = typeof option === 'string' ? option : option.designation_prd
                    const valLabel = typeof val === 'string' ? val : val.designation_prd
                    return optLabel === valLabel
                  }}
                  renderInput={params => (
                    <CustomTextField
                      {...params}
                      label='Désignation du produit'
                      placeholder='Ex: SSD 256Go'
                      error={!!errors.desPrd}
                      helperText={errors.desPrd?.message}
                      inputProps={{
                        ...params.inputProps,
                        autoComplete: 'new-password' // Hack infaillible pour bloquer l'historique Chrome
                      }}
                    />
                  )}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name='cat'
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <CustomTextField
                  select
                  fullWidth
                  label='Catégorie'
                  {...field}
                  error={!!errors.cat}
                  helperText={errors.cat && 'Ce champ est obligatoire'}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <IconButton
                          onClick={() => setDrawerOpen(true)}
                          color='info'
                          size='small'
                          edge='start'
                          sx={{ ml: -2, mr: 1 }}
                        >
                          <Icon icon='tabler:circle-plus' />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                >
                  {listCategorie.map(c => (
                    <MenuItem key={c.id_cat} value={c.id_cat}>
                      {c.designation_cat}
                    </MenuItem>
                  ))}
                </CustomTextField>
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={12}>
            <Typography variant='subtitle1' sx={{ fontWeight: 600, color: 'primary.main' }}>
              2. Informations sur l'achat
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name='dateAchat'
              control={control}
              rules={{ required: 'Ce champ est obligatoire' }}
              render={({ field, fieldState: { error } }) => (
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                  <DatePicker
                    {...field}
                    label="Date d'achat"
                    maxDate={dayjs()}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!error,
                        helperText: error?.message,
                        autoComplete: 'off'
                      }
                    }}
                  />
                </LocalizationProvider>
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name='cpt'
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <CustomTextField
                  select
                  fullWidth
                  label='Compte de paiement'
                  {...field}
                  onChange={e => {
                    field.onChange(e)
                    handleCompteChange(e.target.value)
                  }}
                  error={!!errors.cpt}
                  helperText={errors.cpt && 'Ce champ est obligatoire'}
                >
                  {listCompte.map(c => (
                    <MenuItem key={c.id_cpt} value={c.id_cpt}>
                      {c.designation_cpt}
                    </MenuItem>
                  ))}
                </CustomTextField>
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name='mntTotDev'
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <CustomTextField
                  fullWidth
                  label='Montant total en devise'
                  autoComplete='off'
                  {...field}
                  InputProps={{
                    inputComponent: CleaveInput,
                    endAdornment: <InputAdornment position='end'>{deviseInfo.symbole}</InputAdornment>
                  }}
                  onChange={e => {
                    field.onChange(e)
                    updateFinancePreview(e.target.value, getValues('qte'))
                  }}
                  error={!!errors.mntTotDev}
                  helperText={errors.mntTotDev && 'Ce champ est obligatoire'}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name='qte'
              control={control}
              rules={{ required: true, min: 1 }}
              render={({ field }) => (
                <CustomTextField
                  fullWidth
                  label='Quantité'
                  autoComplete='off'
                  {...field}
                  InputProps={{ inputComponent: CleaveInput }}
                  onChange={e => {
                    field.onChange(e)
                    updateFinancePreview(getValues('mntTotDev'), e.target.value)
                  }}
                  error={!!errors.qte}
                  helperText={errors.qte && 'Ce champ doit être supérieur à 0'}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={12}>
            <Typography variant='subtitle1' sx={{ fontWeight: 600, color: 'primary.main' }}>
              3. Informations supplémentaires sur les prix
            </Typography>
          </Grid>

          <Grid item xs={12} sm={3}>
            <CustomTextField
              fullWidth
              label='Taux utilisé'
              value={formatMontant(taux)}
              InputProps={{ readOnly: true, endAdornment: <InputAdornment position='end'>DZD</InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <CustomTextField
              fullWidth
              label='Total DZD'
              value={formatMontant(calculs.mntDzd)}
              InputProps={{ readOnly: true, endAdornment: <InputAdornment position='end'>DZD</InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <CustomTextField
              fullWidth
              label='PU Devise'
              value={formatMontant(calculs.puDev, 4)}
              InputProps={{
                readOnly: true,
                endAdornment: <InputAdornment position='end'>{deviseInfo.code}</InputAdornment>
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <CustomTextField
              fullWidth
              label='PU DZD'
              value={formatMontant(calculs.puDzd, 4)}
              InputProps={{ readOnly: true, endAdornment: <InputAdornment position='end'>DZD</InputAdornment> }}
            />
          </Grid>

          <Grid item xs={12}>
            <Button type='submit' variant='contained' size='large' sx={{ mt: 2 }}>
              Enregistrer l'achat
            </Button>
          </Grid>
        </Grid>
      </form>

      <Drawer anchor='right' open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <AjouterCategorie onClose={() => setDrawerOpen(false)} />
      </Drawer>
    </CardContent>
  )
}

export default AjouterProduit
