import { Card, CardHeader, CardContent, Grid, MenuItem, Button, InputAdornment, TextField } from '@mui/material'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import 'dayjs/locale/fr'
import Icon from 'src/@core/components/icon'

const FiltresHistorique = ({
  searchTerm,
  setSearchTerm,
  categorieFilter,
  setCategorieFilter,
  statutFilter,
  setStatutFilter,
  compteFilter,
  setCompteFilter,
  dateRange,
  setDateRange,
  handleResetFilters,
  listCategorie,
  listCompte
}) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title='Filtres de recherche' />
      <CardContent>
        <Grid container spacing={4} alignItems='center'>
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
          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
              <DatePicker
                label='Date de Début'
                format='DD/MM/YYYY'
                value={dateRange[0]}
                onChange={newValue => setDateRange([newValue, dateRange[1]])}
                sx={{ width: '100%' }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
              <DatePicker
                label='Date de Fin'
                format='DD/MM/YYYY'
                value={dateRange[1]}
                onChange={newValue => setDateRange([dateRange[0], newValue])}
                sx={{ width: '100%' }}
              />
            </LocalizationProvider>
          </Grid>
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
  )
}

export default FiltresHistorique
