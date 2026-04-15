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
  CircularProgress
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import dayjs from 'dayjs'
import { useProduit } from 'src/context/ProduitContext'

const CommandesFilters = ({ periodeFiltre, setPeriodeFiltre, produitFiltre, setProduitFiltre, onReset }) => {
  const [optionsAnnee, setOptionsAnnee] = useState([])
  const [options, setOptions] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedProduit, setSelectedProduit] = useState(null)

  const { searchAutocompleteProduits } = useProduit()

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

  return (
    <Card sx={{ boxShadow: 3 }}>
      <CardContent>
        <Grid container spacing={4} alignItems='center'>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              select
              label='Période'
              value={periodeFiltre}
              onChange={e => setPeriodeFiltre(e.target.value)}
            >
              <MenuItem value='all'>Toutes les périodes</MenuItem>
              <MenuItem value='1m'>1 Dernier Mois</MenuItem>
              <MenuItem value='3m'>3 Derniers Mois</MenuItem>
              <MenuItem value='6m'>6 Derniers Mois</MenuItem>
              {optionsAnnee.map(annee => (
                <MenuItem key={annee} value={annee}>
                  Année {annee}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
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

          <Grid item xs={12} sm={2}>
            <Box sx={{ display: 'flex', height: '100%', alignItems: 'center' }}>
              <Button
                fullWidth
                variant='outlined'
                color='secondary'
                onClick={onReset}
                startIcon={<Icon icon='tabler:reload' />}
              >
                Réinitialiser
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default CommandesFilters
