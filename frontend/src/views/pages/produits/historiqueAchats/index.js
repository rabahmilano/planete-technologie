import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  TextField,
  InputAdornment,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  Box,
  Chip,
  TablePagination,
  MenuItem,
  Paper,
  Button,
  Slider,
  IconButton,
  Menu, // Ajouté pour le menu d'actions
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab
} from '@mui/material'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useKeenSlider } from 'keen-slider/react'
import 'keen-slider/keen-slider.min.css'
import axios from 'axios'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import Icon from 'src/@core/components/icon'
import { useProduit, ProduitProvider } from 'src/context/ProduitContext'
import { stringToColor } from 'src/@core/utils/colorUtils'
import { Controller, useForm } from 'react-hook-form'

dayjs.locale('fr')

// Hook personnalisé pour gérer le debounce
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

const KpiCards = ({ stats }) => (
  <Grid container spacing={6}>
    <Grid item xs={12} md={4}>
      <Card>
        <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
          <Icon icon='tabler:archive' fontSize='2.5rem' color='var(--mui-palette-primary-main)' />
          <Box sx={{ ml: 4 }}>
            <Typography variant='h5'>{stats.totalCount}</Typography>
            <Typography variant='body2'>Colis Trouvés</Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} md={4}>
      <Card>
        <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
          <Icon icon='tabler:packages' fontSize='2.5rem' color='var(--mui-palette-info-main)' />
          <Box sx={{ ml: 4 }}>
            <Typography variant='h5'>{stats.totalProduits}</Typography>
            <Typography variant='body2'>Produits Trouvés</Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} md={4}>
      <Card>
        <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
          <Icon icon='tabler:cash' fontSize='2.5rem' color='var(--mui-palette-success-main)' />
          <Box sx={{ ml: 4 }}>
            <Typography variant='h5'>
              {parseFloat(stats.totalValueDZD || 0).toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
            </Typography>
            <Typography variant='body2'>Valeur Totale</Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
)

