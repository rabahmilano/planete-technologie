import { useState, useCallback, useEffect } from 'react'
import {
  Grid,
  Button,
  Typography,
  Divider,
  CardContent,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Card,
  CardHeader
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { useForm, Controller } from 'react-hook-form'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

import CustomTextField from 'src/@core/components/mui/text-field'
import CustomAutocomplete from 'src/@core/components/mui/autocomplete'
import CustomChip from 'src/@core/components/mui/chip'
import CleaveInput from 'src/components/CleaveInput'
import { useProduit } from 'src/context/ProduitContext'
import { useSortieExceptionnelle } from 'src/context/SortieExceptionnelleContext'

dayjs.locale('fr')

const motifLabels = {
  UTILISATION_PERSONNELLE: 'Utilisation Personnelle',
  PERTE_LIVRAISON: 'Perte Livraison',
  CASSE_DEFECTUEUX: 'Casse / Défectueux',
  VENTE_A_CREDIT: 'Vente à Crédit',
  SAISIE_DOUANE: 'Saisie Douane'
}

const statutColors = {
  NON_APPLICABLE: 'secondary',
  EN_ATTENTE: 'warning',
  REMBOURSE: 'success',
  REFUSE: 'error'
}

const defaultValues = {
  produit: null,
  motif: '',
  dateSortie: dayjs(),
  qte: '',
  mntAttendu: '',
  observation: ''
}

const debounce = (fn, delay) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

const DeclarerSortieView = () => {
  const { searchAutocompleteProduits } = useProduit()
  const { declarerSortie, fetchSorties } = useSortieExceptionnelle()

  const [options, setOptions] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [recentSorties, setRecentSorties] = useState([])
  const [loadingRecent, setLoadingRecent] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm({ defaultValues })

  const selectedMotif = watch('motif')

  const loadRecentSorties = useCallback(async () => {
    setLoadingRecent(true)
    const res = await fetchSorties({ page: 1, limit: 5 })
    if (res && res.data) {
      setRecentSorties(res.data)
    }
    setLoadingRecent(false)
  }, [fetchSorties])

  useEffect(() => {
    loadRecentSorties()
  }, [loadRecentSorties])

  const handleSearch = useCallback(
    debounce(async val => {
      if (val && val.length >= 3) {
        setSearchLoading(true)
        const res = await searchAutocompleteProduits(val)
        setOptions(res || [])
        setSearchLoading(false)
      } else {
        setOptions([])
      }
    }, 300),
    [searchAutocompleteProduits]
  )

  const onSubmit = async data => {
    setIsSubmitting(true)

    const payload = {
      prd_id: data.produit.id_prd,
      qte: parseInt(data.qte, 10),
      motif: data.motif,
      date_sortie: data.dateSortie.toISOString(),
      observation: data.observation || null
    }

    if (data.mntAttendu && data.motif !== 'UTILISATION_PERSONNELLE' && data.motif !== 'SAISIE_DOUANE') {
      payload.mnt_attendu = parseFloat(data.mntAttendu)
    }

    const success = await declarerSortie(payload)

    if (success) {
      reset()
      setOptions([])
      loadRecentSorties()
    }
    setIsSubmitting(false)
  }

  const columns = [
    {
      flex: 0.2,
      field: 'date_sortie',
      headerName: 'Date',
      renderCell: params => (
        <Typography variant='body2'>{dayjs(params.row.date_sortie).format('DD/MM/YYYY')}</Typography>
      )
    },
    {
      flex: 0.3,
      field: 'produit',
      headerName: 'Produit',
      renderCell: params => (
        <Typography variant='body2' sx={{ fontWeight: 600 }}>
          {params.row.produit?.designation_prd}
        </Typography>
      )
    },
    {
      flex: 0.2,
      field: 'motif',
      headerName: 'Motif',
      renderCell: params => <Typography variant='body2'>{motifLabels[params.row.motif]}</Typography>
    },
    {
      flex: 0.15,
      field: 'qte_totale',
      headerName: 'Qté',
      renderCell: params => (
        <Typography variant='body2' sx={{ fontWeight: 700 }}>
          {params.row.qte_totale} U
        </Typography>
      )
    },
    {
      flex: 0.15,
      field: 'statut_remb',
      headerName: 'Statut',
      renderCell: params => (
        <CustomChip
          rounded
          size='small'
          skin='light'
          color={statutColors[params.row.statut_remb]}
          label={params.row.statut_remb.replace('_', ' ')}
        />
      )
    }
  ]

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader title='Déclarer une perte, casse ou utilisation personnelle' />
          <Divider sx={{ m: '0 !important' }} />
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} autoComplete='off'>
              <Grid container spacing={5}>
                <Grid item xs={12}>
                  <Typography variant='subtitle1' sx={{ fontWeight: 600, color: 'primary.main' }}>
                    1. Produit concerné
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name='produit'
                    control={control}
                    rules={{ required: 'Ce champ est obligatoire' }}
                    render={({ field: { onChange, value } }) => (
                      <CustomAutocomplete
                        fullWidth
                        options={options}
                        value={value}
                        getOptionLabel={opt => opt?.designation_prd || ''}
                        isOptionEqualToValue={(option, val) => option.id_prd === val.id_prd}
                        onInputChange={(e, val) => handleSearch(val)}
                        onChange={(e, val) => onChange(val)}
                        renderInput={params => (
                          <CustomTextField
                            {...params}
                            label='Rechercher un produit'
                            error={!!errors.produit}
                            helperText={errors.produit?.message}
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {searchLoading ? <CircularProgress color='inherit' size={20} /> : null}
                                  {params.InputProps.endAdornment}
                                </>
                              )
                            }}
                          />
                        )}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name='qte'
                    control={control}
                    rules={{ required: 'Ce champ est obligatoire', min: { value: 1, message: 'Minimum 1' } }}
                    render={({ field }) => (
                      <CustomTextField
                        fullWidth
                        label='Quantité'
                        {...field}
                        InputProps={{ inputComponent: CleaveInput }}
                        error={!!errors.qte}
                        helperText={errors.qte?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant='subtitle1' sx={{ fontWeight: 600, color: 'primary.main' }}>
                    2. Détails de la sortie
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name='motif'
                    control={control}
                    rules={{ required: 'Ce champ est obligatoire' }}
                    render={({ field }) => (
                      <CustomTextField
                        select
                        fullWidth
                        label='Motif'
                        {...field}
                        error={!!errors.motif}
                        helperText={errors.motif?.message}
                      >
                        {Object.entries(motifLabels).map(([key, label]) => (
                          <MenuItem key={key} value={key}>
                            {label}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name='dateSortie'
                    control={control}
                    rules={{ required: 'Ce champ est obligatoire' }}
                    render={({ field, fieldState: { error } }) => (
                      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                        <DatePicker
                          {...field}
                          label='Date de la sortie'
                          maxDate={dayjs()}
                          slotProps={{
                            textField: { fullWidth: true, error: !!error, helperText: error?.message }
                          }}
                        />
                      </LocalizationProvider>
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name='mntAttendu'
                    control={control}
                    render={({ field }) => (
                      <CustomTextField
                        fullWidth
                        label='Montant attendu (Optionnel)'
                        disabled={selectedMotif === 'UTILISATION_PERSONNELLE' || selectedMotif === 'SAISIE_DOUANE'}
                        {...field}
                        InputProps={{
                          inputComponent: CleaveInput,
                          endAdornment: <InputAdornment position='end'>DZD</InputAdornment>
                        }}
                        helperText={
                          selectedMotif === 'SAISIE_DOUANE'
                            ? 'Une saisie douanière ne donne droit à aucun remboursement.'
                            : 'Uniquement pour les pertes ou casses remboursables.'
                        }
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name='observation'
                    control={control}
                    render={({ field }) => <CustomTextField fullWidth label='Observation' {...field} />}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    type='submit'
                    variant='contained'
                    size='large'
                    sx={{ mt: 2 }}
                    disabled={isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={20} color='inherit' /> : null}
                  >
                    Enregistrer la sortie
                  </Button>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardHeader title='5 Dernières Déclarations' />
          <DataGrid
            autoHeight
            rows={recentSorties}
            columns={columns}
            loading={loadingRecent}
            getRowId={row => row.id_sortie}
            hideFooter
            disableColumnMenu
            sx={{
              '& .MuiDataGrid-columnHeaders': { backgroundColor: '#0d1b2a', color: 'white', borderRadius: 0 },
              '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold', color: 'white' },
              '& .MuiDataGrid-row:last-child .MuiDataGrid-cell': {
                borderBottom: '1px solid rgba(58, 53, 65, 0.12) !important'
              }
            }}
          />
        </Card>
      </Grid>
    </Grid>
  )
}

export default DeclarerSortieView
