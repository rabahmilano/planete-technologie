import { useState } from 'react'
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

import EmpruntRow from './EmpruntRow'

const EmpruntsTable = ({ loading, emprunts }) => {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const handleChangePage = (event, newPage) => setPage(newPage)
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const paginatedEmprunts = emprunts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <Paper sx={{ boxShadow: 5, borderRadius: 2, position: 'relative' }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, width: '100%' }} />}
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
              <TableCell sx={{ width: 50 }} />
              <TableCell sx={{ color: 'white' }}>Désignation</TableCell>
              <TableCell sx={{ color: 'white' }}>Compte</TableCell>
              <TableCell sx={{ color: 'white' }}>Date</TableCell>
              <TableCell sx={{ color: 'white' }} align='right'>Montant Initial</TableCell>
              <TableCell sx={{ color: 'white' }} align='right'>Reste à Payer</TableCell>
              <TableCell sx={{ color: 'white' }} align='center'>Statut</TableCell>
              <TableCell sx={{ color: 'white' }} align='center'>Actions</TableCell> {/* <-- NOUVELLE COLONNE */}
            </TableRow>
          </TableHead>
          <TableBody>
            {emprunts.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={8} align='center'>
                  <Typography sx={{ p: 4 }}>Aucun emprunt à afficher.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedEmprunts.map((emprunt) => (
                <EmpruntRow key={emprunt.id_emprunt} emprunt={emprunt} />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component='div'
        count={emprunts.length}
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

export default EmpruntsTable