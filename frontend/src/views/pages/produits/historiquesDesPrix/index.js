import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Typography,
  Box,
  Pagination,
  CircularProgress
} from '@mui/material'
import axios from 'axios'
import toast from 'react-hot-toast'
import Icon from 'src/@core/components/icon'

import ProductDetailModal from './ProductDetailModal' // Importez la nouvelle modale

// Hook personnalisé pour gérer le debounce de la recherche
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

// Sous-composant pour les cartes de statistiques
const KpiCards = ({ stats }) => (
  <Grid container spacing={6}>
    <Grid item xs={12} md={4}>
      <Card>
        <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
          <Icon icon='tabler:box' fontSize='2.5rem' color='var(--mui-palette-primary-main)' />
          <Box sx={{ ml: 4 }}>
            <Typography variant='h5'>{stats.totalProduits}</Typography>
            <Typography variant='body2'>Produits Uniques</Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} md={4}>
      <Card>
        <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
          <Icon icon='tabler:checkbox' fontSize='2.5rem' color='var(--mui-palette-success-main)' />
          <Box sx={{ ml: 4 }}>
            <Typography variant='h5'>{stats.produitsEnStock}</Typography>
            <Typography variant='body2'>Produits en Stock</Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} md={4}>
      <Card>
        <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
          <Icon icon='tabler:packages' fontSize='2.5rem' color='var(--mui-palette-info-main)' />
          <Box sx={{ ml: 4 }}>
            <Typography variant='h5'>{stats.totalQteAchetee}</Typography>
            <Typography variant='body2'>Articles Achetés (Total)</Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
)

// Sous-composant pour chaque carte de produit
const ProductCard = ({ produit, onClick }) => (
  <Card onClick={onClick} sx={{ cursor: 'pointer', height: '100%' }}>
    <CardContent>
      <Typography variant='h6' sx={{ mb: 2 }}>
        {produit.designation_prd}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant='body2'>Disponibilité :</Typography>
        <Typography
          variant='body1'
          sx={{ fontWeight: 'bold' }}
          color={produit.qte_dispo > 0 ? 'success.main' : 'error.main'}
        >
          {produit.qte_dispo}
        </Typography>
      </Box>
    </CardContent>
  </Card>
)

const HistoriqueDesPrixView = () => {
  const [produits, setProduits] = useState([])
  const [stats, setStats] = useState({ totalProduits: 0, produitsEnStock: 0, totalQteAchetee: 0 })
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)

  const [page, setPage] = useState(1) // La pagination est 1-indexée
  const [rowsPerPage, setRowsPerPage] = useState(24)
  const [searchTerm, setSearchTerm] = useState('')

  const [isModalOpen, setModalOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState(null)

  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  // CORRECTION: Réinitialise la page lors d'une nouvelle recherche
  useEffect(() => {
    setPage(1)
  }, [debouncedSearchTerm])

  const fetchProduits = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit: rowsPerPage,
        // Les paramètres de tri sont maintenant gérés par le backend
        search: debouncedSearchTerm.length >= 2 ? debouncedSearchTerm : ''
      }
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique-prix`, { params })
      setProduits(response.data.produits)
      setTotalItems(response.data.total)
    } catch (error) {
      toast.error('Erreur lors de la récupération des produits.')
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, debouncedSearchTerm])

  useEffect(() => {
    fetchProduits()
  }, [fetchProduits])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique-prix/stats`)
        setStats(response.data)
      } catch (error) {
        toast.error('Erreur de récupération des statistiques.')
      }
    }
    fetchStats()
  }, [])

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
        <Card>
          <CardContent>
            <TextField
              fullWidth
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder='Rechercher un produit...'
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <Icon icon='tabler:search' />
                  </InputAdornment>
                )
              }}
            />
          </CardContent>
        </Card>
      </Grid>

      {loading ? (
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', my: 10 }}>
          <CircularProgress />
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

      <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center' }}>
        <Pagination
          count={Math.ceil(totalItems / rowsPerPage)}
          page={page}
          onChange={(e, value) => setPage(value)}
          color='primary'
        />
      </Grid>

      <ProductDetailModal open={isModalOpen} onClose={handleCloseModal} productId={selectedProductId} />
    </Grid>
  )
}

export default HistoriqueDesPrixView