// ====================================================================
// NOUVEAU SOUS-COMPOSANT: La modale de modification avec onglets
// ====================================================================
const EditColisModal = ({ open, onClose, colis, listCategorie, onSuccess, initialTab }) => {
  const [activeTab, setActiveTab] = useState('categorie')

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm()

  const watchDateAchat = watch('date_achat')
  const watchDateStock = watch('date_stock')

  // Met à jour l'onglet actif quand la modale s'ouvre
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab)
    }
  }, [open, initialTab])

  useEffect(() => {
    if (colis) {
      setValue('cat_id', colis.cat_id)
      setValue('date_achat', dayjs(colis.date_achat))
      setValue('date_stock', colis.date_stock ? dayjs(colis.date_stock) : null)
      setValue('new_price', colis.mnt_tot_dev)
    }
  }, [colis, setValue])

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue)
  }

  const onSubmit = async data => {
    let dataToUpdate = {}

    // On construit l'objet de données à envoyer en fonction de l'onglet actif
    switch (activeTab) {
      case 'categorie':
        dataToUpdate = { cat_id: data.cat_id }
        break
      case 'dates':
        dataToUpdate = {
          date_achat: data.date_achat ? dayjs(data.date_achat).toISOString() : null,
          date_stock: data.date_stock ? dayjs(data.date_stock).toISOString() : null
        }
        break
      case 'prix':
        dataToUpdate = { new_price: data.new_price }
        break
      default:
        toast.error('Onglet de modification non valide.')
        return
    }

    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique/${colis.id_colis}`, dataToUpdate)
      toast.success('Colis mis à jour avec succès !')
      onSuccess() // Appelle la fonction du parent pour fermer la modale et rafraîchir les données
    } catch (error) {
      console.error('Erreur lors de la mise à jour du colis:', error)
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour.')
    }
  }

  if (!colis) return null

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>Modifier le Colis : {colis.produit.designation_prd}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers sx={{ p: 0 }}>
          <Tabs value={activeTab} onChange={handleTabChange} variant='fullWidth'>
            <Tab value='categorie' label='Catégorie' />
            <Tab value='dates' label='Dates' />
            <Tab value='prix' label='Prix' />
          </Tabs>

          <Box sx={{ p: 5 }}>
            {activeTab === 'categorie' && (
              <Controller
                name='cat_id'
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <TextField {...field} select fullWidth label='Catégorie'>
                    {listCategorie.map(cat => (
                      <MenuItem key={cat.id_cat} value={cat.id_cat}>
                        {cat.designation_cat}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            )}

            {activeTab === 'dates' && (
              <Grid container spacing={4}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name='date_achat'
                    control={control}
                    rules={{
                      validate: value =>
                        !watchDateStock ||
                        dayjs(value).isBefore(dayjs(watchDateStock)) ||
                        'Doit être avant la date de stockage.'
                    }}
                    render={({ field, fieldState }) => (
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                          {...field}
                          label="Date d'Achat"
                          maxDate={dayjs()}
                          sx={{ width: '100%' }}
                          slotProps={{
                            textField: { error: !!fieldState.error, helperText: fieldState.error?.message }
                          }}
                        />
                      </LocalizationProvider>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name='date_stock'
                    control={control}
                    render={({ field }) => (
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                          {...field}
                          label='Date de Stock'
                          disabled={!colis.date_stock}
                          maxDate={dayjs()}
                          sx={{ width: '100%' }}
                        />
                      </LocalizationProvider>
                    )}
                  />
                </Grid>
              </Grid>
            )}

            {activeTab === 'prix' && (
              <Grid container spacing={4}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Prix Actuel'
                    value={`${parseFloat(colis.mnt_tot_dev || 0).toFixed(2)} ${colis.compte.devise.symbole_dev}`}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name='new_price'
                    control={control}
                    rules={{ required: true, min: 0.01 }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type='number'
                        fullWidth
                        label='Nouveau Prix'
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position='start'>{colis.compte.devise.symbole_dev}</InputAdornment>
                          )
                        }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Annuler</Button>
          <Button type='submit' variant='contained'>
            Sauvegarder
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
const HistoriqueAchatsView = () => {
  const { listCategorie, listCompte } = useProduit()
  const [colis, setColis] = useState([])
  const [stats, setStats] = useState({ totalCount: 0, totalValueDZD: 0, totalProduits: 0 })
  const [totalItems, setTotalItems] = useState(0)

  // États pour les filtres
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [categorieFilter, setCategorieFilter] = useState('')
  const [compteFilter, setCompteFilter] = useState('')
  const [dateRange, setDateRange] = useState([null, null])

  const [sortBy, setSortBy] = useState('date_achat')
  const [sortOrder, setSortOrder] = useState('desc')

  // États pour les graphiques
  const [chartDataCategory, setChartDataCategory] = useState([])
  const [chartDataYear, setChartDataYear] = useState([])
  const [chartDataAccount, setChartDataAccount] = useState([])
  const [chartDataTopProducts, setChartDataTopProducts] = useState([])

  // États pour le menu d'actions
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedColis, setSelectedColis] = useState(null)
  const [isEditModalOpen, setEditModalOpen] = useState(false) // Pour la nouvelle modale
  const [initialTab, setInitialTab] = useState('categorie') // Nouvel état pour l'onglet

  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  const filters = useMemo(
    () => ({
      search: debouncedSearchTerm.length >= 2 ? debouncedSearchTerm : '',
      statut: statutFilter,
      categorieId: categorieFilter,
      compteId: compteFilter,
      dateDebut: dateRange[0] ? dayjs(dateRange[0]).startOf('day').toISOString() : '',
      dateFin: dateRange[1] ? dayjs(dateRange[1]).endOf('day').toISOString() : ''
    }),
    [debouncedSearchTerm, statutFilter, categorieFilter, compteFilter, dateRange]
  )

  const fetchData = useCallback(async () => {
    try {
      const params = { page: page + 1, limit: rowsPerPage, sortBy, sortOrder, ...filters }
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique`, { params })
      setColis(response.data.colis)
      setTotalItems(response.data.total)
    } catch (error) {
      toast.error("Erreur lors de la récupération de l'historique.")
    }
  }, [page, rowsPerPage, sortBy, sortOrder, filters])

  const fetchStatsAndCharts = useCallback(async () => {
    try {
      const [statsRes, catChartRes, yearChartRes, accChartRes, topPrdChartRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique/stats`, { params: filters }),
        // axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique/charts/by-category`, { params: filters }),
        axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique/charts/by-category`),
        axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique/charts/by-year`),
        axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique/charts/by-account`),
        axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique/charts/top-products`)
      ])
      setStats(statsRes.data)
      setChartDataCategory(catChartRes.data)
      setChartDataYear(yearChartRes.data)
      setChartDataAccount(accChartRes.data)
      setChartDataTopProducts(topPrdChartRes.data)
    } catch (error) {
      toast.error('Erreur de récupération des données analytiques.')
    }
  }, [filters])

  useEffect(() => {
    fetchData()
    fetchStatsAndCharts()
  }, [fetchData, fetchStatsAndCharts])

  useEffect(() => {
    if (listCategorie.length > 0 && listCompte.length > 0) {
      const defaultCategory = listCategorie.find(c => c.designation_cat === 'MARCHANDISE')
      if (defaultCategory) setCategorieFilter(defaultCategory.id_cat)
      const defaultCompte = listCompte.find(c => c.designation_cpt === 'Wise')
      if (defaultCompte) setCompteFilter(defaultCompte.id_cpt)
    }
  }, [listCategorie, listCompte])

  const handleSort = property => {
    const isAsc = sortBy === property && sortOrder === 'asc'
    setSortOrder(isAsc ? 'desc' : 'asc')
    setSortBy(property)
  }

  const handleResetFilters = () => {
    setSearchTerm('')
    setStatutFilter('')
    setCategorieFilter('')
    setCompteFilter('')
    setDateRange([null, null])
    setPage(0)
  }

  const [sliderRef] = useKeenSlider({
    slidesPerView: 2,
    spacing: 15,
    breakpoints: { '(max-width: 960px)': { slidesPerView: 1 } }
  })

  const handleMenuOpen = (event, colisItem) => {
    setAnchorEl(event.currentTarget)
    setSelectedColis(colisItem)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const openEditModal = tab => {
    if (selectedColis) {
      setInitialTab(tab) // On définit l'onglet à ouvrir
      setEditModalOpen(true)
    }
    handleMenuClose()
  }

  const handleSuccess = () => {
    fetchData()
    setEditModalOpen(false)
    setSelectedColis(null)
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <KpiCards stats={stats} />
      </Grid>
      <Grid item xs={12} lg={6}>
        <Card>
          <CardHeader title='Analyses Graphiques' />
          <CardContent>
            <Box ref={sliderRef} className='keen-slider'>
              <Box className='keen-slider__slide'>
                <Typography align='center' variant='h6' gutterBottom>
                  Achats par Catégorie
                </Typography>
                <ResponsiveContainer width='100%' height={250}>
                  <PieChart>
                    <Pie
                      data={chartDataCategory}
                      dataKey='value'
                      nameKey='name'
                      cx='50%'
                      cy='50%'
                      outerRadius={90}
                      label
                    >
                      {chartDataCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={stringToColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              {/* Ajoutez d'autres slides pour les autres graphiques ici */}
              <Box className='keen-slider__slide'>
                <Typography align='center' variant='h6' gutterBottom>
                  Achats par Année
                </Typography>
                <ResponsiveContainer width='100%' height={250}>
                  <BarChart data={chartDataYear} margin={{ left: 20 }}>
                    <XAxis dataKey='year' />
                    <YAxis />
                    <Tooltip formatter={value => [`${value} colis`, 'Total']} />
                    <Bar dataKey='value' fill='#8884d8' />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              <Box className='keen-slider__slide'>
                <Typography align='center' variant='h6' gutterBottom>
                  Achats par Compte
                </Typography>
                <ResponsiveContainer width='100%' height={250}>
                  <PieChart>
                    <Pie
                      data={chartDataAccount}
                      dataKey='value'
                      nameKey='name'
                      cx='50%'
                      cy='50%'
                      outerRadius={90}
                      label
                    >
                      {chartDataAccount.map(entry => (
                        <Cell key={`cell-${entry.name}`} fill={stringToColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box className='keen-slider__slide'>
                <Typography align='center' variant='h6' gutterBottom>
                  Top 5 Produits (Qté)
                </Typography>
                <ResponsiveContainer width='100%' height={250}>
                  <BarChart data={chartDataTopProducts} layout='vertical' margin={{ left: 0 }}>
                    <XAxis type='number' />
                    <YAxis type='category' dataKey='name' width={100} tick={{ fontSize: 10 }} interval={0} />
                    <Tooltip formatter={value => [value, 'Quantité']} />
                    <Bar dataKey='value' fill='#82ca9d' />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} lg={6}>
        <Card>
          <CardHeader title='Filtres de recherche' />
          <CardContent>
            <Grid container spacing={4} alignItems='center'>
              {/* Recherche */}
              <Grid item xs={12}>
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
              </Grid>

              {/* Filtres Statut, Catégorie, Compte */}
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label='Catégorie'
                  value={categorieFilter}
                  onChange={e => setCategorieFilter(e.target.value)}
                >
                  <MenuItem value=''>Toutes</MenuItem>
                  {listCategorie.map(cat => (
                    <MenuItem key={cat.id_cat} value={cat.id_cat}>
                      {cat.designation_cat}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label='Statut'
                  value={statutFilter}
                  onChange={e => setStatutFilter(e.target.value)}
                >
                  <MenuItem value=''>Tous</MenuItem>
                  <MenuItem value='en_route'>En Route</MenuItem>
                  <MenuItem value='en_stock'>En Stock</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label='Compte'
                  value={compteFilter}
                  onChange={e => setCompteFilter(e.target.value)}
                >
                  <MenuItem value=''>Tous</MenuItem>
                  {listCompte.map(cpt => (
                    <MenuItem key={cpt.id_cpt} value={cpt.id_cpt}>
                      {cpt.designation_cpt}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Dates */}
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label='Date de Début'
                    value={dateRange[0]}
                    onChange={newValue => setDateRange([newValue, dateRange[1]])}
                    sx={{ width: '100%' }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label='Date de Fin'
                    value={dateRange[1]}
                    onChange={newValue => setDateRange([dateRange[0], newValue])}
                    sx={{ width: '100%' }}
                  />
                </LocalizationProvider>
              </Grid>

              {/* Bouton */}
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant='outlined'
                  onClick={handleResetFilters}
                  startIcon={<Icon icon='tabler:clear-all' />}
                >
                  Réinitialiser
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: 'action.hover' }}>
              <TableRow>
                <TableCell sortDirection={sortBy === 'designation_prd' ? sortOrder : false}>
                  <TableSortLabel
                    active={sortBy === 'designation_prd'}
                    direction={sortBy === 'designation_prd' ? sortOrder : 'asc'}
                    onClick={() => handleSort('designation_prd')}
                  >
                    Désignation
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortBy === 'date_achat' ? sortOrder : false}>
                  <TableSortLabel
                    active={sortBy === 'date_achat'}
                    direction={sortBy === 'date_achat' ? sortOrder : 'asc'}
                    onClick={() => handleSort('date_achat')}
                  >
                    Date d'Achat
                  </TableSortLabel>
                </TableCell>
                <TableCell align='center'>Statut</TableCell>
                <TableCell align='center'>Qnt</TableCell>
                <TableCell align='right' sortDirection={sortBy === 'mnt_tot_dev' ? sortOrder : false}>
                  <TableSortLabel
                    active={sortBy === 'mnt_tot_dev'}
                    direction={sortBy === 'mnt_tot_dev' ? sortOrder : 'asc'}
                    onClick={() => handleSort('mnt_tot_dev')}
                  >
                    Mnt (Devise)
                  </TableSortLabel>
                </TableCell>
                <TableCell align='right' sortDirection={sortBy === 'mnt_tot_dzd' ? sortOrder : false}>
                  <TableSortLabel
                    active={sortBy === 'mnt_tot_dzd'}
                    direction={sortBy === 'mnt_tot_dzd' ? sortOrder : 'asc'}
                    onClick={() => handleSort('mnt_tot_dzd')}
                  >
                    Mnt (DZD)
                  </TableSortLabel>
                </TableCell>
                <TableCell>Catégorie</TableCell>
                <TableCell sx={{ maxWidth: 25 }}>Act.</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {colis.map(item => (
                <TableRow key={item.id_colis} hover>
                  <TableCell>{item.produit.designation_prd}</TableCell>
                  <TableCell>{dayjs(item.date_achat).format('DD/MM/YYYY')}</TableCell>
                  <TableCell align='center'>
                    <Chip
                      label={item.date_stock ? 'En Stock' : 'En Route'}
                      color={item.date_stock ? 'success' : 'warning'}
                      size='small'
                    />
                  </TableCell>
                  <TableCell align='center'>{item.qte_achat}</TableCell>
                  <TableCell align='right'>{`${parseFloat(item.mnt_tot_dev || 0).toFixed(2)} ${
                    item.compte.devise.symbole_dev
                  }`}</TableCell>
                  <TableCell align='right'>
                    {parseFloat(item.mnt_tot_dzd || 0).toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
                  </TableCell>
                  <TableCell>{item.categorie.designation_cat}</TableCell>

                  <TableCell align='right'>
                    <IconButton onClick={e => handleMenuOpen(e, item)}>
                      <Icon icon='tabler:pencil' />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component='div'
          count={totalItems}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={e => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
        />
      </Grid>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => openEditModal('categorie')}>
          <Icon icon='tabler:category' style={{ marginRight: 8 }} />
          Modifier la catégorie
        </MenuItem>
        <MenuItem onClick={() => openEditModal('dates')}>
          <Icon icon='tabler:calendar-event' style={{ marginRight: 8 }} />
          Modifier les dates
        </MenuItem>
        <MenuItem onClick={() => openEditModal('prix')}>
          <Icon icon='tabler:currency-dollar' style={{ marginRight: 8 }} />
          Modifier le prix
        </MenuItem>
      </Menu>

      {/* <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={openEditModal}>
          <Icon icon='tabler:edit' style={{ marginRight: 8 }} />
          Modifier le Colis
        </MenuItem>
      </Menu> */}

      {selectedColis && (
        <EditColisModal
          open={isEditModalOpen}
          onClose={() => setEditModalOpen(false)}
          colis={selectedColis}
          listCategorie={listCategorie}
          listCompte={listCompte}
          onSuccess={handleSuccess}
          initialTab={initialTab}
        />
      )}
    </Grid>
  )
}

const HistoriqueAchatsPage = () => {
  return (
    <ProduitProvider>
      <HistoriqueAchatsView />
    </ProduitProvider>
  )
}

export default HistoriqueAchatsPage
