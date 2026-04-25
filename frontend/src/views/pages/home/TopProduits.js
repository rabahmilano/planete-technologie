import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Table from '@mui/material/Table'
import TableRow from '@mui/material/TableRow'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import { formatMontant } from 'src/@core/utils/format'

const TopProduits = ({ data }) => {
  return (
    <Card sx={{ height: '100%', boxShadow: 3 }}>
      <CardHeader title='Top Produits (30 derniers jours)' titleTypographyProps={{ variant: 'h6' }} />
      <TableContainer>
        <Table>
          <TableBody>
            {data && data.length > 0 ? (
              data.map((row, index) => (
                <TableRow key={index} sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell sx={{ py: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar
                        variant='rounded'
                        sx={{
                          width: 34,
                          height: 34,
                          mr: 3,
                          fontSize: '1rem',
                          bgcolor: 'primary.light',
                          color: 'primary.main'
                        }}
                      >
                        {index + 1}
                      </Avatar>
                      <Typography variant='body2' sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {row.nom}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align='right' sx={{ py: 3 }}>
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                      {row.qte} ventes
                    </Typography>
                  </TableCell>
                  <TableCell align='right' sx={{ py: 3 }}>
                    <Typography variant='body2' sx={{ fontWeight: 600, color: 'success.main' }}>
                      {formatMontant(row.ca)} DA
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} align='center' sx={{ py: 5 }}>
                  <Typography variant='body2' color='text.secondary'>
                    Aucune vente ce mois-ci
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

export default TopProduits
