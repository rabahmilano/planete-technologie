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
  IconButton,
  alpha,
  useTheme
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import dayjs from 'dayjs'
import { formatMontant } from 'src/@core/utils/format'

const ColisRow = ({ row }) => {
  const [open, setOpen] = useState(false)
  const theme = useTheme()

  const renderStatus = statut => {
    const statusConfig = {
      'En Stock': { color: 'success', icon: 'tabler:circle-check' },
      'Vendu (Partiel)': { color: 'warning', icon: 'tabler:clock' },
      'Vendu (Totalement)': { color: 'secondary', icon: 'tabler:archive' },
      'En Route': { color: 'info', icon: 'tabler:truck' }
    }
    const config = statusConfig[statut] || { color: 'default', icon: 'tabler:help' }

    return (
      <Chip
        label={statut}
        color={config.color}
        size='small'
        variant='tonal'
        icon={<Icon icon={config.icon} fontSize='1rem' />}
      />
    )
  }

  return (
    <>
      <TableRow
        hover
        sx={{
          '& > *': { borderBottom: 'unset' },
          backgroundColor: row.qte_stock === 0 ? alpha(theme.palette.action.disabledBackground, 0.05) : 'inherit'
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
          <Box
            sx={{
              display: 'inline-flex',
              px: 2,
              py: 0.5,
              borderRadius: 1,
              bgcolor: row.qte_stock > 0 ? alpha(theme.palette.success.main, 0.1) : 'transparent',
              color: row.qte_stock > 0 ? 'success.main' : 'text.disabled',
              fontWeight: 'bold'
            }}
          >
            {row.qte_stock}
          </Box>
        </TableCell>
        <TableCell align='right'>{row.prix_achat_dev}</TableCell>
        <TableCell align='right' sx={{ fontWeight: 'bold' }}>
          {formatMontant(row.prix_achat_dzd)} DA
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout='auto' unmountOnExit>
            <Box sx={{ margin: 2, padding: 3, backgroundColor: 'action.hover', borderRadius: 1 }}>
              <Typography
                variant='h6'
                gutterBottom
                component='div'
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Icon icon='tabler:history' fontSize='1.25rem' />
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
                        <TableCell align='center' sx={{ fontWeight: 500 }}>
                          {vente.qte_vendue}
                        </TableCell>
                        <TableCell align='right'>{formatMontant(vente.prix_vente)} DA</TableCell>
                        <TableCell
                          align='right'
                          sx={{
                            color: vente.benefice > 0 ? 'success.main' : 'error.main',
                            fontWeight: 'bold'
                          }}
                        >
                          {vente.benefice > 0 ? '+' : ''}
                          {formatMontant(vente.benefice)} DA
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
      <TableContainer sx={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <Table stickyHeader aria-label='sticky table'>
          <TableHead>
            <TableRow sx={{ '& th': { backgroundColor: '#0d1b2a', color: 'white' } }}>
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
        labelRowsPerPage='Lignes par page :'
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`}
      />
    </Paper>
  )
}

export default ColisTable
