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
  Chip,
  Button,
  Typography
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import { formatMontant } from 'src/@core/utils/format'

const TransactionsTable = ({ transactions, statut, onAddFacture }) => {
  return (
    <Card sx={{ boxShadow: 3, borderRadius: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 5 }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Icon icon='tabler:shopping-cart' color='#28c76f' />
              Transactions Marchandises
            </Box>
          }
        />
        {statut === 'EN_COURS' && (
          <Button
            variant='outlined'
            color='success'
            size='small'
            startIcon={<Icon icon='tabler:plus' />}
            onClick={onAddFacture}
          >
            Ajouter Facture
          </Button>
        )}
      </Box>
      <Divider sx={{ m: '0 !important' }} />
      <TableContainer>
        <Table size='small'>
          <TableHead sx={{ backgroundColor: '#0d1b2a' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                Fournisseur
              </TableCell>
              <TableCell sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                Devise
              </TableCell>
              <TableCell align='right' sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                Total Devise
              </TableCell>
              <TableCell align='right' sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                Total DZD
              </TableCell>
              <TableCell align='center' sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                Articles
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align='center' sx={{ py: 4 }}>
                  Aucun achat enregistré.
                </TableCell>
              </TableRow>
            ) : (
              transactions?.map(t => (
                <TableRow hover key={t.id_trans}>
                  <TableCell>
                    <Typography variant='body2' fontWeight={600}>
                      {t.fournisseur || 'Inconnu'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={t.dev_trans}
                      size='small'
                      color='primary'
                      variant='tonal'
                      sx={{ fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2' fontWeight={600}>
                      {formatMontant(t.mnt_tot_fact)}
                    </Typography>
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: 700, color: 'success.main' }}>
                    {formatMontant(parseFloat(t.mnt_tot_fact || 0) * parseFloat(t.taux_trans || 1))} DZD
                  </TableCell>
                  <TableCell align='center'>
                    <Chip label={`${t._count?.colis_voyage || 0} lots`} variant='outlined' size='small' />
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

export default TransactionsTable
