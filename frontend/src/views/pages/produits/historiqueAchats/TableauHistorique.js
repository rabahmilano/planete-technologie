import {
  Card,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableSortLabel,
  TableBody,
  Chip,
  IconButton,
  TablePagination,
  Typography
} from '@mui/material'
import dayjs from 'dayjs'
import Icon from 'src/@core/components/icon'
import { formatMontant } from 'src/@core/utils/format'

const headerSx = {
  color: 'white',
  backgroundColor: '#0d1b2a',
  whiteSpace: 'nowrap',
  fontSize: { xs: '0.7rem', sm: '0.875rem' }
}

const sortLabelSx = {
  color: 'white !important',
  '& .MuiTableSortLabel-icon': { color: 'white !important' }
}

const TableauHistorique = ({
  colis,
  totalItems,
  page,
  rowsPerPage,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
  onRowsPerPageChange,
  onMenuOpen
}) => {
  return (
    <Card>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
              <TableCell
                sx={{ ...headerSx, minWidth: 250, position: 'sticky', left: 0, zIndex: 11 }}
                sortDirection={sortBy === 'designation_prd' ? sortOrder : false}
              >
                <TableSortLabel
                  active={sortBy === 'designation_prd'}
                  direction={sortBy === 'designation_prd' ? sortOrder : 'asc'}
                  onClick={() => onSort('designation_prd')}
                  sx={sortLabelSx}
                >
                  Désignation
                </TableSortLabel>
              </TableCell>
              <TableCell
                sx={{ ...headerSx, minWidth: 130 }}
                sortDirection={sortBy === 'date_achat' ? sortOrder : false}
              >
                <TableSortLabel
                  active={sortBy === 'date_achat'}
                  direction={sortBy === 'date_achat' ? sortOrder : 'asc'}
                  onClick={() => onSort('date_achat')}
                  sx={sortLabelSx}
                >
                  Date d'Achat
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...headerSx, minWidth: 100 }} align='center'>
                Statut
              </TableCell>
              <TableCell sx={{ ...headerSx, minWidth: 80 }} align='center'>
                Qnt
              </TableCell>
              <TableCell
                sx={{ ...headerSx, minWidth: 140 }}
                align='right'
                sortDirection={sortBy === 'mnt_tot_dev' ? sortOrder : false}
              >
                <TableSortLabel
                  active={sortBy === 'mnt_tot_dev'}
                  direction={sortBy === 'mnt_tot_dev' ? sortOrder : 'asc'}
                  onClick={() => onSort('mnt_tot_dev')}
                  sx={sortLabelSx}
                >
                  Mnt (Devise)
                </TableSortLabel>
              </TableCell>
              <TableCell
                sx={{ ...headerSx, minWidth: 150 }}
                align='right'
                sortDirection={sortBy === 'mnt_tot_dzd' ? sortOrder : false}
              >
                <TableSortLabel
                  active={sortBy === 'mnt_tot_dzd'}
                  direction={sortBy === 'mnt_tot_dzd' ? sortOrder : 'asc'}
                  onClick={() => onSort('mnt_tot_dzd')}
                  sx={sortLabelSx}
                >
                  Mnt (DZD)
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...headerSx, minWidth: 150 }}>Catégorie</TableCell>
              <TableCell sx={{ ...headerSx, width: 80 }}>Act.</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {colis.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant='h6' align='center' sx={{ p: 4 }}>
                    Aucun historique trouvé
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              colis.map(item => (
                <TableRow key={item.id_colis} hover>
                  <TableCell
                    sx={{
                      position: 'sticky',
                      left: 0,
                      backgroundColor: 'background.paper',
                      borderRight: 1,
                      borderColor: 'divider',
                      zIndex: 10
                    }}
                  >
                    {item?.produit?.designation_prd}
                  </TableCell>
                  <TableCell>{dayjs(item.date_achat).format('DD/MM/YYYY')}</TableCell>
                  <TableCell align='center'>
                    <Chip
                      label={item.date_stock ? 'En Stock' : 'En Route'}
                      color={item.date_stock ? 'success' : 'warning'}
                      size='small'
                    />
                  </TableCell>
                  <TableCell align='center'>{item.qte_achat}</TableCell>
                  <TableCell align='right'>{`${parseFloat(item.mnt_tot_dev || 0).toFixed(2)} ${
                    item?.compte?.devise?.symbole_dev || ''
                  }`}</TableCell>
                  <TableCell align='right'>{formatMontant(item.mnt_tot_dzd)} DA</TableCell>
                  <TableCell>{item?.categorie?.designation_cat}</TableCell>
                  <TableCell align='right'>
                    <IconButton onClick={e => onMenuOpen(e, item)}>
                      <Icon icon='tabler:pencil' />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component='div'
        count={totalItems}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </Card>
  )
}

export default TableauHistorique
