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

const TransactionsTable = ({ transactions, statut, onAddFacture }) => {
  const formatNumber = num =>
    parseFloat(num || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
          <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
            <TableRow>
              <TableCell>Fournisseur</TableCell>
              <TableCell>Devise</TableCell>
              <TableCell align='right'>Total Devise</TableCell>
              <TableCell align='right'>Total DZD</TableCell>
              <TableCell align='center'>Articles</TableCell>
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
                <TableRow hover key={t.id_transaction}>
                  <TableCell>
                    <Typography variant='body2' fontWeight={600}>
                      {t.fournisseur || 'Inconnu'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={t.devise_transaction} size='small' />
                  </TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2' fontWeight={600}>
                      {formatNumber(t.montant_total)}
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>{formatNumber(t.montant_total * t.taux_transaction)}</TableCell>
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
