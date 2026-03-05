import React from 'react'
import { Paper, TableContainer, Table, TableHead, TableBody, TableRow, TableCell, TablePagination, LinearProgress, Typography } from '@mui/material'
import { useCommande } from 'src/context/CommandeContext'
import CommandeRow from './CommandeRow'

const CommandesTable = ({ page, setPage, rowsPerPage, setRowsPerPage, refreshData }) => {
  const { commandes, totalCommandes, loading } = useCommande()

  const handleChangePage = (event, newPage) => setPage(newPage)
  const handleChangeRowsPerPage = (event) => {
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
              <TableCell sx={{ width: 50 }} />
              <TableCell sx={{ color: 'white' }}>N° Cde</TableCell>
              <TableCell sx={{ color: 'white' }}>Date</TableCell>
              <TableCell sx={{ color: 'white' }} align='center'>Contenu</TableCell>
              <TableCell sx={{ color: 'white' }} align='right'>Montant Total</TableCell>
              <TableCell sx={{ color: 'white' }} align='center'>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {commandes.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={6} align='center'>
                  <Typography sx={{ p: 4 }}>Aucune commande trouvée.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              commandes.map((commande) => (
                <CommandeRow 
                  key={commande.id_cde} 
                  commande={commande} 
                  refreshData={refreshData} 
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component='div'
        count={totalCommandes}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage='Lignes par page :'
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`}
      />
    </Paper>
  )
}

export default CommandesTable