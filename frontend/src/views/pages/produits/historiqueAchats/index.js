import { useEffect, useState, useCallback, useMemo } from 'react'
import { Grid, Menu, MenuItem } from '@mui/material'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

import Icon from 'src/@core/components/icon'
import { useProduit } from 'src/context/ProduitContext'
import { useProduitDashboard } from 'src/context/ProduitDashboardContext'
import { useDebounce } from 'src/@core/hooks/useDebounce'

import KpiCards from './KpiCards'
import FiltresHistorique from './FiltresHistorique'
import ChartsHistorique from './ChartsHistorique'
import TableauHistorique from './TableauHistorique'
import EditColisModal from './EditColisModal'

dayjs.locale('fr')

const HistoriqueAchatsPage = () => {
  const { listCategorie, listCompte } = useProduit()
  const { fetchHistorique, fetchHistoriqueAnalytics, updateHistoriqueColis } = useProduitDashboard()

  const [colis, setColis] = useState([])
  const [stats, setStats] = useState({ totalCount: 0, totalValueDZD: 0, totalProduits: 0 })
  const [totalItems, setTotalItems] = useState(0)

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [categorieFilter, setCategorieFilter] = useState('')
  const [compteFilter, setCompteFilter] = useState('')
  const [dateRange, setDateRange] = useState([null, null])

  const [sortBy, setSortBy] = useState('date_achat')
  const [sortOrder, setSortOrder] = useState('desc')

  const [chartDataCategory, setChartDataCategory] = useState([])
  const [chartDataYear, setChartDataYear] = useState([])
  const [chartDataAccount, setChartDataAccount] = useState([])
  const [chartDataTopProducts, setChartDataTopProducts] = useState([])

  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedColis, setSelectedColis] = useState(null)
  const [isEditModalOpen, setEditModalOpen] = useState(false)
  const [initialTab, setInitialTab] = useState('categorie')

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

  const loadTableData = useCallback(async () => {
    const params = { page: page + 1, limit: rowsPerPage, sortBy, sortOrder, ...filters }
    const { colis, total } = await fetchHistorique(params)
    setColis(colis)
    setTotalItems(total)
  }, [fetchHistorique, page, rowsPerPage, sortBy, sortOrder, filters])

  const loadAnalyticsData = useCallback(async () => {
    const data = await fetchHistoriqueAnalytics(filters)
    if (data) {
      setStats(data.stats)
      setChartDataCategory(data.chartCategory)
      setChartDataYear(data.chartYear)
      setChartDataAccount(data.chartAccount)
      setChartDataTopProducts(data.chartTopProducts)
    }
  }, [fetchHistoriqueAnalytics, filters])

  useEffect(() => {
    loadTableData()
    loadAnalyticsData()
  }, [loadTableData, loadAnalyticsData])

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

  const handleMenuOpen = (event, colisItem) => {
    setAnchorEl(event.currentTarget)
    setSelectedColis(colisItem)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const openEditModal = tab => {
    if (selectedColis) {
      setInitialTab(tab)
      setEditModalOpen(true)
    }
    handleMenuClose()
  }

  const handleSuccess = () => {
    loadTableData()
    loadAnalyticsData()
    setEditModalOpen(false)
    setSelectedColis(null)
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <KpiCards stats={stats} />
      </Grid>

      <Grid item xs={12} lg={6}>
        <ChartsHistorique
          chartDataCategory={chartDataCategory}
          chartDataYear={chartDataYear}
          chartDataAccount={chartDataAccount}
          chartDataTopProducts={chartDataTopProducts}
        />
      </Grid>

      <Grid item xs={12} lg={6}>
        <FiltresHistorique
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          categorieFilter={categorieFilter}
          setCategorieFilter={setCategorieFilter}
          statutFilter={statutFilter}
          setStatutFilter={setStatutFilter}
          compteFilter={compteFilter}
          setCompteFilter={setCompteFilter}
          dateRange={dateRange}
          setDateRange={setDateRange}
          handleResetFilters={handleResetFilters}
          listCategorie={listCategorie}
          listCompte={listCompte}
        />
      </Grid>

      <Grid item xs={12}>
        <TableauHistorique
          colis={colis}
          totalItems={totalItems}
          page={page}
          rowsPerPage={rowsPerPage}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={e => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          onMenuOpen={handleMenuOpen}
        />
      </Grid>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => openEditModal('categorie')}>
          <Icon icon='tabler:category' style={{ marginRight: 8 }} /> Modifier la catégorie
        </MenuItem>
        <MenuItem onClick={() => openEditModal('dates')}>
          <Icon icon='tabler:calendar-event' style={{ marginRight: 8 }} /> Modifier les dates
        </MenuItem>
        <MenuItem onClick={() => openEditModal('prix')}>
          <Icon icon='tabler:currency-dollar' style={{ marginRight: 8 }} /> Modifier le prix
        </MenuItem>
      </Menu>

      <EditColisModal
        open={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        colis={selectedColis}
        listCategorie={listCategorie}
        onSuccess={handleSuccess}
        initialTab={initialTab}
        updateHistoriqueColis={updateHistoriqueColis}
      />
    </Grid>
  )
}

export default HistoriqueAchatsPage
