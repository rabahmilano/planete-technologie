import React, { useState, useEffect } from 'react'
import { Grid, Typography, MenuItem, Box, Button, Autocomplete, InputAdornment } from '@mui/material'
import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import CleaveInput from 'src/components/CleaveInput'
import { formatMontant } from 'src/@core/utils/format'

const AjoutRapideLigne = ({ append, categories, rechercherProduits, deviseTrans }) => {
  const [draft, setDraft] = useState({ desPrd: '', catId: '', qte: '', puDevise: '' })
  const [options, setOptions] = useState([])
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (inputValue.length >= 3) {
        const results = await rechercherProduits(inputValue)
        setOptions(results || [])
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

  return (
    <Box>
      <Typography variant='h6' sx={{ mb: 4, fontWeight: 700, color: 'primary.main' }}>
        Ajouter un produit
      </Typography>
      <Grid container spacing={4} alignItems='flex-end'>
        <Grid item xs={12}>
          <Autocomplete
            freeSolo
            options={options.map(p => p.designation_prd)}
            inputValue={inputValue}
            onInputChange={(e, newInputValue) => {
              setInputValue(newInputValue || '')
              setDraft({ ...draft, desPrd: newInputValue || '' })
            }}
            renderInput={params => (
              <CustomTextField {...params} fullWidth label='Désignation du produit' autoComplete='off' />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <CustomTextField
            select
            fullWidth
            label='Catégorie'
            value={draft.catId}
            onChange={e => setDraft({ ...draft, catId: e.target.value })}
          >
            {categories?.map(cat => (
              <MenuItem key={cat.id_cat} value={cat.id_cat}>
                {cat.designation_cat}
              </MenuItem>
            ))}
          </CustomTextField>
        </Grid>
        <Grid item xs={12} sm={2}>
          <CustomTextField
            fullWidth
            label='Qté'
            autoComplete='off'
            value={draft.qte}
            onChange={e => setDraft({ ...draft, qte: e.target.value })}
            InputProps={{ inputComponent: CleaveInput }}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
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
        <Grid item xs={12} sm={3}>
          <CustomTextField
            fullWidth
            label='Total (Info)'
            value={formatMontant(totalLigne)}
            disabled
            sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
            InputProps={{
              endAdornment: <InputAdornment position='end'>{deviseTrans}</InputAdornment>
            }}
          />
        </Grid>
        <Grid item xs={12} sm={1} sx={{ textAlign: 'right' }}>
          <Button
            variant='contained'
            color='primary'
            onClick={handleAdd}
            disabled={!isFormValid}
            sx={{ minWidth: 45, px: 2, height: 38 }}
          >
            <Icon icon='tabler:plus' />
          </Button>
        </Grid>
      </Grid>
    </Box>
  )
}

export default AjoutRapideLigne
