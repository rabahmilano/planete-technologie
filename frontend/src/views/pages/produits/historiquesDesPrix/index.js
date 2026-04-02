import React, { useEffect, useState, useCallback } from 'react'
import {
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Typography,
  Box,
  Pagination,
  CircularProgress,
  IconButton
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import { useProduitDashboard } from 'src/context/ProduitDashboardContext'
import { useDebounce } from 'src/@core/hooks/useDebounce'
import KpiCards from './KpiCards'
import ProductDetailModal from './ProductDetailModal'
import ProductCard from './ProductCard'

const HistoriqueDesPrixView = () => {
  const { fetchHistoriquePrix, fetchHistoriquePrixStats } = useProduitDashboard()

  const [produits, setProduits] = useState([])
  const [stats, setStats] = useState({ totalProduits: 0, produitsEnStock: 0, totalQteAchetee: 0 })
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)

  const [page, setPage] = useState(1)
  const [rowsPerPage] = useState(24)
  const [searchTerm, setSearchTerm] = useState('')

  const [isModalOpen, setModalOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState(null)

  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearchTerm])

  const loadProduits = useCallback(async () => {
    setLoading(true)
    const data = await fetchHistoriquePrix({
      page,
      limit: rowsPerPage,
      search: debouncedSearchTerm.length >= 2 ? debouncedSearchTerm : ''
    })
    setProduits(data.produits || [])
    setTotalItems(data.total || 0)
    setLoading(false)
  }, [page, rowsPerPage, debouncedSearchTerm, fetchHistoriquePrix])

  useEffect(() => {
    loadProduits()
  }, [loadProduits])

  useEffect(() => {
    const loadStats = async () => {
      const data = await fetchHistoriquePrixStats()
      if (data) setStats(data)
    }
    loadStats()
  }, [fetchHistoriquePrixStats])

  const handleProductClick = productId => {
    setSelectedProductId(productId)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedProductId(null)
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <KpiCards stats={stats} />
      </Grid>

      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3 }}>
          <CardContent>
            <TextField
              fullWidth
              size='small'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder='Rechercher un produit...'
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <Icon icon='tabler:search' fontSize='1.25rem' />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position='end'>
                    <IconButton size='small' onClick={() => setSearchTerm('')} edge='end'>
                      <Icon icon='tabler:x' fontSize='1.25rem' />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }}
            />
          </CardContent>
        </Card>
      </Grid>

      {loading ? (
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', my: 10 }}>
          <CircularProgress />
        </Grid>
      ) : produits.length === 0 ? (
        <Grid item xs={12} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10 }}>
          <Icon icon='tabler:search-off' fontSize='4rem' color='text.disabled' />
          <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
            Aucun produit trouvé.
          </Typography>
        </Grid>
      ) : (
        <Grid item xs={12} container spacing={6}>
          {produits.map(produit => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={produit.id_prd}>
              <ProductCard produit={produit} onClick={() => handleProductClick(produit.id_prd)} />
            </Grid>
          ))}
        </Grid>
      )}

      {totalItems > rowsPerPage && (
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={Math.ceil(totalItems / rowsPerPage)}
            page={page}
            onChange={(e, value) => setPage(value)}
            color='primary'
            shape='rounded'
          />
        </Grid>
      )}

      <ProductDetailModal open={isModalOpen} onClose={handleCloseModal} productId={selectedProductId} />
    </Grid>
  )
}

export default HistoriqueDesPrixView
