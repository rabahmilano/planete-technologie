import React, { useEffect, useState, useCallback } from 'react'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  CircularProgress,
  TableContainer
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import axios from 'axios'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Sector } from 'recharts'
import { stringToColor } from 'src/@core/utils/colorUtils'

// ====================================================================
// FONCTION POUR LE GRAPHIQUE INTERACTIF (AJOUTÉE ET COMPLÉTÉE)
// ====================================================================
const renderActiveShape = props => {
  const RADIAN = Math.PI / 180
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props
  const sin = Math.sin(-RADIAN * midAngle)
  const cos = Math.cos(-RADIAN * midAngle)
  const sx = cx + (outerRadius + 10) * cos
  const sy = cy + (outerRadius + 10) * sin
  const mx = cx + (outerRadius + 30) * cos
  const my = cy + (outerRadius + 30) * sin
  const ex = mx + (cos >= 0 ? 1 : -1) * 22
  const ey = my
  const textAnchor = cos >= 0 ? 'start' : 'end'

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor='middle' fill={fill}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill='none' />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke='none' />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill='#333'>{`${(
        value || 0
      ).toLocaleString('fr-DZ')} DA`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill='#999'>
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  )
}

const StatCard = ({ title, value, subValue = '', color = 'text.primary' }) => (
  <Card sx={{ textAlign: 'center', height: '100%' }}>
    <CardContent>
      <Typography variant='body2' sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Typography variant='h5' sx={{ fontWeight: 'bold', color }}>
        {value}
      </Typography>
      {subValue && <Typography variant='caption'>{subValue}</Typography>}
    </CardContent>
  </Card>
)

