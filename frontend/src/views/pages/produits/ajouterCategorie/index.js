import { useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import useMediaQuery from '@mui/material/useMediaQuery'

import Icon from 'src/@core/components/icon'
import toast from 'react-hot-toast'

import axios from 'axios'

// ** Third Party Imports
import { useForm, Controller } from 'react-hook-form'
import { useProduit } from 'src/context/ProduitContext'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

const defaultValues = {
  desCat: ''
}

const AjouterCategorie = ({ onClose }) => {
  const { fetchCategories } = useProduit()
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    getValues
  } = useForm({ defaultValues })

  const onSubmit = async () => {
    const data = getValues()
    const url = `${process.env.NEXT_PUBLIC_BASE_URL}produits/addCategorie`
    try {
      const reponse = await axios.post(url, data)
      if (reponse.status === 201) {
        toast.success('La catégorie a été ajoutée')
        fetchCategories()
        reset()
        onClose()
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

  return (
    <Box sx={{ width: isSmallScreen ? '100vw' : 350, padding: 5 }}>
      <Box
        className='sidebar-header'
        sx={{
          paddingTop: 3,
          paddingBottom: 6,
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        <Typography variant='h4'>Nouvelle catégorie</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            size='small'
            onClick={() => onClose()}
            sx={{
              p: '0.375rem',
              borderRadius: 1,
              color: 'text.primary',
              backgroundColor: 'action.selected',
              '&:hover': {
                backgroundColor: theme => `rgba(${theme.palette.customColors.main}, 0.16)`
              }
            }}
          >
            <Icon icon='tabler:x' fontSize='1.25rem' />
          </IconButton>
        </Box>
      </Box>

      <Divider sx={{ mb: 8 }} />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={5}>
          <Grid item xs={12}>
            <Controller
              name='desCat'
              control={control}
              rules={{ required: true }}
              render={({ field: { value, onChange } }) => (
                <CustomTextField
                  fullWidth
                  label='Désignation'
                  value={value}
                  onChange={onChange}
                  autoComplete='off'
                  error={Boolean(errors.desCat)}
                  {...(errors.desCat && { helperText: 'Ce champ est obligatoire' })}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Button type='submit' variant='contained' fullWidth>
              Ajouter
            </Button>
          </Grid>
        </Grid>
      </form>
    </Box>
  )
}

export default AjouterCategorie
