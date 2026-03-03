import { Grid, Card, CardContent, Typography, Box, Avatar, Skeleton } from '@mui/material'
import Icon from 'src/@core/components/icon'
import { useEmprunt } from 'src/context/EmpruntContext'
import { useCompte } from 'src/context/CompteContext'

const KpiEmprunts = () => {
  const { emprunts, loading: loadingEmprunts } = useEmprunt()
  const { comptes, loading: loadingComptes } = useCompte()

  const isLoading = loadingEmprunts || loadingComptes

  // Blocage visuel dynamique pendant la requete réseau
  if (isLoading) {
    return (
      <Grid container spacing={6} sx={{ mb: 6 }}>
        {[1, 2, 3, 4,5 ,6,7].map(i => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card sx={{ boxShadow: 3, borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', p: 4 }}>
                
                {/* L'Avatar MUI par défaut tourne autour de 40-42px avec cette icône */}
                <Skeleton variant="rounded" width={42} height={40} sx={{ mr: 4 }} />
                
                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  {/* On utilise les vraies typographies pour forcer la hauteur exacte */}
                  <Typography variant='caption' sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                    <Skeleton width="50%" />
                  </Typography>
                  <Typography variant='h6' sx={{ fontWeight: 600 }}>
                    <Skeleton width="80%" />
                  </Typography>
                </Box>
                
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    )
  }

  let detteTotale = 0
  let resteAPayerGlobal = 0

  emprunts.forEach(emp => {
    const montantInitial = parseFloat(emp.montant_emprunt || 0)
    detteTotale += montantInitial

    const totalRembourse = emp.remboursements?.reduce((acc, curr) => acc + parseFloat(curr.montant_remb), 0) || 0
    resteAPayerGlobal += (montantInitial - totalRembourse)
  })

  const formatDzd = (val) => parseFloat(val || 0).toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })

  const renderKpiCard = (title, amount, icon, iconColor, bgColor) => (
    <Grid item xs={12} sm={6} md={3} key={title}>
      <Card sx={{ boxShadow: 3, borderRadius: 2, height: '100%' }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 4 }}>
          <Avatar variant='rounded' sx={{ mr: 4, backgroundColor: bgColor, color: iconColor }}>
            <Icon icon={icon} fontSize='1.75rem' />
          </Avatar>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant='caption' sx={{ textTransform: 'uppercase', fontWeight: 'bold', color: 'text.secondary' }}>
              {title}
            </Typography>
            <Typography variant='h6' sx={{ fontWeight: 600 }}>
              {amount}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  )

  return (
    <Grid container spacing={6} sx={{ mb: 6 }}>
      {renderKpiCard('Dette Totale', formatDzd(detteTotale), 'tabler:chart-arrows-vertical', 'error.main', 'rgba(234, 84, 85, 0.16)')}
      {renderKpiCard('Reste à Payer', formatDzd(resteAPayerGlobal), 'tabler:alert-circle', 'warning.main', 'rgba(255, 159, 67, 0.16)')}
      
      {comptes.map(cpt => 
        renderKpiCard(
          `Solde ${cpt.designation_cpt}`, 
          `${parseFloat(cpt.solde_actuel || 0).toLocaleString('fr-DZ')} ${cpt.devise?.symbole_dev || ''}`, 
          'tabler:building-bank', 
          'success.main', 
          'rgba(40, 199, 111, 0.16)'
        )
      )}
    </Grid>
  )
}

export default KpiEmprunts