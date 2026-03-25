import { useState } from 'react'
import {
  TableRow,
  TableCell,
  IconButton,
  Collapse,
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  Chip
} from '@mui/material'
import dayjs from 'dayjs'
import Icon from 'src/@core/components/icon'

import { useEmprunt } from 'src/context/EmpruntContext'
import { useCompte } from 'src/context/CompteContext'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import EditEmpruntModal from './EditEmpruntModal'
import EditRemboursementModal from './EditRemboursementModal'
import { formatMontant } from 'src/@core/utils/format'

const EmpruntRow = ({ emprunt }) => {
  const [open, setOpen] = useState(false)

  const [openDeleteModal, setOpenDeleteModal] = useState(false)
  const [openDeleteRembModal, setOpenDeleteRembModal] = useState(false)
  const [openEditModal, setOpenEditModal] = useState(false)
  const [empruntToDelete, setEmpruntToDelete] = useState(null)
  const [rembToDelete, setRembToDelete] = useState(null)
  const [openEditRembModal, setOpenEditRembModal] = useState(false)
  const [rembToEdit, setRembToEdit] = useState(null)

  const { supprimerEmprunt, supprimerRemboursement } = useEmprunt()
  const { fetchComptes } = useCompte()

  const devise = emprunt.compte?.dev_code || 'DZD'

  const totalRembourse = emprunt.remboursements?.reduce((acc, curr) => acc + parseFloat(curr.mnt_remb || 0), 0) || 0

  const resteAPayer = parseFloat(emprunt.mnt_emprunt || 0) - totalRembourse
  const hasRemboursements = emprunt.remboursements && emprunt.remboursements.length > 0

  const handleDeleteEmprunt = emp => {
    setEmpruntToDelete(emp)
    setOpenDeleteModal(true)
  }

  const handleDeleteRemboursement = remb => {
    setRembToDelete(remb)
    setOpenDeleteRembModal(true)
  }

  const handleEditRemboursement = remb => {
    setRembToEdit(remb)
    setOpenEditRembModal(true)
  }

  const executeDeleteEmprunt = async () => {
    setOpenDeleteModal(false)
    const isSuccess = await supprimerEmprunt(empruntToDelete.id_emprunt)
    if (isSuccess) {
      await fetchComptes()
    }
  }

  const executeDeleteRemboursement = async () => {
    setOpenDeleteRembModal(false)
    const isSuccess = await supprimerRemboursement(rembToDelete.id_remb)
    if (isSuccess) {
      await fetchComptes()
    }
  }

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton aria-label='expand row' size='small' onClick={() => setOpen(!open)}>
            <Icon icon={open ? 'tabler:chevron-up' : 'tabler:chevron-down'} />
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontWeight: 'medium' }}>{emprunt.des_emprunt}</TableCell>
        <TableCell>{emprunt.compte?.designation_cpt || 'N/A'}</TableCell>
        <TableCell>{dayjs(emprunt.date_emprunt).format('DD MMMM YYYY')}</TableCell>
        <TableCell align='right'>
          {formatMontant(emprunt.mnt_emprunt)} {devise}
        </TableCell>
        <TableCell align='right' sx={{ fontWeight: 'bold', color: resteAPayer > 0 ? 'error.main' : 'success.main' }}>
          {formatMontant(resteAPayer)} {devise}
        </TableCell>
        <TableCell align='center'>
          <Chip
            label={emprunt.statut_emprunt === 'SOLDE' ? 'SOLDÉ' : 'EN COURS'}
            color={emprunt.statut_emprunt === 'SOLDE' ? 'success' : 'warning'}
            size='small'
            sx={{ fontWeight: 'bold' }}
          />
        </TableCell>
        <TableCell align='center'>
          <IconButton
            size='small'
            color='primary'
            sx={{ mr: 2 }}
            onClick={() => setOpenEditModal(true)}
            title='Modifier'
          >
            <Icon icon='tabler:edit' fontSize='1.25rem' />
          </IconButton>
          <IconButton
            size='small'
            color='error'
            onClick={() => handleDeleteEmprunt(emprunt)}
            disabled={hasRemboursements}
            title={hasRemboursements ? 'Impossible : remboursements existants' : 'Supprimer'}
          >
            <Icon icon='tabler:trash' fontSize='1.25rem' />
          </IconButton>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout='auto' unmountOnExit>
            <Box sx={{ margin: 4, padding: 4, backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 1 }}>
              <Typography
                variant='h6'
                gutterBottom
                component='div'
                sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
              >
                <Icon icon='tabler:receipt-refund' fontSize='1.25rem' color='primary.main' />
                Historique des remboursements
              </Typography>

              {hasRemboursements ? (
                <Table size='small' aria-label='remboursements'>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align='right'>
                        Montant Remboursé
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align='center'>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {emprunt.remboursements.map(remb => (
                      <TableRow key={remb.id_remb}>
                        <TableCell>{dayjs(remb.date_remb).format('DD MMMM YYYY')}</TableCell>
                        <TableCell align='right' sx={{ color: 'success.main', fontWeight: 'medium' }}>
                          + {formatMontant(remb.mnt_remb)} {devise}
                        </TableCell>
                        <TableCell align='center'>
                          <IconButton
                            size='small'
                            color='primary'
                            sx={{ mr: 2 }}
                            onClick={() => handleEditRemboursement(remb)}
                            title='Modifier'
                          >
                            <Icon icon='tabler:edit' fontSize='1.1rem' />
                          </IconButton>
                          <IconButton
                            size='small'
                            color='error'
                            onClick={() => handleDeleteRemboursement(remb)}
                            title='Annuler le paiement'
                          >
                            <Icon icon='tabler:trash' fontSize='1.1rem' />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Total remboursé :</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 'bold' }}>
                        {formatMontant(totalRembourse)} {devise}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <Typography variant='body2' color='textSecondary' sx={{ mt: 2, fontStyle: 'italic' }}>
                  Aucun remboursement n'a encore été effectué pour cet emprunt.
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

      <EditEmpruntModal open={openEditModal} handleClose={() => setOpenEditModal(false)} emprunt={emprunt} />

      <EditRemboursementModal
        open={openEditRembModal}
        handleClose={() => setOpenEditRembModal(false)}
        remboursement={rembToEdit}
        empruntParent={emprunt}
      />

      <ConfirmDialog
        open={openDeleteModal}
        handleClose={() => setOpenDeleteModal(false)}
        handleConfirm={executeDeleteEmprunt}
        actionType='delete'
        title="Supprimer l'emprunt ?"
        confirmText='Supprimer définitivement'
        content={
          <>
            <Typography variant='body1' sx={{ mb: 4 }}>
              Êtes-vous sûr de vouloir supprimer cet emprunt ? Le montant sera déduit du solde de votre compte.
            </Typography>
            {empruntToDelete && (
              <Box sx={{ p: 4, backgroundColor: 'rgba(234, 84, 85, 0.08)', border: '1px dashed red', borderRadius: 1 }}>
                <Typography variant='body2'>
                  <strong>Désignation :</strong> {empruntToDelete.des_emprunt}
                </Typography>
                <Typography variant='body2'>
                  <strong>Date :</strong> {dayjs(empruntToDelete.date_emprunt).format('DD/MM/YYYY')}
                </Typography>
                <Typography variant='h6' sx={{ mt: 2, fontWeight: 'bold', color: 'error.main' }}>
                  Montant à retirer : {formatMontant(empruntToDelete.mnt_emprunt)} {devise}
                </Typography>
              </Box>
            )}
          </>
        }
      />

      <ConfirmDialog
        open={openDeleteRembModal}
        handleClose={() => setOpenDeleteRembModal(false)}
        handleConfirm={executeDeleteRemboursement}
        actionType='delete'
        title='Annuler ce remboursement ?'
        confirmText="Restituer l'argent"
        content={
          <>
            <Typography variant='body1' sx={{ mb: 4 }}>
              Cette action supprimera la trace de ce paiement et restituera les fonds sur le compte source.
            </Typography>
            {rembToDelete && (
              <Box sx={{ p: 4, backgroundColor: 'rgba(234, 84, 85, 0.08)', border: '1px dashed red', borderRadius: 1 }}>
                <Typography variant='body2'>
                  <strong>Emprunt :</strong> {emprunt.des_emprunt}
                </Typography>
                <Typography variant='body2'>
                  <strong>Date :</strong> {dayjs(rembToDelete.date_remb).format('DD/MM/YYYY')}
                </Typography>
                <Typography variant='h6' sx={{ mt: 2, fontWeight: 'bold', color: 'error.main' }}>
                  Montant à restituer : {formatMontant(rembToDelete.mnt_remb)} {devise}
                </Typography>
              </Box>
            )}
          </>
        }
      />
    </>
  )
}

export default EmpruntRow