const ProductDetailModal = ({ open, onClose, productId }) => {
  const [loading, setLoading] = useState(true)
  const [details, setDetails] = useState(null)
  const [colis, setColis] = useState([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const [totalColis, setTotalColis] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)

  const fetchDetails = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique-prix/${productId}`)
      setDetails(response.data)
    } catch (error) {
      toast.error('Erreur de récupération des détails du produit.')
      onClose() // Ferme la modale en cas d'erreur
    }
  }, [productId, onClose])

  const fetchColis = useCallback(async () => {
    if (!productId) return
    try {
      const params = { page: page + 1, limit: rowsPerPage }
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}produits/historique-prix/${productId}/colis`,
        { params }
      )
      setColis(response.data.colis)
      setTotalColis(response.data.total)
    } catch (error) {
      toast.error('Erreur de récupération des colis du produit.')
    } finally {
      setLoading(false)
    }
  }, [productId, page, rowsPerPage])

  useEffect(() => {
    if (open) {
      setPage(0)
      fetchDetails()
    }
  }, [open, fetchDetails])

  useEffect(() => {
    if (open && details) {
      // On ne charge les colis que si les détails sont déjà là
      fetchColis()
    }
  }, [open, details, fetchColis])

  const onPieEnter = (_, index) => {
    setActiveIndex(index)
  }

  const ProfitBar = ({ percentage }) => {
    if (percentage === null || isNaN(percentage)) {
      return (
        <Typography variant='caption' color='textSecondary'>
          N/A
        </Typography>
      )
    }

    // Calcule la teinte (Hue) sur l'échelle HSL. 0 = Rouge, 120 = Vert.
    const hue = Math.min(120, Math.max(0, percentage * 1.2))
    const color = `hsl(${hue}, 80%, 45%)`

    return (
      <Box sx={{ position: 'relative', width: '100%', height: 22, bgcolor: 'grey.300', borderRadius: 1 }}>
        <Box
          sx={{
            width: `${Math.max(0, Math.min(100, percentage))}%`,
            height: '100%',
            bgcolor: color,
            borderRadius: 1,
            transition: 'width 0.5s ease-in-out'
          }}
        />
        <Typography
          variant='caption'
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'common.white',
            fontWeight: 600,
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
          }}
        >
          {`${percentage.toFixed(0)}%`}
        </Typography>
      </Box>
    )
  }

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
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
                    subValue={`${parseFloat(details.kpisAchat.maxDzd || 0).toLocaleString()} DA`}
                    color='error.main'
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <StatCard
                    title="Prix d'Achat Moyen"
                    value={`${parseFloat(details.kpisAchat.avgDev || 0).toFixed(2)} €`}
                    subValue={`${parseFloat(details.kpisAchat.avgDzd || 0).toLocaleString()} DA`}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <StatCard
                    title="Prix d'Achat Min"
                    value={`${parseFloat(details.kpisAchat.minDev || 0).toFixed(2)} €`}
                    subValue={`${parseFloat(details.kpisAchat.minDzd || 0).toLocaleString()} DA`}
                    color='success.main'
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <StatCard
                    title='Prix de Vente Max'
                    value={`${parseFloat(details.kpisVente.maxDa || 0).toLocaleString()} DA`}
                    color='error.main'
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <StatCard
                    title='Prix de Vente Moyen'
                    value={`${parseFloat(details.kpisVente.avgDa || 0).toLocaleString()} DA`}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <StatCard
                    title='Prix de Vente Min'
                    value={`${parseFloat(details.kpisVente.minDa || 0).toLocaleString()} DA`}
                    color='success.main'
                  />
                </Grid>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title='Analyse Financière (sur Ventes)' />
                  <CardContent>
                    <ResponsiveContainer width='100%' height={300}>
                      <PieChart>
                        <Pie
                          activeIndex={activeIndex}
                          activeShape={renderActiveShape}
                          data={details.chartData.financials}
                          cx='50%'
                          cy='50%'
                          innerRadius={80}
                          outerRadius={100}
                          fill={stringToColor('Bénéfice')}
                          dataKey='value'
                          onMouseEnter={onPieEnter}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title='Quantités Achetées par An' />
                  <CardContent>
                    <ResponsiveContainer width='100%' height={300}>
                      <LineChart data={details.chartData.qteParAnnee}>
                        <XAxis dataKey='year' />
                        <YAxis allowDecimals={false} />
                        <Tooltip formatter={value => [value, 'Quantité']} />
                        <Line type='monotone' dataKey='value' stroke='#82ca9d' strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Paper>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date d'Achat</TableCell>
                          <TableCell align='right'>Prix Achat (DZD)</TableCell>
                          <TableCell>Catégorie</TableCell>
                          <TableCell align='center'>Statut</TableCell>
                          <TableCell>Date Vente</TableCell>
                          <TableCell align='right'>Prix Vente</TableCell>
                          <TableCell align='right'>Bénéfice</TableCell>
                          <TableCell sx={{ minWidth: 120 }}>Taux de Marque (Vente)</TableCell>
                          <TableCell sx={{ minWidth: 120 }}>Taux de Marge (Achat)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {colis.map(c => {
                          const tauxDeMarque = c.prix_vente ? (c.benefice / c.prix_vente) * 100 : null
                          const tauxDeMarge = c.prix_achat_dzd > 0 ? (c.benefice / c.prix_achat_dzd) * 100 : null

                          return (
                            <TableRow key={c.id_colis}>
                              <TableCell>{dayjs(c.date_achat).format('DD/MM/YYYY')}</TableCell>
                              <TableCell align='right'>
                                {parseFloat(c.prix_achat_dzd || 0).toLocaleString('fr-DZ', {
                                  style: 'currency',
                                  currency: 'DZD'
                                })}
                              </TableCell>{' '}
                              <TableCell>{c.categorie}</TableCell>
                              <TableCell align='center'>
                                <Chip
                                  label={c.statut}
                                  color={
                                    c.statut === 'En Stock' ? 'success' : c.statut === 'Vendu' ? 'secondary' : 'warning'
                                  }
                                  size='small'
                                />
                              </TableCell>
                              <TableCell>{c.date_vente ? dayjs(c.date_vente).format('DD/MM/YYYY') : 'N/A'}</TableCell>
                              <TableCell align='right'>
                                {c.prix_vente !== null
                                  ? c.prix_vente.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })
                                  : 'N/A'}
                              </TableCell>
                              <TableCell align='right'>
                                {c.benefice !== null
                                  ? c.benefice.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })
                                  : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <ProfitBar percentage={tauxDeMarque} />
                              </TableCell>
                              <TableCell>
                                <ProfitBar percentage={tauxDeMarge} />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component='div'
                    count={totalColis}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={e => {
                      setRowsPerPage(parseInt(e.target.value, 10))
                      setPage(0)
                    }}
                  />
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )
      )}
    </Dialog>
  )
}

export default ProductDetailModal
