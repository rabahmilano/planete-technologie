import { useState } from 'react'
import { Card, CardHeader, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Typography, Box, Chip } from '@mui/material'
import Icon from 'src/@core/components/icon'
import dayjs from 'dayjs'
import axios from 'axios'
import toast from 'react-hot-toast'

import { useEmprunt } from 'src/context/EmpruntContext'
import { useCompte } from 'src/context/CompteContext'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'

const DerniersEmprunts = () => {
  const { emprunts, fetchEmprunts } = useEmprunt()
  const { fetchComptes } = useCompte()

  // États pour la modale de suppression
  const [openDeleteModal, setOpenDeleteModal] = useState(false)
  const [empruntToDelete, setEmpruntToDelete] = useState(null)

  // On prend uniquement les 5 derniers emprunts (supposant qu'ils sont triés par date décroissante dans le backend)
  const recentEmprunts = emprunts.slice(0, 5)

  // Ouvre la modale
  const handleDeleteClick = (emprunt) => {
    setEmpruntToDelete(emprunt)
    setOpenDeleteModal(true)
  }

  // Exécute la suppression
  const executeDelete = async () => {
    setOpenDeleteModal(false)
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}emprunts/${empruntToDelete.id_emprunt}`)
      toast.success('Emprunt supprimé, solde du compte mis à jour.')
      
      // Rafraîchir les données globales
      await fetchEmprunts()
      await fetchComptes()
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la suppression')
    }
  }

  if (recentEmprunts.length === 0) return null // Ne rien afficher s'il n'y a pas d'historique

  return (
    <>
      <Card sx={{ mt: 6, boxShadow: 3, borderRadius: 2 }}>
        <CardHeader 
          title="Derniers emprunts enregistrés" 
          titleTypographyProps={{ variant: 'h6' }}
          sx={{ pb: 2 }}
        />
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ backgroundColor: 'customColors.tableHeaderBg' }}>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Désignation</TableCell>
                <TableCell>Compte</TableCell>
                <TableCell align="right">Montant</TableCell>
                <TableCell align="center">Statut</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentEmprunts.map((emp) => {
                const isDeleteDisabled = emp.remboursements && emp.remboursements.length > 0
                
                return (
                  <TableRow key={emp.id_emprunt} hover>
                    <TableCell>{dayjs(emp.date_emprunt).format('DD/MM/YYYY')}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{emp.designation}</Typography>
                    </TableCell>
                    <TableCell>{emp.compte?.designation_cpt}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                      {parseFloat(emp.montant_emprunt).toLocaleString('fr-DZ')} {emp.compte?.dev_code}
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={emp.statut_emprunt} 
                        color={emp.statut_emprunt === 'SOLDE' ? 'success' : 'warning'} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => handleDeleteClick(emp)}
                        disabled={isDeleteDisabled}
                        title={isDeleteDisabled ? "Impossible : remboursements existants" : "Supprimer"}
                      >
                        <Icon icon="tabler:trash" fontSize="1.25rem" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Modale de confirmation de suppression */}
      <ConfirmDialog 
        open={openDeleteModal}
        handleClose={() => setOpenDeleteModal(false)}
        handleConfirm={executeDelete}
        actionType="delete"
        title="Supprimer cet emprunt ?"
        confirmText="Supprimer définitivement"
        content={
          <>
            <Typography variant='body1' sx={{ mb: 4 }}>
              Êtes-vous sûr de vouloir annuler cet emprunt ? Le montant sera immédiatement déduit du solde de votre compte.
            </Typography>
            {empruntToDelete && (
              <Box sx={{ p: 4, backgroundColor: 'rgba(234, 84, 85, 0.08)', border: '1px dashed red', borderRadius: 1 }}>
                <Typography variant='body2'><strong>Désignation :</strong> {empruntToDelete.designation}</Typography>
                <Typography variant='body2'><strong>Date :</strong> {dayjs(empruntToDelete.date_emprunt).format('DD/MM/YYYY')}</Typography>
                <Typography variant='h6' sx={{ mt: 2, fontWeight: 'bold', color: 'error.main' }}>
                  Montant à retirer : {parseFloat(empruntToDelete.montant_emprunt).toLocaleString('fr-DZ')}
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