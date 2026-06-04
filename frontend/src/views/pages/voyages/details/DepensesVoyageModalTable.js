import { useState } from 'react'
import {
  Paper,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Box
} from '@mui/material'
import dayjs from 'dayjs'
import Icon from 'src/@core/components/icon'

import EditDepenseModal from 'src/views/pages/depenses/liste/EditDepenseModal'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import { useDepense } from 'src/context/DepenseContext'
import { formatMontant } from 'src/@core/utils/format'

const DepensesVoyageModalTable = ({ depenses, refreshData }) => {
  const { annulerDepense, listNature } = useDepense()

  const [openEditModal, setOpenEditModal] = useState(false)
  const [depenseToEdit, setDepenseToEdit] = useState(null)

  const [openDeleteModal, setOpenDeleteModal] = useState(false)
  const [depenseToDelete, setDepenseToDelete] = useState(null)

  const handleEditClick = depense => {
    setDepenseToEdit({
      id: String(depense.id_op_dep),
      nature: depense.nature_dep?.designation_nat_dep,
      observation: depense.observation,
      montant: depense.mnt_dep_dzd
    })
    setOpenEditModal(true)
  }

  const handleDeleteClick = depense => {
    setDepenseToDelete(depense)
    setOpenDeleteModal(true)
  }

  const executeDelete = async () => {
    if (!depenseToDelete) return
    const isSuccess = await annulerDepense(depenseToDelete.id_op_dep)

    if (isSuccess && refreshData) {
      refreshData()
    }
    setOpenDeleteModal(false)
  }

  return (
    <>
      <Paper sx={{ overflow: 'hidden', boxShadow: 4, borderRadius: 2 }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 350px)' }}>
          <Table stickyHeader size='small' sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    backgroundColor: '#e2e8f0',
                    color: '#0f172a',
                    py: 2,
                    fontWeight: 700,
                    pl: '16px !important',
                    borderBottom: '2px solid #94a3b8'
                  }}
                >
                  Date
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#e2e8f0',
                    color: '#0f172a',
                    py: 2,
                    fontWeight: 700,
                    borderBottom: '2px solid #94a3b8'
                  }}
                >
                  Nature
                </TableCell>
                <TableCell
                  align='right'
                  sx={{
                    backgroundColor: '#e2e8f0',
                    color: '#0f172a',
                    py: 2,
                    fontWeight: 700,
                    borderBottom: '2px solid #94a3b8'
                  }}
                >
                  Montant
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#e2e8f0',
                    color: '#0f172a',
                    py: 2,
                    fontWeight: 700,
                    borderBottom: '2px solid #94a3b8'
                  }}
                >
                  Compte
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#e2e8f0',
                    color: '#0f172a',
                    py: 2,
                    fontWeight: 700,
                    borderBottom: '2px solid #94a3b8'
                  }}
                >
                  Observation
                </TableCell>
                <TableCell
                  align='center'
                  sx={{
                    backgroundColor: '#e2e8f0',
                    color: '#0f172a',
                    py: 2,
                    fontWeight: 700,
                    borderBottom: '2px solid #94a3b8'
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {depenses?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align='center' sx={{ py: 8 }}>
                    <Typography variant='body1' color='text.secondary'>
                      Aucune dépense à afficher.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                depenses?.map((depense, index) => {
                  const isLastRow = index === depenses.length - 1
                  const rowBorder = isLastRow ? 'none' : '1px solid #f1f5f9'

                  return (
                    <TableRow
                      key={depense.id_op_dep}
                      hover
                      sx={{
                        opacity: depense.isAnnule ? 0.5 : 1,
                        backgroundColor: depense.isAnnule ? 'rgba(0,0,0,0.03)' : 'inherit',
                        '& td': {
                          borderBottom: rowBorder,
                          textDecoration: depense.isAnnule ? 'line-through' : 'none',
                          color: depense.isAnnule ? 'text.disabled' : 'inherit'
                        }
                      }}
                    >
                      {/* 1. DATE */}
                      <TableCell sx={{ whiteSpace: 'nowrap', verticalAlign: 'middle', pl: '16px !important' }}>
                        {dayjs(depense.date_dep).format('DD/MM/YYYY')}
                      </TableCell>

                      {/* 2. NATURE */}
                      <TableCell sx={{ fontWeight: 600, verticalAlign: 'middle' }}>
                        {depense.nature_dep?.designation_nat_dep}
                      </TableCell>

                      {/* 3. MONTANT */}
                      <TableCell align='right' sx={{ verticalAlign: 'middle' }}>
                        <Typography
                          variant='body2'
                          fontWeight='bold'
                          color={depense.isAnnule ? 'text.disabled' : 'error.main'}
                        >
                          {formatMontant(depense.mnt_dep_dzd)} DA
                        </Typography>
                        <Typography variant='caption' display='block'>
                          {formatMontant(depense.mnt_dep)} {depense.compte?.dev_code}
                        </Typography>
                      </TableCell>

                      {/* 4. COMPTE */}
                      <TableCell sx={{ verticalAlign: 'middle' }}>
                        <Typography variant='body2' fontWeight={600}>
                          {depense.compte?.designation_cpt || 'Inconnu'}
                        </Typography>
                      </TableCell>

                      {/* 5. OBSERVATION */}
                      <TableCell sx={{ verticalAlign: 'middle', maxWidth: 250 }}>
                        {depense.observation ? (
                          <Typography
                            variant='body2'
                            color={depense.isAnnule ? 'text.disabled' : 'textSecondary'}
                            sx={{ overflowWrap: 'break-word' }}
                          >
                            {depense.observation}
                          </Typography>
                        ) : (
                          <Typography variant='caption' color='textSecondary' sx={{ fontStyle: 'italic' }}>
                            -
                          </Typography>
                        )}
                      </TableCell>

                      {/* 6. ACTIONS */}
                      <TableCell align='center' sx={{ verticalAlign: 'middle' }}>
                        {depense.isAnnule ? (
                          <Typography variant='caption' fontWeight='bold' color='error'>
                            ANNULÉE
                          </Typography>
                        ) : (
                          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <IconButton
                              size='small'
                              color='primary'
                              sx={{ mr: 2 }}
                              onClick={() => handleEditClick(depense)}
                              title='Modifier'
                            >
                              <Icon icon='tabler:edit' fontSize='1.25rem' />
                            </IconButton>
                            <IconButton
                              size='small'
                              color='error'
                              onClick={() => handleDeleteClick(depense)}
                              title='Annuler la dépense'
                            >
                              <Icon icon='tabler:trash' fontSize='1.25rem' />
                            </IconButton>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {openEditModal && (
        <EditDepenseModal
          open={openEditModal}
          handleClose={() => setOpenEditModal(false)}
          depense={depenseToEdit}
          naturesList={listNature}
          refreshData={refreshData}
        />
      )}

      <ConfirmDialog
        open={openDeleteModal}
        handleClose={() => setOpenDeleteModal(false)}
        handleConfirm={executeDelete}
        actionType='delete'
        title='Annuler cette dépense ?'
        confirmText="Oui, restituer l'argent"
        content={
          <>
            <Typography variant='body1' sx={{ mb: 4 }}>
              Êtes-vous sûr de vouloir annuler cette dépense ? Cette action supprimera la transaction de vos
              statistiques et restituera l'argent sur le compte source.
            </Typography>
            {depenseToDelete && (
              <Box sx={{ p: 4, backgroundColor: 'rgba(234, 84, 85, 0.08)', border: '1px dashed red', borderRadius: 1 }}>
                <Typography variant='body2'>
                  <strong>Nature :</strong> {depenseToDelete.nature_dep?.designation_nat_dep}
                </Typography>
                <Typography variant='body2'>
                  <strong>Date :</strong> {dayjs(depenseToDelete.date_dep).format('DD/MM/YYYY')}
                </Typography>
                <Typography variant='h6' sx={{ mt: 2, fontWeight: 'bold', color: 'error.main' }}>
                  Montant à restituer : {formatMontant(depenseToDelete.mnt_dep_dzd)} DZD
                </Typography>
              </Box>
            )}
          </>
        }
      />
    </>
  )
}

export default DepensesVoyageModalTable
