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
          <TableHead sx={{ backgroundColor: '#0d1b2a' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                Désignation
              </TableCell>
              <TableCell sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                Destination
              </TableCell>
              <TableCell sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                Dates (Aller - Retour)
              </TableCell>
              <TableCell sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                Contenu du dossier
              </TableCell>
              <TableCell sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                Statut
              </TableCell>
              <TableCell align='right' sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                Actions
              </TableCell>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Icon icon='tabler:credit-card' fontSize='0.9rem' color='text.secondary' />
                      <Typography variant='caption' color='textSecondary'>
                        {voyage.compte_defaut?.designation_cpt || 'Aucun compte par défaut'}{' '}
                        {voyage.dev_dest ? `(${voyage.dev_dest})` : ''}
                      </Typography>
                    </Box>
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
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Chip
                        label={getStatusLabel(voyage.statut_voy)}
                        color={getStatusColor(voyage.statut_voy)}
                        size='small'
                        sx={{ fontWeight: 600 }}
                      />
                      {voyage.statut_voy === 'CLOTURE' && voyage.coeff_approche && (
                        <Typography variant='caption' sx={{ mt: 1, fontWeight: 700, color: 'success.main' }}>
                          Coeff Final : {parseFloat(voyage.coeff_approche).toFixed(4)}
                        </Typography>
                      )}
                    </Box>
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
        {selectedVoyage?._count?.depenses === 0 && selectedVoyage?._count?.transactions === 0 && (
          <MenuItem onClick={() => handleAction('SUPPRIMER')} sx={{ color: 'error.main' }}>
            <Icon icon='tabler:trash' style={{ marginRight: 8 }} /> Supprimer le dossier
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

export default VoyagesTable
