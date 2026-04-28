import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Table from '@mui/material/Table'
import TableRow from '@mui/material/TableRow'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { formatMontant } from 'src/@core/utils/format'

const getRankStyle = index => {
  switch (index) {
    case 0:
      return { bgcolor: 'rgba(255, 171, 0, 0.15)', color: '#FFAB00', border: 'none' }
    case 1:
      return { bgcolor: 'rgba(130, 134, 139, 0.15)', color: '#82868B', border: 'none' }
    case 2:
      return { bgcolor: 'rgba(216, 121, 60, 0.15)', color: '#D8793C', border: 'none' }
    default:
      return { bgcolor: 'transparent', color: 'text.disabled', border: '1px dashed' }
  }
}

const TopProduits = ({ data }) => {
  return (
    <Card sx={{ height: '100%', boxShadow: 3 }}>
      <CardHeader title='Top Produits (30 derniers jours)' titleTypographyProps={{ variant: 'h6' }} />
      <TableContainer>
        <Table>
          <TableBody>
            {data && data.length > 0 ? (
              data.map((row, index) => {
                const rankStyle = getRankStyle(index)

                return (
                  <TableRow key={index} sx={{ height: 75, '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            mr: 3,
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            bgcolor: rankStyle.bgcolor,
                            color: rankStyle.color,
                            border: rankStyle.border,
                            borderColor: 'divider'
                          }}
                        >
                          {index + 1}
                        </Box>
                        <Typography variant='body2' sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {row.nom}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' sx={{ fontWeight: 600 }}>
                        {row.qte} ventes
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' sx={{ fontWeight: 600, color: 'success.main' }}>
                        {formatMontant(row.ca)} DA
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow sx={{ height: 375 }}>
                <TableCell colSpan={3} align='center'>
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
