import { Card, CardHeader, CardContent, Typography, Box, Avatar } from '@mui/material'
import Icon from 'src/@core/components/icon'
import { useEmprunt } from 'src/context/EmpruntContext'
import dayjs from 'dayjs'
import { formatMontant } from 'src/@core/utils/format'

const EmpruntsActivite = () => {
  const { emprunts } = useEmprunt()

  const toutesLesActivites = []

  emprunts.forEach(emp => {
    if (emp.date_emprunt) {
      toutesLesActivites.push({
        id: `emp-${emp.id_emprunt}`,
        type: 'emprunt',
        titre: emp.des_emprunt,
        date: emp.date_emprunt,
        montant: emp.mnt_emprunt,
        devise: emp.compte?.dev_code || 'DZD'
      })
    }

    if (emp.remboursements && emp.remboursements.length > 0) {
      emp.remboursements.forEach(remb => {
        toutesLesActivites.push({
          id: `remb-${remb.id_remb}`,
          type: 'remboursement',
          titre: `Remb. : ${emp.des_emprunt}`,
          date: remb.date_remb,
          montant: remb.mnt_remb,
          devise: emp.compte?.dev_code || 'DZD'
        })
      })
    }
  })

  toutesLesActivites.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())

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
            const isRemboursement = activite.type === 'remboursement'
            const avatarBg = isRemboursement ? 'success.main' : 'error.main'
            const iconName = isRemboursement ? 'tabler:receipt-refund' : 'tabler:cash-banknote'

            return (
              <Box
                key={activite.id}
                sx={{ display: 'flex', alignItems: 'center', mb: index !== recents.length - 1 ? 4 : 0 }}
              >
                <Avatar
                  variant='rounded'
                  sx={{ mr: 3, width: 38, height: 38, backgroundColor: avatarBg, color: '#ffffff' }}
                >
                  <Icon icon={iconName} fontSize='1.25rem' />
                </Avatar>

                <Box
                  sx={{
                    width: '100%',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box sx={{ mr: 2, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant='body2' sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {activite.titre}
                    </Typography>
                    <Typography variant='caption'>{dayjs(activite.date).format('DD MMM YYYY')}</Typography>
                  </Box>

                  <Typography variant='body2' sx={{ fontWeight: 'bold', color: avatarBg }}>
                    {isRemboursement ? '+' : ''}
                    {formatMontant(activite.montant)} {activite.devise}
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
