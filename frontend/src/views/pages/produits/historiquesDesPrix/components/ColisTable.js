import React, { useState } from 'react'
import {
  Box,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  TableContainer,
  Collapse,
  IconButton
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import dayjs from 'dayjs'

const ColisRow = ({ row }) => {
  const [open, setOpen] = useState(false)

  const renderStatus = statut => {
    switch (statut) {
      case 'En Stock':
        return <Chip label={statut} color='success' size='small' variant='outlined' />
      case 'Vendu (Partiel)':
        return <Chip label={statut} color='warning' size='small' variant='outlined' />
      case 'Vendu (Totalement)':
        return <Chip label={statut} color='default' size='small' />
      case 'En Route':
        return <Chip label={statut} color='info' size='small' variant='outlined' />
      default:
        return <Chip label={statut} size='small' />
    }
  }

  return (
    <>
      <TableRow
        sx={{
          '& > *': { borderBottom: 'unset' },
          backgroundColor: row.qte_stock === 0 ? 'rgba(0, 0, 0, 0.02)' : 'inherit'
        }}
      >
        <TableCell>
          <IconButton aria-label='expand row' size='small' onClick={() => setOpen(!open)}>
            <Icon icon={open ? 'tabler:chevron-up' : 'tabler:chevron-down'} />
          </IconButton>
        </TableCell>
        <TableCell>{dayjs(row.date_achat).format('DD/MM/YYYY')}</TableCell>
        <TableCell>{renderStatus(row.statut)}</TableCell>
        <TableCell align='center'>{row.qte_achat}</TableCell>
        <TableCell align='center'>
          <Typography
            variant='body2'
            sx={{
              fontWeight: row.qte_stock > 0 ? 'bold' : 'normal',
              color: row.qte_stock > 0 ? 'success.main' : 'text.disabled'
            }}
          >
            {row.qte_stock}
          </Typography>
        </TableCell>
        <TableCell align='right'>{row.prix_achat_dev}</TableCell>
        <TableCell align='right'>
          {row.prix_achat_dzd.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout='auto' unmountOnExit>
            <Box sx={{ margin: 2, padding: 3, backgroundColor: 'action.hover', borderRadius: 1 }}>
              <Typography variant='h6' gutterBottom component='div'>
                Historique des ventes de ce lot
              </Typography>
              {row.ventes && row.ventes.length > 0 ? (
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date de vente</TableCell>
                      <TableCell align='center'>Quantité vendue</TableCell>
                      <TableCell align='right'>Prix Vente</TableCell>
                      <TableCell align='right'>Bénéfice unitaire</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {row.ventes.map((vente, index) => (
                      <TableRow key={index}>
                        <TableCell>{dayjs(vente.date_vente).format('DD/MM/YYYY')}</TableCell>
                        <TableCell align='center'>{vente.qte_vendue}</TableCell>
                        <TableCell align='right'>
                          {vente.prix_vente.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
                        </TableCell>
                        <TableCell
                          align='right'
                          sx={{
                            color: vente.benefice > 0 ? 'success.main' : 'error.main',
                            fontWeight: 'bold'
                          }}
                        >
                          {vente.benefice > 0 ? '+' : ''}
                          {vente.benefice.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant='body2' color='text.secondary'>
                  Aucune vente enregistrée pour ce lot.
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

const ColisTable = ({ colis, totalColis, page, rowsPerPage, onPageChange, onRowsPerPageChange }) => {
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: '80vh', overflowY: 'scroll' }}>
        <Table stickyHeader aria-label='sticky table'>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Date d'Achat</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align='center'>Qté Initiale</TableCell>
              <TableCell align='center'>Qté Restante</TableCell>
              <TableCell align='right'>Prix Achat (Devise)</TableCell>
              <TableCell align='right'>Prix Achat (DZD)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {colis.map(row => (
              <ColisRow key={row.id_colis} row={row} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component='div'
        count={totalColis}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </Paper>
  )
}

export default ColisTable
