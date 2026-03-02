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
  LinearProgress,
  Chip
} from '@mui/material'
import dayjs from 'dayjs'

const EmpruntsTable = ({ loading, emprunts }) => {
  // Gestion de la pagination côté client (puisque l'API renvoie tout d'un coup)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const handleChangePage = (event, newPage) => setPage(newPage)
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  // Découpage du tableau pour l'affichage de la page courante
  const paginatedEmprunts = emprunts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <Paper sx={{ boxShadow: 5, borderRadius: 2, position: 'relative' }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, width: '100%' }} />}
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
              <TableCell sx={{ color: 'white' }}>Désignation</TableCell>
              <TableCell sx={{ color: 'white' }}>Compte</TableCell>
              <TableCell sx={{ color: 'white' }}>Date</TableCell>
              <TableCell sx={{ color: 'white' }} align='right'>Montant Initial</TableCell>
              <TableCell sx={{ color: 'white' }} align='right'>Reste à Payer</TableCell>
              <TableCell sx={{ color: 'white' }} align='center'>Statut</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {emprunts.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={6} align='center'>
                  <Typography sx={{ p: 4 }}>Aucun emprunt à afficher.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedEmprunts.map((emprunt) => {
                // Règle métier : Calcul du reste à payer
                const totalRembourse = emprunt.remboursements.reduce(
                  (acc, curr) => acc + parseFloat(curr.montant_remb),
                  0
                )
                const resteAPayer = parseFloat(emprunt.montant_emprunt) - totalRembourse

                return (
                  <TableRow key={emprunt.id_emprunt} hover>
                    <TableCell sx={{ fontWeight: 'medium' }}>
                      {emprunt.designation}
                    </TableCell>
                    <TableCell>
                      {emprunt.compte?.designation_cpt || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {dayjs(emprunt.date_emprunt).format('DD MMMM YYYY')}
                    </TableCell>
                    <TableCell align='right'>
                      {parseFloat(emprunt.montant_emprunt || 0).toLocaleString('fr-DZ', {
                        style: 'currency',
                        currency: 'DZD'
                      })}
                    </TableCell>
                    <TableCell 
                      align='right' 
                      sx={{ 
                        fontWeight: 'bold', 
                        color: resteAPayer > 0 ? 'error.main' : 'success.main' 
                      }}
                    >
                      {resteAPayer.toLocaleString('fr-DZ', {
                        style: 'currency',
                        currency: 'DZD'
                      })}
                    </TableCell>
                    <TableCell align='center'>
                      <Chip
                        label={emprunt.statut_emprunt === 'SOLDE' ? 'SOLDÉ' : 'EN COURS'}
                        color={emprunt.statut_emprunt === 'SOLDE' ? 'success' : 'warning'}
                        size='small'
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                  </TableRow>
                )
              })
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

export default EmpruntsTable;