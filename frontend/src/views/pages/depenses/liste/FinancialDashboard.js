import { Grid, Paper, Typography, MenuItem, Card, CardContent, CardHeader, Button } from '@mui/material'
import CustomTextField from 'src/@core/components/mui/text-field'

const FinancialDashboard = ({
  natureFiltre,
  setNatureFiltre,
  periodeFiltre,
  setPeriodeFiltre,
  listNature,
  optionsAnnee,
  handleResetFilters,
  totalDepensesFiltrees,
  totalCoffreFortFiltre
}) => (
  <Card>
    <CardHeader title='Analyse Détaillée par Période' />
    <CardContent>
      <Grid container spacing={4} alignItems='center'>
        <Grid item xs={12} md={3}>
          {/* CORRECTION: La valeur du MenuItem est maintenant l'ID */}
          <CustomTextField
            select
            fullWidth
            label='Nature'
            value={natureFiltre}
            onChange={e => setNatureFiltre(e.target.value)}
          >
            <MenuItem value=''>Toutes</MenuItem>
            {listNature.map(n => (
              <MenuItem key={n.id_nat_dep} value={n.id_nat_dep}>
                {n.designation_nat_dep}
              </MenuItem>
            ))}
          </CustomTextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <CustomTextField
            select
            fullWidth
            label='Période'
            value={periodeFiltre}
            onChange={e => setPeriodeFiltre(e.target.value)}
          >
            <MenuItem value='all'>Toutes</MenuItem>
            <MenuItem value='1m'>1 mois</MenuItem>
            <MenuItem value='3m'>3 mois</MenuItem>
            <MenuItem value='6m'>6 mois</MenuItem>
            {optionsAnnee.map(annee => (
              <MenuItem key={annee} value={annee}>
                Année {annee}
              </MenuItem>
            ))}
          </CustomTextField>
        </Grid>
        <Grid item xs={12} md={2}>
          <Button fullWidth variant='outlined' onClick={handleResetFilters}>
            Réinitialiser
          </Button>
        </Grid>
        <Grid item xs={12} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'error.lightest' }}>
            <Typography variant='body2'>Dépenses (Période)</Typography>
            <Typography variant='h6' sx={{ fontWeight: 'bold', color: 'error.dark' }}>
              {totalDepensesFiltrees.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'success.lightest' }}>
            <Typography variant='body2'>Épargne (Période)</Typography>
            <Typography variant='h6' sx={{ fontWeight: 'bold', color: 'success.dark' }}>
              {totalCoffreFortFiltre.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </CardContent>
  </Card>
)

export default FinancialDashboard
