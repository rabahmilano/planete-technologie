import { Card, CardHeader, CardContent, Typography, Box, Avatar } from '@mui/material'
import Icon from 'src/@core/components/icon'
import { useEmprunt } from 'src/context/EmpruntContext'
import dayjs from 'dayjs'

const EmpruntsActivite = () => {
  const { emprunts } = useEmprunt()

  // 1. Rassembler toutes les activités (Créations d'emprunts + Remboursements)
  const toutesLesActivites = []

  emprunts.forEach(emp => {
    // A. Ajouter l'emprunt lui-même comme une activité
    if (emp.date_emprunt) {
      toutesLesActivites.push({
        id: `emp-${emp.id_emprunt}`, // Préfixe pour éviter les conflits d'ID
        type: 'emprunt',
        titre: emp.designation,
        date: emp.date_emprunt,
        montant: emp.montant_emprunt
      })
    }

    // B. Ajouter chaque remboursement comme une activité
    if (emp.remboursements && emp.remboursements.length > 0) {
      emp.remboursements.forEach(remb => {
        toutesLesActivites.push({
          id: `remb-${remb.id_remb}`,
          type: 'remboursement',
          titre: `Remb. : ${emp.designation}`, // Préfixe visuel pour bien distinguer
          date: remb.date_remb,
          montant: remb.montant_remb
        })
      })
    }
  })

  // 2. Tri chronologique (du plus récent au plus ancien)
  // Utilisation de dayjs.valueOf() pour un tri mathématique précis
  toutesLesActivites.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
  
  // 3. On garde les 5 derniers (5 remplit généralement mieux la hauteur de la carte que 4)
  const recents = toutesLesActivites.slice(0, 5)

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title='Activité Récente' titleTypographyProps={{ variant: 'h6' }} />
      <CardContent>
        {recents.length === 0 ? (
          <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center', mt: 4 }}>
            Aucune activité récente
          </Typography>
        ) : (
          recents.map((activite, index) => {
            // Déterminer le style en fonction du type d'activité
            const isRemboursement = activite.type === 'remboursement'
            const avatarBg = isRemboursement ? 'success.main' : 'error.main' // Fond plein (Vert ou Rouge)
            const avatarColor = '#ffffff' // Icône blanche pure
            const iconName = isRemboursement ? 'tabler:receipt-refund' : 'tabler:cash-banknote'

            return (
              <Box key={activite.id} sx={{ display: 'flex', alignItems: 'center', mb: index !== recents.length - 1 ? 4 : 0 }}>
                {/* Icône dynamique */}
                <Avatar variant='rounded' sx={{ mr: 3, width: 38, height: 38, backgroundColor: avatarBg, color: avatarColor }}>
                  <Icon icon={iconName} fontSize='1.25rem' />
                </Avatar>
                
                <Box sx={{ width: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ mr: 2, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant='body2' sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {activite.titre}
                    </Typography>
                    <Typography variant='caption'>{dayjs(activite.date).format('DD MMM YYYY')}</Typography>
                  </Box>
                  
                  {/* Montant avec couleur dynamique */}
                  <Typography variant='body2' sx={{ fontWeight: 'bold', color: avatarColor }}>
                    {isRemboursement ? '+' : ''}{parseFloat(activite.montant).toLocaleString('fr-DZ')}
                  </Typography>
                </Box>
              </Box>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

export default EmpruntsActivite