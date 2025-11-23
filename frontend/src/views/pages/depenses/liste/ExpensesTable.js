import {
  Paper,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  TablePagination,
  LinearProgress
} from '@mui/material'
import dayjs from 'dayjs'

const ExpensesTable = ({ loading, depenses, total, page, setPage, rowsPerPage, setRowsPerPage }) => {
  const handleChangePage = (event, newPage) => setPage(newPage)
  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  return (
    <Paper sx={{ boxShadow: 5, borderRadius: 2, position: 'relative' }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, width: '100%' }} />}
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
              <TableCell sx={{ color: 'white' }}>Nature</TableCell>
              <TableCell sx={{ color: 'white' }}>Date</TableCell>
              <TableCell sx={{ color: 'white' }} align='right'>
                Montant
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {depenses.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={3} align='center'>
                  <Typography sx={{ p: 4 }}>Aucune dépense à afficher.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              depenses.map(depense => (
                <TableRow key={depense.id} hover>
                  <TableCell>{depense.nature}</TableCell>
                  <TableCell>{dayjs(depense.date).format('DD MMMM YYYY')}</TableCell>
                  <TableCell align='right' sx={{ fontWeight: 'medium' }}>
                    {parseFloat(depense.montant || 0).toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 75, 100]}
        component='div'
        count={total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage='Lignes par page :'
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
      />
    </Paper>
  )
}

export default ExpensesTable
