import React, { useEffect, useState, useCallback, forwardRef } from 'react'
import {
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Chip,
  CircularProgress,
  Slide
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import { useProduitDashboard } from 'src/context/ProduitDashboardContext'
import { formatMontant } from 'src/@core/utils/format'

import StatCard from './components/StatCard'
import ColisTable from './components/ColisTable'
import { FinancialPieChart, QuantityLineChart } from './components/ProductCharts'

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction='up' ref={ref} {...props} />
})

const ProductDetailModal = ({ open, onClose, productId }) => {
  const { fetchProductDetails, fetchProductColis } = useProduitDashboard()

  const [loading, setLoading] = useState(true)
  const [details, setDetails] = useState(null)
  const [colis, setColis] = useState([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const [totalColis, setTotalColis] = useState(0)

  const loadDetails = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    const data = await fetchProductDetails(productId)
    if (data) {
      setDetails(data)
    } else {
      onClose()
    }
  }, [productId, fetchProductDetails, onClose])

  const loadColis = useCallback(async () => {
    if (!productId) return
    const data = await fetchProductColis(productId, { page: page + 1, limit: rowsPerPage })
    setColis(data.colis || [])
    setTotalColis(data.total || 0)
    setLoading(false)
  }, [productId, page, rowsPerPage, fetchProductColis])

  useEffect(() => {
    if (open) {
      setPage(0)
      loadDetails()
    }
  }, [open, loadDetails])

  useEffect(() => {
    if (open && details) {
      loadColis()
    }
  }, [open, details, loadColis])

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      PaperProps={{ sx: { backgroundColor: 'rgba(248, 248, 248, 0.98)' } }}
    >
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </Box>
      ) : (
        details && (
          <Box sx={{ p: 6 }}>
            <AppBar color='default' sx={{ position: 'relative', boxShadow: 1, borderRadius: 1, mb: 4 }}>
              <Toolbar>
                <Typography variant='h6' sx={{ flex: 1 }}>
                  {details.produitInfo.designation}
                </Typography>
                <Chip
                  label={`${details.produitInfo.qteDispo} / ${details.produitInfo.qteAchetee}`}
                  color={details.produitInfo.qteDispo > 0 ? 'success' : 'error'}
                  sx={{ fontWeight: 'bold' }}
                />
                <IconButton edge='end' color='inherit' onClick={onClose} aria-label='close' sx={{ ml: 4 }}>
                  <Icon icon='tabler:x' />
                </IconButton>
              </Toolbar>
            </AppBar>

            <Grid container spacing={6}>
              <Grid item container xs={12} spacing={6}>
                <Grid item xs={12} md={4}>
                  <StatCard
                    title="Prix d'Achat Max"
                    value={`${parseFloat(details.kpisAchat.maxDev || 0).toFixed(2)} €`}
                    subValue={`${formatMontant(details.kpisAchat.maxDzd)} DA`}
                    color='error.main'
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <StatCard
                    title="Prix d'Achat Moyen"
                    value={`${parseFloat(details.kpisAchat.avgDev || 0).toFixed(2)} €`}
                    subValue={`${formatMontant(details.kpisAchat.avgDzd)} DA`}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <StatCard
                    title="Prix d'Achat Min"
                    value={`${parseFloat(details.kpisAchat.minDev || 0).toFixed(2)} €`}
                    subValue={`${formatMontant(details.kpisAchat.minDzd)} DA`}
                    color='success.main'
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <StatCard
                    title='Prix de Vente Max'
                    value={`${formatMontant(details.kpisVente.maxDa)} DA`}
                    color='error.main'
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <StatCard title='Prix de Vente Moyen' value={`${formatMontant(details.kpisVente.avgDa)} DA`} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <StatCard
                    title='Prix de Vente Min'
                    value={`${formatMontant(details.kpisVente.minDa)} DA`}
                    color='success.main'
                  />
                </Grid>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title='Analyse Financière (sur Ventes)' />
                  <CardContent>
                    <FinancialPieChart data={details.chartData.financials} />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title='Quantités Achetées par Année' />
                  <CardContent>
                    <QuantityLineChart data={details.chartData.qteParAnnee} />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <ColisTable
                  colis={colis}
                  totalColis={totalColis}
                  page={page}
                  rowsPerPage={rowsPerPage}
                  onPageChange={(e, newPage) => setPage(newPage)}
                  onRowsPerPageChange={e => {
                    setRowsPerPage(parseInt(e.target.value, 10))
                    setPage(0)
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        )
      )}
    </Dialog>
  )
}

export default ProductDetailModal
