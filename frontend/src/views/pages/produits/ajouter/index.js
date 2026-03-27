// src/views/pages/produits/ajouter/index.js
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
import { createFilterOptions } from '@mui/material/Autocomplete'
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

const defaultValues = { desPrd: '', cat: '', cpt: '', mntTotDev: '', qte: '', dateAchat: dayjs() }

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

  // Règle métier : Recalcul prévisionnel pour l'utilisateur
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
      if (val.length >= 3) {
        const res = await rechercherProduits(val)
        setOptions(res)
      } else setOptions([])
    }, 300),
    []
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
      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={5}>
          <Grid item xs={12}>
            <Typography variant='subtitle1' sx={{ fontWeight: 600, color: 'primary.main' }}>
              1. Produit
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name='desPrd'
              control={control}
              rules={{ required: 'Obligatoire' }}
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
                  getOptionLabel={opt => opt.designation_prd || opt}
                  renderInput={params => (
                    <CustomTextField
                      {...params}
                      label='Désignation'
                      placeholder='SSD 256Go'
                      error={!!errors.desPrd}
                      helperText={errors.desPrd?.message}
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
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <IconButton onClick={() => setDrawerOpen(true)} color='info' size='small'>
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
              2. Achat
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name='dateAchat'
              control={control}
              render={({ field }) => (
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                  <DatePicker
                    {...field}
                    label='Date'
                    maxDate={dayjs()}
                    slotProps={{ textField: { fullWidth: true } }}
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
                  label='Compte'
                  {...field}
                  onChange={e => {
                    field.onChange(e)
                    handleCompteChange(e.target.value)
                  }}
                  error={!!errors.cpt}
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
                  label='Montant Devise'
                  {...field}
                  InputProps={{
                    inputComponent: CleaveInput,
                    endAdornment: <InputAdornment position='end'>{deviseInfo.symbole}</InputAdornment>
                  }}
                  onChange={e => {
                    field.onChange(e)
                    updateFinancePreview(e.target.value, getValues('qte'))
                  }}
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
                  {...field}
                  InputProps={{ inputComponent: CleaveInput }}
                  onChange={e => {
                    field.onChange(e)
                    updateFinancePreview(getValues('mntTotDev'), e.target.value)
                  }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={12} sm={3}>
            <CustomTextField
              fullWidth
              label='Taux'
              value={formatMontant(taux)}
              InputProps={{ readOnly: true, endAdornment: 'DZD' }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <CustomTextField
              fullWidth
              label='Total DZD'
              value={formatMontant(calculs.mntDzd)}
              InputProps={{ readOnly: true, endAdornment: 'DZD' }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <CustomTextField
              fullWidth
              label='PU Devise'
              value={formatMontant(calculs.puDev, 4)}
              InputProps={{ readOnly: true, endAdornment: deviseInfo.code }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <CustomTextField
              fullWidth
              label='PU DZD'
              value={formatMontant(calculs.puDzd, 4)}
              InputProps={{ readOnly: true, endAdornment: 'DZD' }}
            />
          </Grid>

          <Grid item xs={12}>
            <Button type='submit' variant='contained' size='large'>
              Enregistrer
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
