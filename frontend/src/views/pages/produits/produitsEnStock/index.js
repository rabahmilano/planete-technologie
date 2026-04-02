import React, { useEffect, useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  InputAdornment,
  CircularProgress,
  Grid,
  alpha,
  useTheme,
  Chip,
  IconButton
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import { useProduitDashboard } from 'src/context/ProduitDashboardContext'
import ProductCard from './ProductCard'

const ProduitsEnStock = () => {
  const { fetchProduitsEnStock } = useProduitDashboard()
  const theme = useTheme()

  const [produits, setProduits] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const loadProduits = async () => {
      setLoading(true)
      const data = await fetchProduitsEnStock()
      if (isMounted) {
        setProduits(data || [])
        setLoading(false)
      }
    }
    loadProduits()

    return () => {
      isMounted = false
    }
  }, [fetchProduitsEnStock])

  const handleSearch = e => {
    setSearchQuery(e.target.value.toLowerCase())
  }

  const filteredProduits = useMemo(() => {
    return produits.filter(prd => prd.designation_prd.toLowerCase().includes(searchQuery))
  }, [produits, searchQuery])

  const totalProduits = produits.length
  const totalUnites = produits.reduce((acc, prd) => acc + prd.qte_dispo, 0)

  return (
    <Card sx={{ boxShadow: 3 }}>
      <Box
        sx={{
          p: 6,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          gap: 4,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                display: 'flex'
              }}
            >
              <Icon icon='tabler:box' fontSize='1.5rem' />
            </Box>
            <Typography variant='h5' sx={{ fontWeight: 'bold' }}>
              Inventaire en Stock
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={<Icon icon='tabler:tags' />}
              label={`${totalProduits} Références`}
              color='primary'
              variant='outlined'
              size='small'
            />
            <Chip
              icon={<Icon icon='tabler:packages' />}
              label={`${totalUnites} Unités au total`}
              color='success'
              variant='tonal'
              size='small'
            />
          </Box>
        </Box>

        <TextField
          size='small'
          value={searchQuery}
          onChange={handleSearch}
          placeholder='Chercher un produit...'
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <Icon icon='tabler:search' fontSize='1.25rem' />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position='end'>
                <IconButton size='small' onClick={() => setSearchQuery('')} edge='end' title='Effacer la recherche'>
                  <Icon icon='tabler:x' fontSize='1.25rem' />
                </IconButton>
              </InputAdornment>
            ) : null
          }}
          sx={{ width: { xs: '100%', md: 300 } }}
        />
      </Box>

      <CardContent sx={{ pt: 6, backgroundColor: alpha(theme.palette.background.default, 0.4) }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 15 }}>
            <CircularProgress size={50} />
          </Box>
        ) : filteredProduits.length === 0 ? (
          <Box
            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 15, textAlign: 'center' }}
          >
            <Icon icon='tabler:box-off' fontSize='4rem' color='text.disabled' />
            <Typography variant='h6' color='text.secondary'>
              {searchQuery ? `Aucun résultat pour "${searchQuery}".` : "L'entrepôt est vide."}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={4}>
            {filteredProduits.map(prd => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={prd.id_prd}>
                <ProductCard produit={prd} />
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  )
}

export default ProduitsEnStock
