import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import InputAdornment from '@mui/material/InputAdornment'
import Typography from '@mui/material/Typography'

import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { useForm, Controller } from 'react-hook-form'

import { useCompte } from 'src/context/CompteContext'
import { useDevises } from 'src/context/DeviseContext'

const defaultValues = {
  typeCpt: '',
  desCpt: '',
  devise: '',
  commissionPct: ''
}

const CreerCompte = () => {
  const { ajouterCompte } = useCompte()
  const { devises } = useDevises()

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({ defaultValues })

  const onSubmit = async data => {
    const isSuccess = await ajouterCompte(data)
    if (isSuccess) {
      reset()
    }
  }

  return (
    <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Icon icon='tabler:building-bank' fontSize='1.75rem' color='primary' />
            <Typography variant='h6'>Ouvrir un nouveau compte</Typography>
          </Box>
        }
      />
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={5} alignItems='flex-end'>
            <Grid item xs={12} sm={6} md={3}>
              <Controller
                name='typeCpt'
                control={control}
                rules={{ required: true }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    select
                    fullWidth
                    label='Type du compte'
                    value={value}
                    onChange={onChange}
                    error={Boolean(errors.typeCpt)}
                    {...(errors.typeCpt && { helperText: 'Obligatoire' })}
                  >
                    <MenuItem value='commun'>Commun</MenuItem>
                    <MenuItem value='personnel'>Personnel</MenuItem>
                  </CustomTextField>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Controller
                name='desCpt'
                control={control}
                rules={{ required: true }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    fullWidth
                    label='Désignation'
                    value={value}
                    onChange={onChange}
                    placeholder='Ex: BEA Euro'
                    autoComplete='off'
                    error={Boolean(errors.desCpt)}
                    {...(errors.desCpt && { helperText: 'Obligatoire' })}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Controller
                name='devise'
                control={control}
                rules={{ required: true }}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    select
                    fullWidth
                    label='Devise'
                    value={value}
                    onChange={onChange}
                    error={Boolean(errors.devise)}
                    {...(errors.devise && { helperText: 'Obligatoire' })}
                  >
                    {devises?.map(devise => (
                      <MenuItem key={devise.code_dev} value={devise.code_dev}>
                        {devise.code_dev}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Controller
                name='commissionPct'
                control={control}
                render={({ field: { value, onChange } }) => (
                  <CustomTextField
                    fullWidth
                    type='number'
                    label='Commission'
                    value={value}
                    onChange={onChange}
                    placeholder='0.00'
                    InputProps={{
                      endAdornment: <InputAdornment position='end'>%</InputAdornment>
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button type='submit' variant='contained' startIcon={<Icon icon='tabler:device-floppy' />}>
                Enregistrer
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  )
}

export default CreerCompte
