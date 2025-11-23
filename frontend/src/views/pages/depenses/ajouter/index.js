// ** React Imports
import { forwardRef, useState, useEffect } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Drawer from '@mui/material/Drawer'

import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'

import AjouterTypeDepense from '../ajouterTypeDepense'

import dayjs from 'dayjs'
import 'dayjs/locale/fr'

dayjs.locale('fr')

import Icon from 'src/@core/components/icon'
// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Third Party Imports
import toast from 'react-hot-toast'
import { useForm, Controller } from 'react-hook-form'

import { useDepense } from 'src/context/DepenseContext'
import axios from 'axios'

const defaultValues = {
  cpt: '',
  montant: '',
  nature: '',
  dateDepense: dayjs()
}

const CustomInput = forwardRef(({ ...props }, ref) => {
  return <CustomTextField fullWidth inputRef={ref} {...props} sx={{ width: '100%' }} />
})

const AjouterDepense = () => {
  const { listNature } = useDepense()
  const [listCompte, setListCompte] = useState([])
  const [symboleDev, setSymboleDev] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  // ** Hooks
  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
    reset
  } = useForm({ defaultValues })

  const handleCompteChange = newCompte => {
    const selectedCompte = listCompte.find(compte => compte.id_cpt === newCompte)

    const newSymboleDev = selectedCompte.devise.symbole_dev
    setSymboleDev(newSymboleDev)
  }

  const onSubmit = async () => {
    const data = getValues()
    const formattedData = {
      ...data,
      montant: parseFloat(data.montant),
      dateDepense: dayjs(data.dateDepense).toISOString()
    }

    try {
      const url = `${process.env.NEXT_PUBLIC_BASE_URL}depenses/addDepense`
      const reponse = await axios.post(url, formattedData)

      if (reponse.status === 201) {
        toast.success('Dépense enregistré avec succès')
        reset()
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 400) {
          toast.error('Erreur de validation: ' + error.response.data.errors.map(err => err.msg).join(', '))
        } else if (error.response.status === 403) {
          toast.error(error.response.data.message)
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

  useEffect(() => {
    const fetchComptes = async () => {
      try {
        const reponse = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}comptes/allComptes`)

        setListCompte(reponse.data)
      } catch (error) {
        toast.error('Erreur lors de la récupération des comptes')
      }
    }

    fetchComptes()
  }, [])

  return (
    <Card>
      <CardHeader title='Déclaration des dépenses' />
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={5}>
            <Grid item xs={12}>
              <Controller
                name='dateDepense'
                control={control}
                rules={{ required: 'Ce champ est obligatoire' }}
                render={({ field, fieldState: { error } }) => (
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                    <DatePicker
                      {...field}
                      maxDate={dayjs()}
                      label='Date'
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

            <Grid item xs={12} sm={4}>
              <Controller
                name='nature'
                control={control}
                rules={{ required: true }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    select
                    fullWidth
                    defaultValue=''
                    label='Nature de dépense'
                    SelectProps={{
                      value: value,
                      onChange: e => onChange(e)
                    }}
                    error={Boolean(errors.nature)}
                    {...(errors.nature && { helperText: 'Ce champ est obligatoire' })}
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
                    {listNature.map(item => (
                      <MenuItem key={item.id_nat_dep} value={item.id_nat_dep}>
                        {item.designation_nat_dep}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
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

            <Grid item xs={12} sm={4}>
              <Controller
                name='montant'
                control={control}
                rules={{ required: true, min: 0 }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    fullWidth
                    type='number'
                    value={value}
                    onChange={onChange}
                    label='Montant'
                    autoComplete='off'
                    error={Boolean(errors.montant)}
                    {...(errors.montant && { helperText: 'Ce champ doit être supérieur à 0 ' })}
                    InputProps={{
                      endAdornment: <InputAdornment position='end'>{symboleDev}</InputAdornment>
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Button type='submit' variant='contained'>
                Submit
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>

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
        <AjouterTypeDepense onClose={() => setDrawerOpen(false)} />
      </Drawer>
    </Card>
  )
}

export default AjouterDepense
