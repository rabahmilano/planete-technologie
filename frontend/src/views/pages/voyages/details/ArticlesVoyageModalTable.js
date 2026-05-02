import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip,
  Tooltip
} from '@mui/material'
import { formatMontant } from 'src/@core/utils/format'

const ArticlesVoyageModalTable = ({ factures, showTTC, coeffApproche, coeffEstime }) => {
  const isCoeffNull = coeffApproche === null || coeffApproche === undefined

  return (
    <Paper sx={{ overflow: 'hidden', boxShadow: 4, borderRadius: 2 }}>
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  backgroundColor: '#e2e8f0',
                  color: '#0f172a',
                  py: 2,
                  fontWeight: 700,
                  pl: '16px !important',
                  borderBottom: '2px solid #94a3b8'
                }}
              >
                Fournisseur
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: '#e2e8f0',
                  color: '#0f172a',
                  py: 2,
                  fontWeight: 700,
                  pl: '16px !important',
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
                  py: 2,
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
                  py: 2,
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
                  py: 2,
                  fontWeight: 700,
                  borderBottom: '2px solid #94a3b8'
                }}
              >
                PU Devise
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: '#e2e8f0',
                  color: '#0f172a',
                  py: 2,
                  fontWeight: 700,
                  minWidth: 160,
                  borderBottom: '2px solid #94a3b8'
                }}
              >
                Infos Transaction
              </TableCell>
              <TableCell
                align='right'
                sx={{
                  backgroundColor: '#e2e8f0',
                  color: '#0f172a',
                  py: 2,
                  fontWeight: 700,
                  borderBottom: '2px solid #94a3b8'
                }}
              >
                PU DA
              </TableCell>
              <TableCell
                align='right'
                sx={{
                  backgroundColor: '#e2e8f0',
                  color: '#0f172a',
                  py: 2,
                  fontWeight: 700,
                  borderBottom: '2px solid #94a3b8'
                }}
              >
                Total DA
              </TableCell>
              {showTTC && (
                <TableCell
                  align='right'
                  sx={{
                    backgroundColor: '#0d1b2a',
                    color: 'white',
                    py: 2,
                    fontWeight: 700,
                    borderBottom: '2px solid #94a3b8'
                  }}
                >
                  PU DA TTC {isCoeffNull && '(Estimé)'}
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {factures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showTTC ? 9 : 8} align='center' sx={{ py: 8 }}>
                  <Typography variant='body1' color='text.secondary'>
                    Aucun article n'a été enregistré.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              factures.map((t, tIndex) => {
                const isLastFacture = tIndex === factures.length - 1

                return t.colis_voyage.map((article, index) => {
                  const rowSpan = t.colis_voyage.length
                  const isLastRowOfTransaction = index === rowSpan - 1
                  const rowBorder = isLastRowOfTransaction && !isLastFacture ? '2px solid #94a3b8' : '1px solid #f1f5f9'

                  // Calcul dynamique de la valeur TTC à afficher
                  const puDzdBrut = parseFloat(article.colis.pu_dzd || 0)
                  const valeurTTC = isCoeffNull ? puDzdBrut * coeffEstime : article.colis.pu_dzd_ttc

                  return (
                    <TableRow key={article.id_colis_voyage} sx={{ '& td': { borderBottom: rowBorder } }}>
                      {index === 0 && (
                        <TableCell
                          rowSpan={rowSpan}
                          sx={{
                            borderRight: '1px solid #e2e8f0',
                            verticalAlign: 'middle',
                            pl: '16px !important'
                          }}
                        >
                          <Typography variant='body2' fontWeight={700} sx={{ color: '#1e293b' }}>
                            {t.fournisseur || 'Fournisseur Inconnu'}
                          </Typography>
                        </TableCell>
                      )}

                      <TableCell sx={{ verticalAlign: 'middle', pl: '16px !important' }}>
                        <Typography variant='body2' fontWeight={600}>
                          {article.colis.produit?.designation_prd}
                        </Typography>
                      </TableCell>

                      <TableCell align='center' sx={{ verticalAlign: 'middle' }}>
                        <Tooltip title={article.colis.categorie?.designation_cat || ''} placement='top'>
                          <Typography
                            variant='caption'
                            sx={{
                              display: 'inline-block',
                              backgroundColor: '#f1f5f9',
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              maxWidth: 100,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              verticalAlign: 'middle'
                            }}
                          >
                            {article.colis.categorie?.designation_cat}
                          </Typography>
                        </Tooltip>
                      </TableCell>

                      <TableCell align='center' sx={{ verticalAlign: 'middle' }}>
                        <Typography variant='body2' fontWeight={700}>
                          {article.colis.qte_achat}
                        </Typography>
                      </TableCell>
                      <TableCell align='right' sx={{ verticalAlign: 'middle' }}>
                        <Typography variant='body2' fontWeight={600}>
                          {formatMontant(article.pu_dev_dest)}
                        </Typography>
                      </TableCell>

                      {index === 0 && (
                        <TableCell
                          rowSpan={rowSpan}
                          sx={{
                            borderLeft: '1px solid #e2e8f0',
                            borderRight: '1px solid #e2e8f0',
                            verticalAlign: 'middle'
                          }}
                        >
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant='caption' color='text.secondary'>
                                Devise:
                              </Typography>
                              <Typography variant='caption' fontWeight={700} color='primary.main'>
                                {t.dev_trans}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant='caption' color='text.secondary'>
                                Taux:
                              </Typography>
                              <Typography variant='caption' fontWeight={600}>
                                {formatMontant(t.taux_trans)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant='caption' color='text.secondary'>
                                Comm Bnk ({t.compte?.commission_pct || 0}%):
                              </Typography>
                              <Typography variant='caption' fontWeight={600}>
                                {formatMontant(t.mnt_comm_banque)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant='caption' color='text.secondary'>
                                Comm Paie:
                              </Typography>
                              <Typography variant='caption' fontWeight={600}>
                                {formatMontant(t.mnt_comm_paie)}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                      )}

                      <TableCell align='right' sx={{ verticalAlign: 'middle' }}>
                        <Typography variant='body2'>{formatMontant(article.colis.pu_dzd)}</Typography>
                      </TableCell>
                      <TableCell align='right' sx={{ verticalAlign: 'middle' }}>
                        <Typography variant='body2' fontWeight={700} color='success.main'>
                          {formatMontant(article.colis.mnt_tot_dzd)}
                        </Typography>
                      </TableCell>

                      {showTTC && (
                        <TableCell
                          align='right'
                          sx={{ backgroundColor: 'rgba(13, 27, 42, 0.04)', verticalAlign: 'middle' }}
                        >
                          <Chip
                            label={`${formatMontant(valeurTTC)} DA`}
                            size='small'
                            variant='outlined'
                            color={isCoeffNull ? 'warning' : 'primary'}
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}

export default ArticlesVoyageModalTable
