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
  Button
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import dayjs from 'dayjs'

const DepensesTable = ({ depenses, statut, onAddFrais }) => {
  const formatNumber = num =>
    parseFloat(num || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
          <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Nature</TableCell>
              <TableCell align='right'>Montant DZD</TableCell>
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
                  <TableCell>{dayjs(d.date_dep).format('DD/MM/YYYY')}</TableCell>
                  <TableCell>
                    <Typography variant='body2' fontWeight={600}>
                      {d.nature_dep?.designation_nat_dep}
                    </Typography>
                    <Typography variant='caption' color='textSecondary'>
                      {d.observation}
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2' color='error.main' fontWeight={600}>
                      {formatNumber(d.mnt_dep_dzd)}
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
