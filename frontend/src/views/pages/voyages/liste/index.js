import { useState, useContext, useEffect } from 'react'
import Link from 'next/link'
import {
  Card,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import dayjs from 'dayjs'

// Context
import { VoyageContext } from 'src/context/VoyageContext'

const VoyagesList = () => {
  const { voyages, loading, fetchVoyages, changerStatutVoyage } = useContext(VoyageContext)

  // États pour le menu d'actions
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedVoyage, setSelectedVoyage] = useState(null)

  // États pour la modale du taux de change (Passage EN COURS)
  const [openTauxModal, setOpenTauxModal] = useState(false)
  const [tauxSaisi, setTauxSaisi] = useState('')

  useEffect(() => {
    fetchVoyages()
  }, [])

  const handleDropdownOpen = (event, voyage) => {
    setAnchorEl(event.currentTarget)
    setSelectedVoyage(voyage)
  }

  const handleDropdownClose = () => {
    setAnchorEl(null)
    setSelectedVoyage(null)
  }

  const actionChangerStatut = async statut => {
    if (!selectedVoyage) return

    if (statut === 'EN_COURS') {
      // On ouvre la modale pour demander le taux
      setOpenTauxModal(true)
      handleDropdownClose()
    } else if (statut === 'CLOTURE') {
      // Clôture directe (le backend fera les calculs)
      await changerStatutVoyage(selectedVoyage.id_voyage, 'CLOTURE')
      handleDropdownClose()
    }
  }

  const validerPassageEnCours = async () => {
    if (!tauxSaisi || isNaN(tauxSaisi) || parseFloat(tauxSaisi) <= 0) return
    await changerStatutVoyage(selectedVoyage.id_voyage, 'EN_COURS', parseFloat(tauxSaisi))
    setOpenTauxModal(false)
    setTauxSaisi('')
  }

  const getStatusColor = statut => {
    switch (statut) {
      case 'EN_PREPARATION':
        return 'warning'
      case 'EN_COURS':
        return 'primary'
      case 'CLOTURE':
        return 'success'
      default:
        return 'secondary'
    }
  }

  const getStatusLabel = statut => {
    switch (statut) {
      case 'EN_PREPARATION':
        return 'En Préparation'
      case 'EN_COURS':
        return 'En Cours'
      case 'CLOTURE':
        return 'Clôturé'
      default:
        return statut
    }
  }

  return (
    <>
      <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 5 }}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Icon icon='tabler:plane' fontSize='1.75rem' color='#primary.main' />
                <Typography variant='h5'>Dossiers d'importation (Voyages)</Typography>
              </Box>
            }
          />
          <Button
            variant='contained'
            color='primary'
            component={Link}
            href='/voyages/ajouter'
            startIcon={<Icon icon='tabler:plus' />}
          >
            Nouveau Voyage
          </Button>
        </Box>

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
                        {voyage.designation}
                      </Typography>
                      <Typography variant='caption' color='textSecondary'>
                        Devise : {voyage.devise_destination}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant='body2'>{voyage.destination || '--'}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant='body2'>
                        <Box component='span' sx={{ fontWeight: 600 }}>
                          Départ :
                        </Box>{' '}
                        {dayjs(voyage.date_depart).format('DD/MM/YYYY')}
                      </Typography>
                      <Typography variant='body2'>
                        <Box component='span' sx={{ fontWeight: 600 }}>
                          Retour :
                        </Box>{' '}
                        {dayjs(voyage.date_retour).format('DD/MM/YYYY')}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant='body2'>
                        <Icon
                          icon='tabler:receipt'
                          fontSize='1rem'
                          style={{ verticalAlign: 'middle', marginRight: 4 }}
                        />
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
                        label={getStatusLabel(voyage.statut)}
                        color={getStatusColor(voyage.statut)}
                        size='small'
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>

                    <TableCell align='right'>
                      <IconButton component={Link} href={`/voyages/${voyage.id_voyage}`} color='primary'>
                        <Icon icon='tabler:eye' />
                      </IconButton>

                      <IconButton onClick={e => handleDropdownOpen(e, voyage)}>
                        <Icon icon='tabler:dots-vertical' />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Menu des actions */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleDropdownClose}>
          {selectedVoyage?.statut === 'EN_PREPARATION' && (
            <MenuItem onClick={() => actionChangerStatut('EN_COURS')}>
              <Icon icon='tabler:plane-inflight' style={{ marginRight: 8 }} /> Démarrer le voyage
            </MenuItem>
          )}
          {selectedVoyage?.statut === 'EN_COURS' && (
            <MenuItem onClick={() => actionChangerStatut('CLOTURE')} sx={{ color: 'success.main' }}>
              <Icon icon='tabler:calculator' style={{ marginRight: 8 }} /> Clôturer & Calculer TTC
            </MenuItem>
          )}
          {selectedVoyage?.statut === 'CLOTURE' && (
            <MenuItem disabled>
              <Typography variant='body2'>Aucune action (Voyage verrouillé)</Typography>
            </MenuItem>
          )}
        </Menu>
      </Card>

      {/* Modale pour le Taux de change au démarrage du voyage */}
      <Dialog open={openTauxModal} onClose={() => setOpenTauxModal(false)}>
        <DialogTitle>Démarrer le voyage</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          <Typography variant='body2' sx={{ mb: 4 }}>
            Pour passer ce voyage "En Cours", veuillez saisir le taux de change prévisionnel de la devise de destination
            ({selectedVoyage?.devise_destination}).
          </Typography>
          <CustomTextField
            fullWidth
            type='number'
            label={`Taux de change (1 ${selectedVoyage?.devise_destination} = ? DZD)`}
            value={tauxSaisi}
            onChange={e => setTauxSaisi(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTauxModal(false)} color='secondary'>
            Annuler
          </Button>
          <Button onClick={validerPassageEnCours} variant='contained' disabled={!tauxSaisi}>
            Valider
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default VoyagesList
