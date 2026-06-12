import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Grid,
  MenuItem,
  TextField,
  Button,
  Box,
  Autocomplete,
  CircularProgress,
  Collapse,
  Typography,
  Divider,
  Paper
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import { useProduit } from 'src/context/ProduitContext'

import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'

dayjs.locale('fr')

const CommandesFilters = ({
  periodeFiltre,
  setPeriodeFiltre,
  produitFiltre,
  setProduitFiltre,
  dateDebut,
  dateFin,
  onApplyCustomDates,
  onReset
}) => {
  const [optionsAnnee, setOptionsAnnee] = useState([])
  const [options, setOptions] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedProduit, setSelectedProduit] = useState(null)

  const [localDateDebut, setLocalDateDebut] = useState(dateDebut ? dayjs(dateDebut) : null)
  const [localDateFin, setLocalDateFin] = useState(dateFin ? dayjs(dateFin) : null)

  const { searchAutocompleteProduits } = useProduit()

  useEffect(() => {
    setLocalDateDebut(dateDebut ? dayjs(dateDebut) : null)
    setLocalDateFin(dateFin ? dayjs(dateFin) : null)
  }, [dateDebut, dateFin])

  useEffect(() => {
    const anneePremierAchat = 2023
    const anneeActuelle = dayjs().year()
    const options = Array.from({ length: anneeActuelle - anneePremierAchat + 1 }, (_, i) =>
      (anneeActuelle - i).toString()
    )
    setOptionsAnnee(options)
  }, [])

  useEffect(() => {
    if (inputValue.length < 3) {
      setOptions([])
      return
    }

    if (selectedProduit && inputValue === selectedProduit.designation_prd) {
      return
    }

    let isActive = true
    setLoading(true)

    const timeoutId = setTimeout(async () => {
      const data = await searchAutocompleteProduits(inputValue)
      if (isActive) {
        setOptions(data)
        setLoading(false)
      }
    }, 500)

    return () => {
      isActive = false
      clearTimeout(timeoutId)
    }
  }, [inputValue, selectedProduit, searchAutocompleteProduits])

  useEffect(() => {
    if (produitFiltre === 'all') {
      setSelectedProduit(null)
      setInputValue('')
      setOptions([])
    }
  }, [produitFiltre])

  const handlePeriodeChange = e => {
    const value = e.target.value
    setPeriodeFiltre(value)

    if (value !== 'custom') {
      setLocalDateDebut(null)
      setLocalDateFin(null)
      onApplyCustomDates(null, null)
    }
  }

  const handleApplyDates = () => {
    const start = localDateDebut ? localDateDebut.format('YYYY-MM-DD') : null
    const end = localDateFin ? localDateFin.format('YYYY-MM-DD') : null
    onApplyCustomDates(start, end)
  }

  return (
    <Card sx={{ boxShadow: 3, overflow: 'visible' }}>
      <CardContent sx={{ pb: '24px !important' }}>
        <Grid container spacing={5} alignItems='center'>
          {/* LIGNE 1 : FILTRES PRINCIPAUX */}
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              select
              label='Filtrer par Période'
              value={periodeFiltre}
              onChange={handlePeriodeChange}
            >
              <MenuItem value='all'>Toutes les périodes</MenuItem>
              <MenuItem value='1m'>1 Dernier Mois</MenuItem>
              <MenuItem value='3m'>3 Derniers Mois</MenuItem>
              <MenuItem value='6m'>6 Derniers Mois</MenuItem>
              <Divider sx={{ my: 1 }} />
              <MenuItem value='custom'>
                <Box sx={{ display: 'flex', alignItems: 'center', color: 'primary.main', fontWeight: 600 }}>
                  <Icon icon='tabler:calendar-search' style={{ marginRight: '8px' }} />
                  Période personnalisée
                </Box>
              </MenuItem>
              <Divider sx={{ my: 1 }} />
              {optionsAnnee.map(annee => (
                <MenuItem key={annee} value={annee}>
                  Année {annee}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={5}>
            <Autocomplete
              fullWidth
              options={options}
              getOptionLabel={option => option.designation_prd || ''}
              value={selectedProduit}
              onChange={(event, newValue) => {
                setSelectedProduit(newValue)
                setProduitFiltre(newValue ? newValue.id_prd : 'all')
              }}
              inputValue={inputValue}
              onInputChange={(event, newInputValue) => {
                setInputValue(newInputValue)
              }}
              loading={loading}
              noOptionsText={inputValue.length < 3 ? 'Tapez au moins 3 caractères...' : 'Aucun produit trouvé'}
              renderInput={params => (
                <TextField
                  {...params}
                  label='Chercher un produit...'
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress color='inherit' size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <Button
              fullWidth
              variant='outlined'
              color='secondary'
              onClick={onReset}
              startIcon={<Icon icon='tabler:reload' />}
              sx={{ height: '54px' }}
            >
              Réinitialiser
            </Button>
          </Grid>

          {/* LIGNE 2 : PÉRIODE PERSONNALISÉE (Avec belle animation de déroulement) */}
          <Grid item xs={12} sx={{ pt: '0 !important' }}>
            <Collapse in={periodeFiltre === 'custom'} timeout='auto' unmountOnExit>
              <Box sx={{ mt: 5 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 5,
                    border: theme => `1px dashed ${theme.palette.divider}`,
                    backgroundColor: theme => theme.palette.action.hover,
                    borderRadius: 2
                  }}
                >
                  <Typography
                    variant='subtitle2'
                    sx={{ mb: 4, display: 'flex', alignItems: 'center', color: 'text.secondary' }}
                  >
                    <Icon icon='tabler:calendar-stats' style={{ marginRight: '8px' }} />
                    Définissez votre plage de dates
                  </Typography>

                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                    <Grid container spacing={4} alignItems='center'>
                      <Grid item xs={12} sm={4}>
                        <DatePicker
                          label='Date de début'
                          value={localDateDebut}
                          onChange={newValue => setLocalDateDebut(newValue)}
                          maxDate={localDateFin || dayjs()}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              autoComplete: 'off',
                              sx: { bgcolor: 'background.paper' }
                            }
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <DatePicker
                          label='Date de fin'
                          value={localDateFin}
                          onChange={newValue => setLocalDateFin(newValue)}
                          minDate={localDateDebut}
                          maxDate={dayjs()}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              autoComplete: 'off',
                              sx: { bgcolor: 'background.paper' }
                            }
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <Button
                          fullWidth
                          variant='contained'
                          color='primary'
                          onClick={handleApplyDates}
                          startIcon={<Icon icon='tabler:search' />}
                          disabled={!localDateDebut || !localDateFin}
                          sx={{
                            height: '54px',
                            boxShadow: theme => theme.shadows[4],
                            '&:hover': { boxShadow: theme => theme.shadows[8] }
                          }}
                        >
                          Lancer la recherche
                        </Button>
                      </Grid>
                    </Grid>
                  </LocalizationProvider>
                </Paper>
              </Box>
            </Collapse>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default CommandesFilters
