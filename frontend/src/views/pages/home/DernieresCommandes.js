import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Table from '@mui/material/Table'
import TableRow from '@mui/material/TableRow'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import Typography from '@mui/material/Typography'
import { formatMontant } from 'src/@core/utils/format'
import { format } from 'date-fns'

const DernieresCommandes = ({ data }) => {
  return (
    <Card sx={{ height: '100%', boxShadow: 3 }}>
      <CardHeader title='Dernières Commandes' titleTypographyProps={{ variant: 'h6' }} />
      <TableContainer>
        <Table>
          <TableBody>
            {data && data.length > 0 ? (
              data.map((row, index) => (
                <TableRow key={index} sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell sx={{ py: 4.2 }}>
                    <Typography variant='body2' sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {row.id}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 4.2 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      {row.date ? format(new Date(row.date), 'dd/MM/yyyy') : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align='right' sx={{ py: 4.2 }}>
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                      {formatMontant(row.montant)} DA
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} align='center' sx={{ py: 5 }}>
                  <Typography variant='body2' color='text.secondary'>
                    Aucune commande récente
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  )
}

export default DernieresCommandes
