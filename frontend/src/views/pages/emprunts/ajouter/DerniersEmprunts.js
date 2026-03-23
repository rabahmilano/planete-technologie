import { useState } from 'react'
import {
  Card,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  Box,
  Chip
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import dayjs from 'dayjs'

import { useEmprunt } from 'src/context/EmpruntContext'
import { useCompte } from 'src/context/CompteContext'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import { formatMontant } from 'src/@core/utils/format'

const DerniersEmprunts = () => {
  const { emprunts, supprimerEmprunt } = useEmprunt()
  const { fetchComptes } = useCompte()

  const [openDeleteModal, setOpenDeleteModal] = useState(false)
  const [empruntToDelete, setEmpruntToDelete] = useState(null)

  const recentEmprunts = emprunts.slice(0, 5)

  const handleDeleteClick = emprunt => {
    setEmpruntToDelete(emprunt)
    setOpenDeleteModal(true)
  }

  const executeDelete = async () => {
    setOpenDeleteModal(false)
    const isSuccess = await supprimerEmprunt(empruntToDelete.id_emprunt)

    if (isSuccess) {
      await fetchComptes()
    }
  }

  if (recentEmprunts.length === 0) return null

  return (
    <>
      <Card sx={{ mt: 6, boxShadow: 3, borderRadius: 2 }}>
        <CardHeader title='Derniers emprunts enregistrés' titleTypographyProps={{ variant: 'h6' }} sx={{ pb: 2 }} />
        <TableContainer>
          <Table size='small'>
            <TableHead sx={{ backgroundColor: 'customColors.tableHeaderBg' }}>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Désignation</TableCell>
                <TableCell>Compte</TableCell>
                <TableCell align='right'>Montant</TableCell>
                <TableCell align='center'>Statut</TableCell>
                <TableCell align='center'>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentEmprunts.map(emp => {
                const isDeleteDisabled = emp.remboursements && emp.remboursements.length > 0

                return (
                  <TableRow key={emp.id_emprunt} hover>
                    <TableCell>{dayjs(emp.date_emprunt).format('DD/MM/YYYY')}</TableCell>
                    <TableCell>
                      <Typography variant='body2' sx={{ fontWeight: 600 }}>
                        {emp.des_emprunt}
                      </Typography>
                    </TableCell>
                    <TableCell>{emp.compte?.designation_cpt}</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 'bold', color: 'error.main' }}>
                      {formatMontant(emp.mnt_emprunt)} {emp.compte?.dev_code}
                    </TableCell>
                    <TableCell align='center'>
                      <Chip
                        label={emp.statut_emprunt}
                        color={emp.statut_emprunt === 'SOLDE' ? 'success' : 'warning'}
                        size='small'
                        variant='outlined'
                      />
                    </TableCell>
                    <TableCell align='center'>
                      <IconButton
                        size='small'
                        color='error'
                        onClick={() => handleDeleteClick(emp)}
                        disabled={isDeleteDisabled}
                        title={isDeleteDisabled ? 'Impossible : remboursements existants' : 'Supprimer'}
                      >
                        <Icon icon='tabler:trash' fontSize='1.25rem' />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <ConfirmDialog
        open={openDeleteModal}
        handleClose={() => setOpenDeleteModal(false)}
        handleConfirm={executeDelete}
        actionType='delete'
        title='Supprimer cet emprunt ?'
        confirmText='Supprimer définitivement'
        content={
          <>
            <Typography variant='body1' sx={{ mb: 4 }}>
              Êtes-vous sûr de vouloir annuler cet emprunt ? Le montant sera immédiatement déduit du solde de votre
              compte.
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
                  Montant à retirer : {formatMontant(empruntToDelete.mnt_emprunt)} {empruntToDelete.compte?.dev_code}
                </Typography>
              </Box>
            )}
          </>
        }
      />
    </>
  )
}

export default DerniersEmprunts
