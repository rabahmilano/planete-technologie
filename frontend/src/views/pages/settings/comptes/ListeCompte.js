import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'
import { useCompte } from 'src/context/CompteContext'
import { formatMontant } from 'src/@core/utils/format' // <-- L'import de la nouvelle fonction

const ListeComptes = () => {
  const { comptes } = useCompte()

  const getChipColor = type => {
    if (!type) return 'default'
    const lowerType = type.toLowerCase()
    if (lowerType === 'commun') return 'success'
    if (lowerType === 'personnel') return 'info'
    return 'primary'
  }

  return (
    <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Icon icon='tabler:list-details' fontSize='1.75rem' color='primary' />
            <Typography variant='h6'>Liste des comptes</Typography>
          </Box>
        }
      />
      <CardContent>
        <Table sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              <TableCell>Compte</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align='right'>Solde</TableCell>
              <TableCell align='right'>Commission</TableCell>
              <TableCell align='center'>Devise</TableCell>
              <TableCell align='right'>Taux de change actuel</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {comptes?.map(compte => (
              <TableRow key={compte.id_cpt} hover>
                <TableCell sx={{ fontWeight: 500 }}>{compte.designation_cpt}</TableCell>
                <TableCell>
                  <Chip
                    label={compte.type_cpt}
                    color={getChipColor(compte.type_cpt)}
                    size='small'
                    sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 600 }}>
                  {formatMontant(compte.solde_actuel)} {compte.devise?.symbole_dev || ''}
                </TableCell>
                <TableCell align='right'>{formatMontant(compte.commission_pct)} %</TableCell>
                <TableCell align='center'>{compte.dev_code}</TableCell>
                <TableCell align='right'>{formatMontant(compte.taux_change_actuel)} DZD</TableCell>
              </TableRow>
            ))}
            {(!comptes || comptes.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} align='center'>
                  Aucun compte trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default ListeComptes
