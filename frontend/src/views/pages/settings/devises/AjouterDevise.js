import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { useForm, Controller } from 'react-hook-form'

import { useDevises } from 'src/context/DeviseContext'

const defaultValues = {
  nomDevise: '',
  codeDevise: '',
  symboleDevise: ''
}

const AjouterDevise = () => {
  const { ajouterDevise } = useDevises()

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({ defaultValues })

  const onSubmit = async data => {
    const isSuccess = await ajouterDevise(data)
    if (isSuccess) {
      reset(defaultValues)
    }
  }

  return (
    <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Icon icon='tabler:coin' fontSize='1.75rem' color='primary' />
            <Typography variant='h6'>Ajouter une devise</Typography>
          </Box>
        }
      />
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={5} alignItems='flex-end'>
            <Grid item xs={12} sm={4}>
              <Controller
                name='nomDevise'
                control={control}
                rules={{ required: true }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    fullWidth
                    value={value}
                    label='Nom de la devise'
                    onChange={onChange}
                    placeholder='Ex: Dollar américain'
                    autoComplete='off'
                    error={Boolean(errors.nomDevise)}
                    {...(errors.nomDevise && { helperText: 'Ce champ est obligatoire' })}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
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
                    placeholder='Ex: USD'
                    autoComplete='off'
                    error={Boolean(errors.codeDevise)}
                    {...(errors.codeDevise && { helperText: errors.codeDevise.message })}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
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
                    placeholder='Ex: $'
                    autoComplete='off'
                    error={Boolean(errors.symboleDevise)}
                    {...(errors.symboleDevise && { helperText: 'Ce champ est obligatoire' })}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button type='submit' variant='contained' startIcon={<Icon icon='tabler:device-floppy' />}>
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
