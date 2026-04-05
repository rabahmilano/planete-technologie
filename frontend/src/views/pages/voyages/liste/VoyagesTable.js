import { useState } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Tooltip
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import dayjs from 'dayjs'
import { getStatusColor, getStatusLabel } from 'src/@core/utils/voyageUtils'

const VoyagesTable = ({ voyages, loading, onAction }) => {
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedVoyage, setSelectedVoyage] = useState(null)

  const handleDropdownOpen = (event, voyage) => {
    setAnchorEl(event.currentTarget)
    setSelectedVoyage(voyage)
  }

  const handleDropdownClose = () => {
    setAnchorEl(null)
    setSelectedVoyage(null)
  }

  const handleAction = actionType => {
    onAction(actionType, selectedVoyage)
    handleDropdownClose()
  }

  return (
    <>
      <TableContainer>
        <Table sx={{ minWidth: 800 }}>
          <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
            <TableRow>
              <TableCell>Désignation</TableCell>
              <TableCell>Destination</TableCell>
              <TableCell>Dates (Aller - Retour)</TableCell>
              <TableCell>Contenu du dossier</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align='right'>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align='center' sx={{ py: 10 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : voyages?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align='center' sx={{ py: 10 }}>
                  <Typography variant='body2' color='textSecondary'>
                    Aucun voyage enregistré pour le moment.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              voyages?.map(voyage => (
                <TableRow hover key={voyage.id_voyage}>
                  <TableCell>
                    <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                      {voyage.des_voyage}
                    </Typography>
                    <Typography variant='caption' color='textSecondary'>
                      Devise : {voyage.dev_dest}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>{voyage.dest_voyage || '--'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>
                      <Box component='span' sx={{ fontWeight: 600 }}>
                        Départ :
                      </Box>{' '}
                      {dayjs(voyage.date_dep).format('DD/MM/YYYY')}
                    </Typography>
                    <Typography variant='body2'>
                      <Box component='span' sx={{ fontWeight: 600 }}>
                        Retour :
                      </Box>{' '}
                      {dayjs(voyage.date_ret).format('DD/MM/YYYY')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>
                      <Icon icon='tabler:receipt' fontSize='1rem' style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      {voyage._count?.transactions || 0} Factures
                    </Typography>
                    <Typography variant='body2'>
                      <Icon
                        icon='tabler:receipt-tax'
                        fontSize='1rem'
                        style={{ verticalAlign: 'middle', marginRight: 4 }}
                      />
                      {voyage._count?.depenses || 0} Frais annexes
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(voyage.statut_voy)}
                      color={getStatusColor(voyage.statut_voy)}
                      size='small'
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align='right'>
                    <Tooltip title='Voir les détails'>
                      <IconButton component={Link} href={`/voyages/${voyage.id_voyage}`} color='primary'>
                        <Icon icon='tabler:eye' />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Actions'>
                      <IconButton onClick={e => handleDropdownOpen(e, voyage)}>
                        <Icon icon='tabler:dots-vertical' />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleDropdownClose}>
        {selectedVoyage?.statut_voy === 'EN_PREPARATION' && (
          <MenuItem onClick={() => handleAction('DEMARRER')}>
            <Icon icon='tabler:plane-inflight' style={{ marginRight: 8 }} /> Démarrer le voyage
          </MenuItem>
        )}
        {selectedVoyage?.statut_voy === 'EN_COURS' && (
          <MenuItem onClick={() => handleAction('CLOTURER')} sx={{ color: 'success.main' }}>
            <Icon icon='tabler:calculator' style={{ marginRight: 8 }} /> Clôturer & Calculer TTC
          </MenuItem>
        )}
        {selectedVoyage?.statut_voy === 'CLOTURE' && (
          <MenuItem onClick={() => handleAction('REOUVRIR')} sx={{ color: 'warning.main' }}>
            <Icon icon='tabler:lock-open' style={{ marginRight: 8 }} /> Réouvrir le voyage
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

export default VoyagesTable
