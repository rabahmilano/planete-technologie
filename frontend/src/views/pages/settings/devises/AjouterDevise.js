// ** React Imports
// import { forwardRef } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Third Party Imports
import toast from 'react-hot-toast'
import { useForm, Controller } from 'react-hook-form'
import axios from 'axios'
import { useDevises } from 'src/context/DeviseContext'

const defaultValues = {
  nomDevise: '',
  codeDevise: '',
  symboleDevise: ''
}

// const CustomInput = forwardRef(({ ...props }, ref) => {
//   return <CustomTextField fullWidth inputRef={ref} {...props} sx={{ width: '100%' }} />
// })

const AjouterDevise = () => {
  const { fetchDevises } = useDevises()
  // ** Hooks
  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
    reset
  } = useForm({ defaultValues })

  const onSubmit = async () => {
    const data = getValues()
    const url = `${process.env.NEXT_PUBLIC_BASE_URL}devises/addDevise`

    try {
      const response = await axios.post(url, data)
      if (response.status === 201) {
        toast.success('Devise ajoutée avec succès')
        fetchDevises() // Mettre à jour la liste des devises
        reset() // Réinitialiser les champs après un succès
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 400) {
          toast.error('Erreur de validation: ' + error.response.data.errors.map(err => err.msg).join(', '))
        } else if (error.response.status === 409) {
          toast.error('La devise existe déjà')
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
      <CardHeader title='Ajouter une devise' />
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={5}>
            <Grid item xs={12} sm={6}>
              <Controller
                name='nomDevise'
                control={control}
                rules={{ required: true }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    fullWidth
                    value={value}
                    label='Nom devise'
                    onChange={onChange}
                    placeholder='Dollar américain'
                    autoComplete='off'
                    error={Boolean(errors.nomDevise)}
                    {...(errors.nomDevise && { helperText: 'Ce champ est obligatoire' })}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name='codeDevise'
                control={control}
                rules={{
                  required: 'Ce champ est obligatoire',
                  maxLength: {
                    value: 4,
                    message: '4 caractères maximum'
                  }
                }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    fullWidth
                    value={value}
                    label='Code Devise'
                    onChange={onChange}
                    placeholder='USD'
                    autoComplete='off'
                    error={Boolean(errors.codeDevise)}
                    {...(errors.codeDevise && { helperText: errors.codeDevise.message })}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name='symboleDevise'
                control={control}
                rules={{ required: true, maxLength: 4 }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    fullWidth
                    value={value}
                    label='Symbole'
                    onChange={onChange}
                    placeholder='$'
                    autoComplete='off'
                    error={Boolean(errors.symboleDevise)}
                    {...(errors.symboleDevise && { helperText: 'Ce champ est obligatoire' })}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Button type='submit' variant='contained'>
                Ajouter
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  )
}

export default AjouterDevise
