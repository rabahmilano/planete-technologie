import { Card, CardContent, Grid, Typography, Avatar } from '@mui/material'
import Icon from 'src/@core/components/icon'
import { useEmprunt } from 'src/context/EmpruntContext'
import { formatMontant } from 'src/@core/utils/format'

const EmpruntsKpiGrid = () => {
  const { emprunts } = useEmprunt()

  let totalEmprunte = 0
  let resteAPayer = 0
  let countEnCours = 0
  let countSolde = 0

  emprunts.forEach(emp => {
    const montant = parseFloat(emp.mnt_emprunt || 0)
    totalEmprunte += montant

    const remb = emp.remboursements?.reduce((acc, curr) => acc + parseFloat(curr.mnt_remb || 0), 0) || 0
    resteAPayer += montant - remb

    if (emp.statut_emprunt === 'SOLDE') countSolde++
    else countEnCours++
  })

  const renderCard = (title, value, icon, color) => (
    <Grid item xs={6}>
      <Card sx={{ height: '100%', boxShadow: 2 }}>
        <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Avatar
            variant='rounded'
            sx={{ mb: 2, width: 34, height: 34, backgroundColor: `rgba(${color}, 0.16)`, color: `rgb(${color})` }}
          >
            <Icon icon={icon} fontSize='1.25rem' />
          </Avatar>
          <Typography variant='body2' sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
            {title}
          </Typography>
          <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
            {value}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  )

  return (
    <Grid container spacing={4} sx={{ height: '100%' }}>
      {renderCard('Emprunté', `${formatMontant(totalEmprunte)} DA`, 'tabler:arrow-down-right', '234, 84, 85')}
      {renderCard('Reste à Payer', `${formatMontant(resteAPayer)} DA`, 'tabler:alert-circle', '255, 159, 67')}
      {renderCard('En Cours', countEnCours, 'tabler:clock', '115, 103, 240')}
      {renderCard('Soldés', countSolde, 'tabler:check', '40, 199, 111')}
    </Grid>
  )
}

export default EmpruntsKpiGrid
