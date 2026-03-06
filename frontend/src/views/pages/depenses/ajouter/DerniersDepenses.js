import React, { useState, useEffect } from 'react'
import { Card, CardHeader, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Box, IconButton, Chip, CircularProgress } from '@mui/material'
import dayjs from 'dayjs'
import Icon from 'src/@core/components/icon'
import axios from 'axios'
import toast from 'react-hot-toast'

import EditDepenseModal from '../liste/EditDepenseModal'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import { useDepense } from 'src/context/DepenseContext'

const DerniersDepenses = ({ refreshTrigger }) => {
  const [depenses, setDepenses] = useState([])
  const [loading, setLoading] = useState(true)
  const { listNature } = useDepense()

  const [openEditModal, setOpenEditModal] = useState(false)
  const [depenseToEdit, setDepenseToEdit] = useState(null)
  const [openDeleteModal, setOpenDeleteModal] = useState(false)
  const [depenseToDelete, setDepenseToDelete] = useState(null)

  const fetchDernieresDepenses = async () => {
    setLoading(true)
    try {
      // AJOUT : excludeTimbres=true pour nettoyer la liste
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}depenses`, {
        params: { page: 1, limit: 5, excludeTimbres: true } 
      })
      setDepenses(response.data.depenses || [])
    } catch (error) {
      console.error("Erreur lors du chargement de l'historique", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDernieresDepenses()
  }, [refreshTrigger])

  const handleEditClick = (depense) => {
    setDepenseToEdit(depense)
    setOpenEditModal(true)
  }

  const handleDeleteClick = (depense) => {
    setDepenseToDelete(depense)
    setOpenDeleteModal(true)
  }

  const executeDelete = async () => {
    try {
      const id = depenseToDelete.id.replace('d-', '') 
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}depenses/${id}`)
      toast.success("Dépense annulée avec succès.")
      fetchDernieresDepenses() 
    } catch (error) {
      toast.error(error.response?.data?.error?.message || "Erreur lors de l'annulation")
    } finally {
      setOpenDeleteModal(false)
    }
  }

  return (
    <Card sx={{ boxShadow: 3, mt: 6 }}>
      <CardHeader 
        title='Historique de saisie récent' 
        titleTypographyProps={{ variant: 'h6' }}
        action={loading && <CircularProgress size={24} />}
        sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}
      />
      <TableContainer>
        <Table size="small">
          <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
            <TableRow>
              <TableCell>Détails</TableCell>
              <TableCell>Compte</TableCell> {/* NOUVELLE COLONNE */}
              <TableCell>Date</TableCell>
              <TableCell align='right'>Montant</TableCell>
              <TableCell align='center'>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {depenses.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={5} align='center'>
                  <Typography variant="body2" sx={{ py: 3, opacity: 0.6 }}>Aucune dépense récente.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              depenses.map(depense => (
                <TableRow key={depense.id} hover sx={{ opacity: depense.isAnnule ? 0.5 : 1 }}>
                  
                  {/* COLONNE NATURE + OBSERVATION */}
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} sx={{ textDecoration: depense.isAnnule ? 'line-through' : 'none' }}>
                      {depense.nature}
                    </Typography>
                    {depense.observation && (
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Icon icon="tabler:message-circle-2" fontSize="0.9rem" /> {depense.observation}
                      </Typography>
                    )}
                  </TableCell>

                  {/* NOUVELLE COLONNE : COMPTE */}
                  <TableCell>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: depense.isAnnule ? 'text.disabled' : 'text.primary' }}>
                      <Icon icon="tabler:building-bank" fontSize="1.1rem" color="action" />
                      {depense.compte}
                    </Typography>
                  </TableCell>
                  
                  {/* COLONNE DATE */}
                  <TableCell>
                    <Typography variant="body2" sx={{ color: depense.isAnnule ? 'text.disabled' : 'inherit' }}>
                      {dayjs(depense.date).format('DD/MM/YYYY')}
                    </Typography>
                  </TableCell>
                  
                  {/* COLONNE MONTANT : DZD + Devise originale si différent */}
                  <TableCell align='right'>
                    <Typography variant="body2" fontWeight="bold" color={depense.isAnnule ? 'text.disabled' : 'error.main'} sx={{ textDecoration: depense.isAnnule ? 'line-through' : 'none' }}>
                      - {parseFloat(depense.montant || 0).toLocaleString('fr-DZ')} DZD
                    </Typography>
                    
                    {/* Affichage intelligent : si le compte est en EUR/USD, on l'affiche en dessous */}
                    {depense.devise !== 'DZD' && (
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                        ({parseFloat(depense.montantDevise || 0).toLocaleString('fr-FR')} {depense.devise})
                      </Typography>
                    )}
                  </TableCell>

                  {/* COLONNE ACTIONS */}
                  <TableCell align='center'>
                    {depense.isAnnule ? (
                        <Chip label="Annulée" color="error" variant="outlined" size="small" />
                    ) : (
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <IconButton size="small" color="primary" onClick={() => handleEditClick(depense)}>
                          <Icon icon="tabler:edit" fontSize="1.1rem" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteClick(depense)}>
                          <Icon icon="tabler:trash" fontSize="1.1rem" />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <EditDepenseModal 
        open={openEditModal}
        handleClose={() => setOpenEditModal(false)}
        depense={depenseToEdit}
        naturesList={listNature}
        refreshData={fetchDernieresDepenses}
      />
      <ConfirmDialog 
        open={openDeleteModal}
        handleClose={() => setOpenDeleteModal(false)}
        handleConfirm={executeDelete}
        actionType="delete"
        title="Annuler cette dépense ?"
        confirmText="Oui, restituer l'argent"
        content={<Typography>Voulez-vous annuler la dépense sélectionnée et restituer l'argent ?</Typography>}
      />
    </Card>
  )
}

export default DerniersDepenses