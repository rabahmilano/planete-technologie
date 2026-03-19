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

import { useDepense } from 'src/context/DepenseContext'

import { useForm, Controller } from 'react-hook-form'

import CustomTextField from 'src/@core/components/mui/text-field'

const defaultValues = {
  natDep: ''
}

const AjouterTypeDepense = ({ onClose }) => {
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const { ajouterNatureDepense } = useDepense()

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    getValues
  } = useForm({ defaultValues })

  const onSubmit = async () => {
    const data = getValues()
    if (!data.natDep.trim()) {
      toast.error("Il y'a une erreur avec la désignation")
      return
    }

    const isSuccess = await ajouterNatureDepense(data)

    if (isSuccess) {
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
        <Typography variant='h4'>Nouveau type</Typography>
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
              name='natDep'
              control={control}
              rules={{ required: true }}
              render={({ field: { value, onChange } }) => (
                <CustomTextField
                  fullWidth
                  label='Désignation'
                  value={value}
                  onChange={onChange}
                  autoComplete='off'
                  error={Boolean(errors.natDep)}
                  {...(errors.natDep && { helperText: 'Ce champ est obligatoire' })}
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

export default AjouterTypeDepense
