import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  IconButton,
  Chip,
  CircularProgress
} from '@mui/material'
import dayjs from 'dayjs'
import Icon from 'src/@core/components/icon'

import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import { useCommande } from 'src/context/CommandeContext'
import { formatMontant } from 'src/@core/utils/format'

const DernieresCommandes = ({ refreshTrigger }) => {
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)

  const { getDernieresCommandes, deleteCommande } = useCommande()

  const [openDeleteModal, setOpenDeleteModal] = useState(false)
  const [commandeToDelete, setCommandeToDelete] = useState(null)

  const fetchDernieresCommandes = useCallback(async () => {
    setLoading(true)
    const data = await getDernieresCommandes()
    setCommandes(data || [])
    setLoading(false)
  }, [getDernieresCommandes])

  useEffect(() => {
    fetchDernieresCommandes()
  }, [refreshTrigger, fetchDernieresCommandes])

  const handleDeleteClick = commande => {
    setCommandeToDelete(commande)
    setOpenDeleteModal(true)
  }

  const executeDelete = async () => {
    if (commandeToDelete) {
      await deleteCommande(commandeToDelete.id_cde, () => {
        fetchDernieresCommandes()
      })
    }
    setOpenDeleteModal(false)
  }

  return (
    <Card sx={{ boxShadow: 3 }}>
      <CardHeader
        title='Dernières commandes enregistrées'
        titleTypographyProps={{ variant: 'h6' }}
        action={loading && <CircularProgress size={24} />}
        sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}
      />
      <TableContainer>
        <Table size='small'>
          <TableHead sx={{ backgroundColor: '#0d1b2a' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                N° CMD / Date
              </TableCell>
              <TableCell sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                Détail des articles
              </TableCell>
              <TableCell align='center' sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                Unités
              </TableCell>
              <TableCell align='right' sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                Montant Total
              </TableCell>
              <TableCell align='center' sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {commandes.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={5} align='center'>
                  <Typography variant='body2' sx={{ py: 3, opacity: 0.6 }}>
                    Aucune commande récente.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              commandes.map(commande => (
                <TableRow key={commande.id_cde} hover>
                  <TableCell>
                    <Typography variant='body2' fontWeight={600} color='primary'>
                      #{commande.id_cde}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='textSecondary'
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                      <Icon icon='tabler:calendar' fontSize='0.9rem' />
                      {dayjs(commande.date_cde).format('DD/MM/YYYY')}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {commande.lignes.slice(0, 2).map((ligne, idx) => (
                      <Typography key={idx} variant='body2' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box component='span' sx={{ fontWeight: 600 }}>
                          {ligne.qte}x
                        </Box>{' '}
                        {ligne.designation}
                      </Typography>
                    ))}
                    {commande.lignes.length > 2 && (
                      <Typography
                        variant='caption'
                        color='textSecondary'
                        sx={{ fontStyle: 'italic', mt: 0.5, display: 'block' }}
                      >
                        + {commande.lignes.length - 2} autre(s) article(s)
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell align='center'>
                    <Chip label={`${commande.totalUnites} pcs`} size='small' color='secondary' variant='outlined' />
                  </TableCell>

                  <TableCell align='right'>
                    <Typography variant='body2' fontWeight='bold' color='success.main'>
                      + {formatMontant(commande.mnt_cde)} DZD
                    </Typography>
                  </TableCell>

                  <TableCell align='center'>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <IconButton size='small' color='error' onClick={() => handleDeleteClick(commande)}>
                        <Icon icon='tabler:trash' fontSize='1.1rem' />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog
        open={openDeleteModal}
        handleClose={() => setOpenDeleteModal(false)}
        handleConfirm={executeDelete}
        actionType='delete'
        title='Annuler cette commande ?'
        confirmText='Oui, annuler et restaurer le stock'
        content={
          <Typography>
            Voulez-vous vraiment annuler la commande <strong>#{commandeToDelete?.id_cde}</strong> ? Cette action
            restituera le stock des articles et déduira l'argent de la caisse.
          </Typography>
        }
      />
    </Card>
  )
}

export default DernieresCommandes
