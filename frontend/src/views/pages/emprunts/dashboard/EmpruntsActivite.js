import { Card, CardHeader, CardContent, Typography, Box, Avatar } from '@mui/material'
import Icon from 'src/@core/components/icon'
import { useEmprunt } from 'src/context/EmpruntContext'
import dayjs from 'dayjs'

const EmpruntsActivite = () => {
  const { emprunts } = useEmprunt()

  // Extraction et tri des derniers remboursements
  const tousLesRemboursements = []
  emprunts.forEach(emp => {
    if (emp.remboursements) {
      emp.remboursements.forEach(remb => {
        tousLesRemboursements.push({ ...remb, nomEmprunt: emp.designation })
      })
    }
  })

  // Tri du plus récent au plus ancien
  tousLesRemboursements.sort((a, b) => new Date(b.date_remb) - new Date(a.date_remb))
  const recents = tousLesRemboursements.slice(0, 4) // On garde les 4 derniers

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title='Activité Récente' titleTypographyProps={{ variant: 'h6' }} />
      <CardContent>
        {recents.length === 0 ? (
          <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center', mt: 4 }}>
            Aucun remboursement
          </Typography>
        ) : (
          recents.map((remb, index) => (
            <Box key={remb.id_remb} sx={{ display: 'flex', alignItems: 'center', mb: index !== recents.length - 1 ? 4 : 0 }}>
              <Avatar variant='rounded' sx={{ mr: 3, width: 38, height: 38, backgroundColor: 'success.light', color: 'success.main' }}>
                <Icon icon='tabler:receipt-refund' fontSize='1.25rem' />
              </Avatar>
              <Box sx={{ width: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ mr: 2, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant='body2' sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {remb.nomEmprunt}
                  </Typography>
                  <Typography variant='caption'>{dayjs(remb.date_remb).format('DD MMM YYYY')}</Typography>
                </Box>
                <Typography variant='body2' sx={{ fontWeight: 'bold', color: 'success.main' }}>
                  +{parseFloat(remb.montant_remb).toLocaleString('fr-DZ')}
                </Typography>
              </Box>
            </Box>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default EmpruntsActivite