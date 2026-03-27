import { Card, TableContainer, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import dayjs from 'dayjs'

const headerSx = {
  color: 'white',
  backgroundColor: '#0d1b2a',
  whiteSpace: 'nowrap',
  fontSize: { xs: '0.7rem', sm: '0.875rem' }
}

const TableauColis = ({ colis, onRowClick }) => {
  return (
    <Card>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
              <TableCell sx={{ ...headerSx, position: 'sticky', left: 0, zIndex: 10 }}>Désignation</TableCell>
              <TableCell sx={headerSx}>Date d'Achat</TableCell>
              <TableCell sx={headerSx} align='center'>
                Temps d'attente
              </TableCell>
              <TableCell sx={headerSx} align='center'>
                Quantité
              </TableCell>
              <TableCell sx={headerSx} align='right'>
                Prix d'Achat
              </TableCell>
              <TableCell sx={headerSx} align='right'>
                Catégorie
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {colis.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant='h6' align='center' sx={{ p: 4 }}>
                    Aucun colis n'est en route
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              colis.map(item => {
                const waitingDays = dayjs().diff(dayjs(item.date_achat), 'day')
                return (
                  <TableRow key={item.id_colis} onClick={() => onRowClick(item)} hover sx={{ cursor: 'pointer' }}>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        backgroundColor: 'background.paper',
                        borderRight: '1px solid rgba(224, 224, 224, 1)'
                      }}
                    >
                      {item?.produit?.designation_prd}
                    </TableCell>
                    <TableCell>{dayjs(item.date_achat).format('DD MMM YYYY')}</TableCell>
                    <TableCell align='center'>
                      <Typography color={waitingDays > 20 ? 'error' : 'textPrimary'}>{waitingDays} jours</Typography>
                    </TableCell>
                    <TableCell align='center'>{item.qte_achat}</TableCell>
                    <TableCell align='right'>
                      {item.mnt_tot_dev} {item.compte?.devise?.symbole_dev}
                    </TableCell>
                    <TableCell align='right'>{item.categorie?.designation_cat}</TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  )
}

export default TableauColis
