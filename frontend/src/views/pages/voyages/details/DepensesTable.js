import {
  Card,
  CardHeader,
  Box,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Tooltip
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import dayjs from 'dayjs'
import { formatMontant } from 'src/@core/utils/format'

const DepensesTable = ({ depenses, statut, onAddFrais }) => {
  return (
    <Card sx={{ boxShadow: 3, borderRadius: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 5 }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Icon icon='tabler:receipt-tax' color='#ea5455' />
              Frais Annexes
            </Box>
          }
        />
        {statut !== 'CLOTURE' && (
          <Button
            variant='outlined'
            color='error'
            size='small'
            startIcon={<Icon icon='tabler:plus' />}
            onClick={onAddFrais}
          >
            Ajouter Frais
          </Button>
        )}
      </Box>
      <Divider sx={{ m: '0 !important' }} />
      <TableContainer>
        <Table size='small'>
          <TableHead sx={{ backgroundColor: '#0d1b2a' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                Date
              </TableCell>
              <TableCell sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                Nature
              </TableCell>
              <TableCell align='right' sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                Débours
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {depenses?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align='center' sx={{ py: 4 }}>
                  Aucune dépense enregistrée.
                </TableCell>
              </TableRow>
            ) : (
              depenses?.map(d => (
                <TableRow hover key={d.id_op_dep}>
                  <TableCell sx={{ whiteSpace: 'nowrap', verticalAlign: 'top', pt: 3 }}>
                    {dayjs(d.date_dep).format('DD/MM/YYYY')}
                  </TableCell>

                  <TableCell sx={{ maxWidth: 180, verticalAlign: 'top', pt: 3 }}>
                    <Typography variant='body2' sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                      {d.nature_dep?.designation_nat_dep}
                    </Typography>
                    {d.observation && (
                      <Tooltip title={d.observation} placement='bottom-start'>
                        <Typography
                          variant='caption'
                          color='textSecondary'
                          sx={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            mt: 0.5
                          }}
                        >
                          {d.observation}
                        </Typography>
                      </Tooltip>
                    )}
                  </TableCell>

                  <TableCell align='right' sx={{ verticalAlign: 'top', pt: 3 }}>
                    <Typography variant='body2' color='error.main' sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {formatMontant(d.mnt_dep_dzd)} DZD
                    </Typography>

                    <Typography
                      variant='caption'
                      color='textPrimary'
                      sx={{ display: 'block', fontWeight: 500, fontSize: '0.7rem', mt: 0.5 }}
                    >
                      {formatMontant(d.mnt_dep)} {d.compte?.dev_code || ''}
                    </Typography>

                    <Typography
                      variant='caption'
                      sx={{
                        display: 'block',
                        fontSize: '0.62rem',
                        fontStyle: 'italic',
                        color: 'text.disabled',
                        lineHeight: 1
                      }}
                    >
                      {d.compte?.designation_cpt || 'Compte inconnu'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  )
}

export default DepensesTable
