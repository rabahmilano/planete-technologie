// ** React Imports
import { forwardRef, useState, useEffect, useCallback } from 'react'

// ** MUI Imports
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Drawer from '@mui/material/Drawer'

import CustomTextField from 'src/@core/components/mui/text-field'
import CustomAutocomplete from 'src/@core/components/mui/autocomplete'
import { createFilterOptions } from '@mui/material/Autocomplete'

import AjouterCategorie from '../ajouterCategorie'

// ** Third Party Imports
import toast from 'react-hot-toast'
import { useForm, Controller } from 'react-hook-form'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'

import { useProduit } from 'src/context/ProduitContext'

import dayjs from 'dayjs'
import 'dayjs/locale/fr'

dayjs.locale('fr')

const defaultValues = {
  desPrd: '',
  cat: '',
  cpt: '',
  mntTotDev: '',
  qte: '',
  dateAchat: dayjs()
}

function debounce(func, wait) {
  let timeout
  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

// ** Icon Imports
import Icon from 'src/@core/components/icon'
import axios from 'axios'

const CustomInput = forwardRef((props, ref) => {
  return <CustomTextField fullWidth {...props} inputRef={ref} label='Birth Date' autoComplete='off' />
})

// const top100Films = [
//   { title: 'SSD XrayDisk 256Go' },
//   { title: 'RAM Asgard 16Go 3200MHz' },
//   { title: 'RAM Asgard 16Go 3200MHz RGB' },
//   { title: 'SSD Samsung 512Go' },
//   { title: 'SSD Kingston 256Go' }
// ]

const AjouterProduit = () => {
  const { listCategorie } = useProduit()
  const [listCompte, setListcompte] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [devise, setDevise] = useState('')
  const [taux, setTaux] = useState(0)
  const [mntDzd, setMntDzd] = useState(0)
  const [puDev, setPuDev] = useState(0)
  const [puDzd, setPuDzd] = useState(0)

  // ** Hooks
  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
    reset,
    setValue
  } = useForm({ defaultValues })

  const handleCompteChange = newCompte => {
    const selectedCompte = listCompte.find(compte => compte.id_cpt === newCompte)
    const montant = parseFloat(getValues('mntTotDev'))
    const quantite = parseFloat(getValues('qte'))

    const newDevise = selectedCompte.dev_code
    setDevise(newDevise)

    const newTaux = selectedCompte.devise.info_taux_change[0].taux_change.taux
    setTaux(newTaux)

    if (selectedCompte && montant && quantite) {
      const calculatedMntDzd = montant * newTaux
      const calculatedPuDev = montant / quantite
      const calculatedPuDzd = calculatedMntDzd / quantite

      setMntDzd(calculatedMntDzd.toFixed(4))
      setPuDev(calculatedPuDev.toFixed(4))
      setPuDzd(calculatedPuDzd.toFixed(4))
    }
  }

  const handleMontantChange = newMontant => {
    setValue('mntTotDev', newMontant)

    const quantite = parseFloat(getValues('qte'))

    if (quantite && taux) {
      const calculatedMntDzd = newMontant * taux
      const calculatedPuDev = newMontant * quantite
      const calculatedPuDzd = calculatedMntDzd / quantite

      setMntDzd(calculatedMntDzd.toFixed(4))
      setPuDev(calculatedPuDev.toFixed(4))
      setPuDzd(calculatedPuDzd.toFixed(4))
    }
  }

  const handleQuantiteChange = newQuatite => {
    setValue('qte', newQuatite)
    const montant = parseFloat(getValues('mntTotDev'))

    if (montant) {
      const calculatedMntDzd = montant * taux
      const calculatedPuDev = montant / newQuatite
      const calculatedPuDzd = calculatedMntDzd / newQuatite

      setMntDzd(calculatedMntDzd.toFixed(4))
      setPuDev(calculatedPuDev.toFixed(4))
      setPuDzd(calculatedPuDzd.toFixed(4))
    }
  }

  const onSubmit = async () => {
    const data = getValues()
    const url = `${process.env.NEXT_PUBLIC_BASE_URL}produits/addProduit`

    const formattedData = {
      ...data,
      desPrd: data.desPrd.designation_prd,
      dateAchat: dayjs(data.dateAchat).toISOString(),
      qte: parseInt(data.qte),
      mntTotDev: parseFloat(data.mntTotDev),
      taux: parseFloat(taux)
    }

    try {
      const reponse = await axios.post(url, formattedData)
      if (reponse.status === 201) {
        toast.success("L'opération d'achat a été bien enregistré")
        setOptions([])
        reset()
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 400) {
          toast.error('Erreur de validation: ' + error.response.data.errors.map(err => err.msg).join(', '))
        } else {
          toast.error('Erreur du serveur: ' + error.response.data.message)
        }
      } else if (error.request) {
        // La requête a été faite mais aucune réponse n'a été reçue
        toast.error('Pas de réponse du serveur')
      } else {
        // Une erreur s'est produite lors de la configuration de la requête
        toast.error('Erreur: ' + error.message)
      }
    }
  }
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState([])

  const fetchOptions = useCallback(
    debounce(async newInputValue => {
      if (newInputValue.length >= 3) {
        try {
          const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/search`, {
            params: { query: newInputValue }
          })
          setOptions(response.data)
        } catch (error) {
          console.log(error)
          toast.error('Erreur lors de la récupération des produits')
        }
      } else {
        setOptions([])
      }
    }, 300),
    []
  )

  const handleInputChange = (event, newInputValue) => {
    setInputValue(newInputValue)
    fetchOptions(newInputValue)
  }

  useEffect(() => {
    const fetchComptes = async () => {
      try {
        const reponse = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}comptes/allComptesTaux`)
        setListcompte(reponse.data)
      } catch (error) {
        toast.error('Erreur lors de la récupération des comptes')
      }
    }

    fetchComptes()
  }, [])

  return (
    <CardContent>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={5}>
          <Grid item xs={12}>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              1. Informations sur le produit
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name='desPrd'
              control={control}
              rules={{ required: 'Ce champ est obligatoire' }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <CustomAutocomplete
                  fullWidth
                  options={options}
                  inputValue={inputValue}
                  onChange={(event, newValue) => {
                    // Permettre une nouvelle valeur si elle n'est pas dans les options
                    if (newValue && typeof newValue === 'string') {
                      onChange(newValue)
                    } else if (newValue && newValue.inputValue) {
                      onChange(newValue.inputValue)
                    } else {
                      onChange(newValue)
                    }
                  }}
                  onInputChange={handleInputChange}
                  isOptionEqualToValue={(option, value) => {
                    if (option && value) {
                      return option.designation_prd === value.designation_prd
                    }
                    return false
                  }}
                  getOptionLabel={option => option.designation_prd || option.inputValue || ''}
                  renderInput={params => (
                    <CustomTextField
                      {...params}
                      label='Désignation du produit'
                      placeholder='SSD XrayDisk 256Go'
                      error={!!error}
                      helperText={error ? error.message : ''}
                    />
                  )}
                  filterOptions={(options, params) => {
                    const filtered = createFilterOptions()(options, params)
                    if (params.inputValue !== '') {
                      filtered.push({
                        designation_prd: params.inputValue
                      })
                    }
                    return filtered
                  }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name='cat'
              control={control}
              rules={{ required: true }}
              render={({ field: { value, onChange } }) => (
                <CustomTextField
                  select
                  fullWidth
                  defaultValue=''
                  label='Catégorie'
                  SelectProps={{
                    value: value,
                    onChange: e => onChange(e)
                  }}
                  error={Boolean(errors.cat)}
                  {...(errors.cat && { helperText: 'Ce champ est obligatoire' })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start' sx={{ ml: '-10px', mr: 5 }}>
                        <IconButton
                          edge='end'
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => setDrawerOpen(true)}
                          color='info'
                        >
                          <Icon fontSize='1.25rem' icon='tabler:circle-plus' />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                >
                  {listCategorie.map(categorie => (
                    <MenuItem key={categorie.id_cat} value={categorie.id_cat}>
                      {categorie.designation_cat}
                    </MenuItem>
                  ))}
                </CustomTextField>
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ mb: '0 !important' }} />
          </Grid>

          <Grid item xs={12}>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
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
                    maxDate={dayjs()}
                    label="Date d'achat"
                    slotProps={{
                      textField: {
                        variant: 'outlined',
                        error: !!error,
                        helperText: error && 'Ce champ est obligatoire'
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
              render={({ field: { value, onChange } }) => (
                <CustomTextField
                  select
                  fullWidth
                  defaultValue=''
                  label='Compte de paiement'
                  SelectProps={{
                    value: value,
                    onChange: e => {
                      onChange(e)
                      handleCompteChange(e.target.value)
                    }
                  }}
                  error={Boolean(errors.cpt)}
                  {...(errors.cpt && { helperText: 'Ce champ est obligatoire' })}
                >
                  {listCompte.map(compte => (
                    <MenuItem key={compte.id_cpt} value={compte.id_cpt}>
                      {compte.designation_cpt}
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
              rules={{ required: true, min: 0 }}
              render={({ field: { value, onChange } }) => (
                <CustomTextField
                  fullWidth
                  type='number'
                  label='Montant total en devise'
                  autoComplete='off'
                  value={value}
                  onChange={e => {
                    onChange()
                    handleMontantChange(e.target.value)
                  }}
                  error={Boolean(errors.mntTotDev)}
                  {...(errors.mntTotDev && { helperText: 'Ce champ doit être supérieur à 0 ' })}
                  InputProps={{
                    endAdornment: <InputAdornment position='end'>{devise}</InputAdornment>
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
              render={({ field: { value, onChange } }) => (
                <CustomTextField
                  fullWidth
                  value={value}
                  type='number'
                  label='Quantité'
                  placeholder='1'
                  onChange={e => {
                    onChange()
                    handleQuantiteChange(e.target.value)
                  }}
                  error={Boolean(errors.qte)}
                  {...(errors.qte && { helperText: 'Ce champ doit être supérieur à 0' })}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ mb: '0 !important' }} />
          </Grid>

          <Grid item xs={12}>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              3. Informations supplémentaire sur les prix
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <CustomTextField
              name='taux'
              fullWidth
              label='Taux de change'
              value={taux}
              InputProps={{
                readOnly: true,
                endAdornment: <InputAdornment position='end'>DZD</InputAdornment>
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <CustomTextField
              name='mntDzd'
              fullWidth
              label='Montant total en Dinar'
              value={mntDzd}
              InputProps={{
                readOnly: true,
                endAdornment: <InputAdornment position='end'>DZD</InputAdornment>
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <CustomTextField
              name='puDev'
              fullWidth
              label='Prix unitaire en devise'
              value={puDev}
              InputProps={{
                readOnly: true,
                endAdornment: <InputAdornment position='end'>$</InputAdornment>
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <CustomTextField
              name='puDzd'
              fullWidth
              label='Prix unitaire en Dinar'
              value={puDzd}
              InputProps={{
                readOnly: true,
                endAdornment: <InputAdornment position='end'>DZD</InputAdornment>
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ mb: '0 !important' }} />
          </Grid>

          <Grid item xs={12}>
            <Button type='submit' variant='contained'>
              Ajouter
            </Button>
          </Grid>
        </Grid>
      </form>

      <Drawer
        anchor='right'
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{
          disablePortal: true,
          disableAutoFocus: true,
          disableScrollLock: true,
          keepMounted: true
        }}
      >
        <AjouterCategorie onClose={() => setDrawerOpen(false)} />
      </Drawer>
    </CardContent>
  )
}

export default AjouterProduit
