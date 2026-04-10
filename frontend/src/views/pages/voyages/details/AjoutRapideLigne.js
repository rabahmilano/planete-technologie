import React, { useState, useEffect } from 'react'
import { Grid, Typography, Box, Button, Autocomplete, InputAdornment, CircularProgress } from '@mui/material'
import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import CleaveInput from 'src/components/CleaveInput'
import { formatMontant } from 'src/@core/utils/format'

const AjoutRapideLigne = ({ append, categories, rechercherProduits, deviseTrans }) => {
  const [draft, setDraft] = useState({ desPrd: '', catId: '', qte: '', puDevise: '' })
  const [options, setOptions] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (inputValue.length >= 3) {
        setLoading(true)
        const results = await rechercherProduits(inputValue)
        setOptions(results || [])
        setLoading(false)
      } else {
        setOptions([])
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [inputValue, rechercherProduits])

  const handleAdd = () => {
    if (draft.desPrd && draft.catId && draft.qte && draft.puDevise) {
      append({ ...draft })
      setDraft({ desPrd: '', catId: '', qte: '', puDevise: '' })
      setInputValue('')
    }
  }

  const isFormValid = draft.desPrd && draft.catId && draft.qte && draft.puDevise
  const qteVal = parseFloat(draft.qte) || 0
  const puVal = parseFloat(draft.puDevise) || 0
  const totalLigne = qteVal * puVal

  const selectedProduit = options.find(o => o.designation_prd === draft.desPrd) || null
  const selectedCategorie = categories?.find(c => c.id_cat === draft.catId) || null

  return (
    <Box>
      <Typography variant='subtitle1' sx={{ mb: 3, fontWeight: 700, color: 'primary.main' }}>
        Ajouter un produit
      </Typography>
      <Grid container spacing={3} alignItems='flex-end'>
        <Grid item xs={12} sm={8}>
          <Autocomplete
            fullWidth
            freeSolo
            options={options}
            getOptionLabel={option => (typeof option === 'string' ? option : option.designation_prd || '')}
            value={selectedProduit}
            onChange={(event, newValue) => {
              setDraft({
                ...draft,
                desPrd: typeof newValue === 'string' ? newValue : newValue?.designation_prd || '',
                catId: newValue?.id_cat || draft.catId
              })
            }}
            inputValue={inputValue}
            onInputChange={(event, newInputValue) => {
              setInputValue(newInputValue)
              setDraft({ ...draft, desPrd: newInputValue })
            }}
            loading={loading}
            noOptionsText={inputValue.length < 3 ? 'Tapez au moins 3 caractères...' : 'Aucun produit trouvé'}
            renderInput={params => (
              <CustomTextField
                {...params}
                label='Chercher ou saisir un produit...'
                autoComplete='off'
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
        <Grid item xs={12} sm={4}>
          <Autocomplete
            fullWidth
            options={categories || []}
            getOptionLabel={option => option.designation_cat || ''}
            value={selectedCategorie}
            onChange={(event, newValue) => {
              setDraft({ ...draft, catId: newValue ? newValue.id_cat : '' })
            }}
            renderInput={params => <CustomTextField {...params} label='Catégorie' autoComplete='off' />}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <CustomTextField
            fullWidth
            label='Qté'
            autoComplete='off'
            value={draft.qte}
            onChange={e => setDraft({ ...draft, qte: e.target.value })}
            InputProps={{ inputComponent: CleaveInput }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CustomTextField
            fullWidth
            label='Prix Unitaire'
            autoComplete='off'
            value={draft.puDevise}
            onChange={e => setDraft({ ...draft, puDevise: e.target.value })}
            InputProps={{
              inputComponent: CleaveInput,
              endAdornment: <InputAdornment position='end'>{deviseTrans}</InputAdornment>
            }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CustomTextField
            fullWidth
            label='Total (Info)'
            value={formatMontant(totalLigne)}
            disabled
            InputProps={{
              endAdornment: <InputAdornment position='end'>{deviseTrans}</InputAdornment>
            }}
          />
        </Grid>
        <Grid item xs={12} sm={1}>
          <Button
            variant='contained'
            color='primary'
            onClick={handleAdd}
            disabled={!isFormValid}
            sx={{ minWidth: '100%', px: 2, height: 38 }}
          >
            <Icon icon='tabler:plus' />
          </Button>
        </Grid>
      </Grid>
    </Box>
  )
}

export default AjoutRapideLigne
