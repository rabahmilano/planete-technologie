import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip
} from '@mui/material'
import { formatMontant } from 'src/@core/utils/format'

const TransactionDetailTable = ({ articles }) => {
  return (
    <Paper sx={{ overflow: 'hidden', boxShadow: 2, borderRadius: 2 }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  backgroundColor: '#e2e8f0',
                  color: '#0f172a',
                  py: 3,
                  fontWeight: 700,
                  pl: '24px !important',
                  borderBottom: '2px solid #94a3b8'
                }}
              >
                Produit
              </TableCell>
              <TableCell
                align='center'
                sx={{
                  backgroundColor: '#e2e8f0',
                  color: '#0f172a',
                  py: 3,
                  fontWeight: 700,
                  borderBottom: '2px solid #94a3b8'
                }}
              >
                Catégorie
              </TableCell>
              <TableCell
                align='center'
                sx={{
                  backgroundColor: '#e2e8f0',
                  color: '#0f172a',
                  py: 3,
                  fontWeight: 700,
                  borderBottom: '2px solid #94a3b8'
                }}
              >
                Qté
              </TableCell>
              <TableCell
                align='right'
                sx={{
                  backgroundColor: '#e2e8f0',
                  color: '#0f172a',
                  py: 3,
                  fontWeight: 700,
                  borderBottom: '2px solid #94a3b8'
                }}
              >
                PU Devise
              </TableCell>
              <TableCell
                align='right'
                sx={{
                  backgroundColor: '#e2e8f0',
                  color: '#0f172a',
                  py: 3,
                  fontWeight: 700,
                  borderBottom: '2px solid #94a3b8'
                }}
              >
                Total Devise
              </TableCell>
              <TableCell
                align='right'
                sx={{
                  backgroundColor: '#e2e8f0',
                  color: '#0f172a',
                  py: 3,
                  fontWeight: 700,
                  pr: '24px !important',
                  borderBottom: '2px solid #94a3b8'
                }}
              >
                Total DZD
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!articles || articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align='center' sx={{ py: 6 }}>
                  <Typography variant='body1' color='text.secondary'>
                    Aucun article trouvé pour cette transaction.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              articles.map((article, index) => {
                const isLast = index === articles.length - 1
                const rowBorder = isLast ? 'none' : '1px solid #f1f5f9'

                return (
                  <TableRow
                    key={article.id_colis_voyage || index}
                    sx={{ '& td': { borderBottom: rowBorder, py: 2.5 } }}
                  >
                    <TableCell sx={{ verticalAlign: 'middle', pl: '24px !important' }}>
                      <Typography variant='body1' fontWeight={600} color='text.primary'>
                        {article.colis?.produit?.designation_prd || 'Produit Inconnu'}
                      </Typography>
                    </TableCell>

                    <TableCell align='center' sx={{ verticalAlign: 'middle' }}>
                      <Tooltip title={article.colis?.categorie?.designation_cat || ''} placement='top'>
                        <Typography
                          variant='body2'
                          sx={{
                            display: 'inline-block',
                            backgroundColor: '#f1f5f9',
                            px: 2,
                            py: 0.5,
                            borderRadius: 1,
                            maxWidth: 140,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            verticalAlign: 'middle',
                            fontWeight: 600,
                            color: '#475569'
                          }}
                        >
                          {article.colis?.categorie?.designation_cat}
                        </Typography>
                      </Tooltip>
                    </TableCell>

                    <TableCell align='center' sx={{ verticalAlign: 'middle' }}>
                      <Typography variant='body1' fontWeight={700}>
                        {article.colis?.qte_achat || 0}
                      </Typography>
                    </TableCell>

                    <TableCell align='right' sx={{ verticalAlign: 'middle' }}>
                      <Typography variant='body1' fontWeight={600} color='text.primary'>
                        {formatMontant(article.pu_dev_dest)}
                      </Typography>
                    </TableCell>

                    <TableCell align='right' sx={{ verticalAlign: 'middle' }}>
                      <Typography variant='body1' fontWeight={700} color='text.primary'>
                        {formatMontant(article.mnt_tot_dest)}
                      </Typography>
                    </TableCell>

                    <TableCell align='right' sx={{ verticalAlign: 'middle', pr: '24px !important' }}>
                      <Typography variant='body1' fontWeight={700} color='success.main'>
                        {formatMontant(article.colis?.mnt_tot_dzd)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}

export default TransactionDetailTable
