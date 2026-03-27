import { useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import useMediaQuery from '@mui/material/useMediaQuery'

import Icon from 'src/@core/components/icon'
import { useForm, Controller } from 'react-hook-form'
import { useProduit } from 'src/context/ProduitContext'
import CustomTextField from 'src/@core/components/mui/text-field'

const defaultValues = { desCat: '' }

const AjouterCategorie = ({ onClose }) => {
  const { ajouterCategorie } = useProduit()
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({ defaultValues })

  const onSubmit = async data => {
    if (await ajouterCategorie(data)) {
      reset()
      onClose()
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

      <form onSubmit={handleSubmit(onSubmit)} autoComplete='off'>
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
                  error={Boolean(errors.desCat)}
                  helperText={errors.desCat && 'Ce champ est obligatoire'}
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
