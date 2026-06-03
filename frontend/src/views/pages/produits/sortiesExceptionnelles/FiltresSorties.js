import { Card, CardContent, Grid, MenuItem, Button, FormControl, InputLabel, Select } from '@mui/material'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import Icon from 'src/@core/components/icon'

const motifLabels = {
  UTILISATION_PERSONNELLE: 'Utilisation Personnelle',
  PERTE_LIVRAISON: 'Perte Livraison',
  CASSE_DEFECTUEUX: 'Casse / Défectueux',
  VENTE_A_CREDIT: 'Vente à Crédit',
  SAISIE_DOUANE: 'Saisie Douane'
}

const statutLabels = {
  NON_APPLICABLE: 'Non Applicable',
  EN_ATTENTE: 'En Attente',
  REMBOURSE: 'Remboursé',
  REFUSE: 'Refusé'
}

const FiltresSorties = ({
  motifFilter,
  setMotifFilter,
  statutFilter,
  setStatutFilter,
  dateRange,
  setDateRange,
  handleResetFilters
}) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Grid container spacing={4}>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel id='motif-label'>Motif</InputLabel>
              <Select
                labelId='motif-label'
                label='Motif'
                value={motifFilter}
                onChange={e => setMotifFilter(e.target.value)}
              >
                <MenuItem value=''>Tous</MenuItem>
                {Object.entries(motifLabels).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel id='statut-label'>Statut</InputLabel>
              <Select
                labelId='statut-label'
                label='Statut'
                value={statutFilter}
                onChange={e => setStatutFilter(e.target.value)}
              >
                <MenuItem value=''>Tous</MenuItem>
                {Object.entries(statutLabels).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
              <DatePicker
                label='Du'
                value={dateRange[0]}
                onChange={date => setDateRange([date, dateRange[1]])}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={6}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
              <DatePicker
                label='Au'
                value={dateRange[1]}
                onChange={date => setDateRange([dateRange[0], date])}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant='outlined'
              color='secondary'
              onClick={handleResetFilters}
              startIcon={<Icon icon='tabler:refresh' />}
            >
              Réinitialiser les filtres
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default FiltresSorties
