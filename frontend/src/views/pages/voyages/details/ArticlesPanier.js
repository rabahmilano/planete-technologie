import React, { useState } from 'react'
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  IconButton,
  Button,
  Autocomplete,
  Card,
  CardContent
} from '@mui/material'
import { Controller, useFieldArray } from 'react-hook-form'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import CleaveInput from 'src/components/CleaveInput'
import { formatMontant } from 'src/@core/utils/format'
import { useProduit } from 'src/context/ProduitContext'

const AutocompleteCell = ({ field, error, rechercherProduits }) => {
  const [options, setOptions] = useState([])

  return (
    <Autocomplete
      freeSolo
      options={options.map(p => p.designation_prd)}
      value={field.value || ''}
      onChange={(event, newValue) => field.onChange(newValue || '')}
      onInputChange={async (event, newInputValue) => {
        field.onChange(newInputValue || '')
        if (newInputValue) {
          const results = await rechercherProduits(newInputValue)
          setOptions(results || [])
        } else {
          setOptions([])
        }
      }}
      renderInput={params => (
        <CustomTextField {...params} fullWidth size='small' error={!!error} helperText={error?.message} />
      )}
    />
  )
}

const ArticlesPanier = ({ control, watch, categories }) => {
  const { fields, append, remove } = useFieldArray({ control, name: 'articles' })
  const { rechercherProduits } = useProduit()

  const watchDevise = watch('deviseFacture')
  const watchArticles = watch('articles')

  return (
    <Card sx={{ overflow: 'visible', boxShadow: 3 }}>
      <CardContent sx={{ p: 6 }}>
        <Typography
          variant='subtitle1'
          sx={{ mb: 6, fontWeight: 700, color: 'primary.main', textTransform: 'uppercase' }}
        >
          2. Lignes de produits
        </Typography>

        <TableContainer sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 1, mb: 6 }}>
          <Table size='small'>
            <TableHead sx={{ backgroundColor: '#0d1b2a' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                  Désignation Produit
                </TableCell>
                <TableCell
                  sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2, width: '20%' }}
                >
                  Catégorie
                </TableCell>
                <TableCell
                  sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2, width: '12%' }}
                >
                  Qté
                </TableCell>
                <TableCell
                  sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2, width: '15%' }}
                >
                  PU ({watchDevise})
                </TableCell>
                <TableCell
                  align='right'
                  sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2, width: '15%' }}
                >
                  Total
                </TableCell>
                <TableCell
                  align='center'
                  sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2, width: '5%' }}
                ></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fields.map((item, index) => {
                const qteLigne = parseFloat(watchArticles[index]?.qte) || 0
                const puLigne = parseFloat(watchArticles[index]?.puDevise) || 0
                const totalLigne = qteLigne * puLigne

                return (
                  <TableRow key={item.id}>
                    <TableCell sx={{ py: 3 }}>
                      <Controller
                        name={`articles.${index}.desPrd`}
                        control={control}
                        rules={{ required: 'Obligatoire' }}
                        render={({ field, fieldState: { error } }) => (
                          <AutocompleteCell field={field} error={error} rechercherProduits={rechercherProduits} />
                        )}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 3 }}>
                      <Controller
                        name={`articles.${index}.catId`}
                        control={control}
                        rules={{ required: 'Obligatoire' }}
                        render={({ field, fieldState: { error } }) => (
                          <CustomTextField
                            select
                            fullWidth
                            size='small'
                            error={!!error}
                            helperText={error?.message}
                            {...field}
                          >
                            {categories?.map(cat => (
                              <MenuItem key={cat.id_cat} value={cat.id_cat}>
                                {cat.designation_cat}
                              </MenuItem>
                            ))}
                          </CustomTextField>
                        )}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 3 }}>
                      <Controller
                        name={`articles.${index}.qte`}
                        control={control}
                        rules={{ required: 'Obligatoire', min: 1 }}
                        render={({ field, fieldState: { error } }) => (
                          <CustomTextField
                            {...field}
                            fullWidth
                            size='small'
                            error={!!error}
                            helperText={error?.message}
                            autoComplete='off'
                            InputProps={{ inputComponent: CleaveInput }}
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 3 }}>
                      <Controller
                        name={`articles.${index}.puDevise`}
                        control={control}
                        rules={{ required: 'Obligatoire', min: 0 }}
                        render={({ field, fieldState: { error } }) => (
                          <CustomTextField
                            {...field}
                            fullWidth
                            size='small'
                            error={!!error}
                            helperText={error?.message}
                            autoComplete='off'
                            InputProps={{ inputComponent: CleaveInput }}
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell align='right' sx={{ fontWeight: 600, py: 3 }}>
                      {formatMontant(totalLigne)}
                    </TableCell>
                    <TableCell align='center' sx={{ py: 3 }}>
                      <IconButton
                        color='error'
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        size='small'
                      >
                        <Icon icon='tabler:trash' fontSize='1.2rem' />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Button
          variant='outlined'
          color='primary'
          size='small'
          startIcon={<Icon icon='tabler:plus' />}
          onClick={() => append({ desPrd: '', catId: '', qte: '', puDevise: '' })}
        >
          Ajouter une ligne
        </Button>
      </CardContent>
    </Card>
  )
}

export default ArticlesPanier
