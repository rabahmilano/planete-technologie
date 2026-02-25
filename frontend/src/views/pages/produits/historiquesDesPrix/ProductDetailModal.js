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
  TableContainer,
  Collapse,

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

// --- COMPOSANT DE LIGNE EXTENSIBLE ---
// --- COMPOSANT DE LIGNE EXTENSIBLE ---
const ColisRow = ({ row }) => {
  const [open, setOpen] = useState(false);

  // Fonction pour styliser le statut avec les Chips MUI
  const renderStatus = (statut) => {
    switch (statut) {
      case "En Stock":
        return <Chip label={statut} color="success" size="small" variant="outlined" />;
      case "Vendu (Partiel)":
        return <Chip label={statut} color="warning" size="small" variant="outlined" />;
      case "Vendu (Totalement)":
        return <Chip label={statut} color="default" size="small" />;
      case "En Route":
        return <Chip label={statut} color="info" size="small" variant="outlined" />;
      default:
        return <Chip label={statut} size="small" />;
    }
  };

  return (
    <>
      <TableRow sx={{ "& > *": { borderBottom: "unset" }, backgroundColor: row.qte_stock === 0 ? 'rgba(0, 0, 0, 0.02)' : 'inherit' }}>
        <TableCell>
          <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
            <Icon icon={open ? 'tabler:chevron-up' : 'tabler:chevron-down'} />
          </IconButton>
        </TableCell>
        <TableCell>{dayjs(row.date_achat).format("DD/MM/YYYY")}</TableCell>
        
        {/* STATUT AVEC COULEUR */}
        <TableCell>{renderStatus(row.statut)}</TableCell>
        
        {/* QUANTITÉ INITIALE (Normale) */}
        <TableCell align="center">{row.qte_achat}</TableCell>
        
        {/* QUANTITÉ RESTANTE (Dynamique : Grise si 0, Gras/Vert si > 0) */}
        <TableCell align="center">
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: row.qte_stock > 0 ? 'bold' : 'normal',
              color: row.qte_stock > 0 ? 'success.main' : 'text.disabled'
            }}
          >
            {row.qte_stock}
          </Typography>
        </TableCell>
        
        <TableCell align="right">{row.prix_achat_dev}</TableCell>
        <TableCell align="right">
          {row.prix_achat_dzd.toLocaleString("fr-DZ", { style: "currency", currency: "DZD" })}
        </TableCell>
      </TableRow>
      
      {/* SOUS-TABLEAU DES VENTES (Caché par défaut) */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2, padding: 3, backgroundColor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Historique des ventes de ce lot
              </Typography>
              {row.ventes && row.ventes.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date de vente</TableCell>
                      <TableCell align="center">Quantité vendue</TableCell>
                      <TableCell align="right">Prix Vente</TableCell>
                      <TableCell align="right">Bénéfice unitaire</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {row.ventes.map((vente, index) => (
                      <TableRow key={index}>
                        <TableCell>{dayjs(vente.date_vente).format("DD/MM/YYYY")}</TableCell>
                        <TableCell align="center">{vente.qte_vendue}</TableCell>
                        <TableCell align="right">
                          {vente.prix_vente.toLocaleString("fr-DZ", { style: "currency", currency: "DZD" })}
                        </TableCell>
                        <TableCell align="right" sx={{ color: vente.benefice > 0 ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                          {vente.benefice > 0 ? "+" : ""}{vente.benefice.toLocaleString("fr-DZ", { style: "currency", currency: "DZD" })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucune vente enregistrée pour ce lot.
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

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

  // Fonction pour déterminer la couleur du bénéfice
  const getBeneficeColor = (benefice, coutAchat) => {
    if (benefice < 0) return "#E57373"; // Rouge doux (Perte)

    // On calcule le pourcentage de marge : (Bénéfice / Coût) * 100
    const marge = (benefice / coutAchat) * 100;

    if (marge < 100) {
      return "#FFB74D"; // Orange doux (Bénéfice minime, marge < 15%)
    }

    return "#81C784"; // Vert reposant (Bon bénéfice, marge >= 15%)
  };

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
                    {/* <ResponsiveContainer width='100%' height={300}>
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
                    </ResponsiveContainer> */}
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
                          dataKey='value'
                          onMouseEnter={onPieEnter}
                        >
                          {details.chartData.financials.map((entry, index) => {
                            // 1. Si la part est le "Coût", on met le Bleu Azur fixe
                            if (entry.name.includes("Coût")) {
                              return <Cell key={`cell-${index}`} fill="#4FC3F7" />;
                            }

                            // 2. Si c'est le "Bénéfice", on utilise ta fonction getBeneficeColor
                            // On récupère d'abord le coût total pour pouvoir calculer le % de marge
                            const coutAchatItem = details.chartData.financials.find(item => item.name.includes("Coût"));
                            const coutAchatValeur = coutAchatItem ? coutAchatItem.value : 1;

                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={getBeneficeColor(entry.value, coutAchatValeur)}
                              />
                            );
                          })}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title='Quantités Achetées par Année' />
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
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                  <TableContainer sx={{ maxHeight: '80vh', overflowY: 'scroll' }}>
                    <Table stickyHeader aria-label="sticky table">
                      <TableHead>
                        <TableRow>
                          <TableCell /> {/* Colonne vide pour la flèche */}
                          <TableCell>Date d'Achat</TableCell>
                          <TableCell>Statut</TableCell>
                          <TableCell align="center">Qté Initiale</TableCell>
                          <TableCell align="center">Qté Restante</TableCell>
                          <TableCell align="right">Prix Achat (Devise)</TableCell>
                          <TableCell align="right">Prix Achat (DZD)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {colis.map((row) => (
                          <ColisRow key={row.id_colis} row={row} />
                        ))}
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
