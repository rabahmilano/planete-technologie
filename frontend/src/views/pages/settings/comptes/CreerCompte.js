// ** React Imports
import { forwardRef, useState, useEffect } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Third Party Imports
import toast from 'react-hot-toast'
import { useForm, Controller } from 'react-hook-form'
import axios from 'axios'

import { useCompte } from 'src/context/CompteContext'

const defaultValues = {
  typeCpt: '',
  desCpt: '',
  devise: ''
}

const CustomInput = forwardRef(({ ...props }, ref) => {
  return <CustomTextField fullWidth inputRef={ref} {...props} sx={{ width: '100%' }} />
})

const CreerCompte = () => {
  const [devisesList, setDevisesList] = useState([])
  const { fetchComptes } = useCompte()

  // ** Hooks
  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
    reset
  } = useForm({ defaultValues })

  useEffect(() => {
    const fetchDevises = async () => {
      try {
        const reponse = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}devises/allDevises`)
        setDevisesList(reponse.data)
      } catch (error) {
        console.error('Erreur lors de la récupération des devises:', error)
      }
    }
    fetchDevises()
  }, [])

  const onSubmit = async () => {
    const data = getValues()
    const url = `${process.env.NEXT_PUBLIC_BASE_URL}comptes/addCompte`

    try {
      const reponse = await axios.post(url, data)
      if (reponse.status === 201) {
        toast.success('Compte créer avec succès')
        fetchComptes() // Mettre à jour la liste des devises
        // fetchDevisesDetails()
        reset() // Réinitialiser les champs après un succès
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 400) {
          toast.error('Erreur de validation: ' + error.response.data.errors.map(err => err.msg).join(', '))
        } else if (error.response.status === 403) {
          toast.error('Le compte existe déjà')
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

  return (
    <Card>
      <CardHeader title='Ajouter un compte' />
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={5}>
            <Grid item xs={12} sm={4}>
              <Controller
                name='typeCpt'
                control={control}
                rules={{ required: true }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    select
                    fullWidth
                    defaultValue=''
                    label='Type du compte'
                    SelectProps={{
                      value: value,
                      onChange: e => onChange(e)
                    }}
                    error={Boolean(errors.typeCpt)}
                    {...(errors.typeCpt && { helperText: 'Ce champ est obligatoire' })}
                  >
                    <MenuItem value='commun'>Commun</MenuItem>
                    <MenuItem value='personnel'>Personnel</MenuItem>
                  </CustomTextField>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Controller
                name='desCpt'
                control={control}
                rules={{ required: true }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    fullWidth
                    value={value}
                    label='Désignation du compte'
                    onChange={onChange}
                    placeholder='WISE'
                    autoComplete='off'
                    error={Boolean(errors.desCpt)}
                    {...(errors.desCpt && { helperText: 'Ce champ est obligatoire' })}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Controller
                name='devise'
                control={control}
                rules={{ required: true }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    select
                    fullWidth
                    defaultValue=''
                    label='Devise'
                    SelectProps={{
                      value: value,
                      onChange: e => onChange(e)
                    }}
                    error={Boolean(errors.devise)}
                    {...(errors.devise && { helperText: 'Ce champ est obligatoire' })}
                  >
                    {devisesList.map(devise => (
                      <MenuItem key={devise.code_dev} value={devise.code_dev}>
                        {devise.code_dev}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Button type='submit' variant='contained'>
                Créer
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  )
}

export default CreerCompte
