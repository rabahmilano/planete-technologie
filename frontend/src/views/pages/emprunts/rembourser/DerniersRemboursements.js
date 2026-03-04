import { useState, useMemo } from 'react'
import { Card, CardHeader, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Typography, Box } from '@mui/material'
import Icon from 'src/@core/components/icon'
import dayjs from 'dayjs'
import axios from 'axios'
import toast from 'react-hot-toast'

import { useEmprunt } from 'src/context/EmpruntContext'
import { useCompte } from 'src/context/CompteContext'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'

const DerniersRemboursements = () => {
  const { emprunts, fetchEmprunts } = useEmprunt()
  const { comptes, fetchComptes } = useCompte()

  const [openDeleteModal, setOpenDeleteModal] = useState(false)
  const [rembToDelete, setRembToDelete] = useState(null)

  // 1. Extraction et Tri des 5 derniers remboursements globaux
  const recentRemboursements = useMemo(() => {
    // Aplatir tous les remboursements dans un seul tableau
    const allRemb = emprunts.flatMap(emp => 
      (emp.remboursements || []).map(r => ({
        ...r,
        emprunt_designation: emp.designation,
        // On récupère le nom du compte source depuis le contexte global
        compte_source: comptes.find(c => c.id_cpt === r.cpt_remb)?.designation_cpt || 'Inconnu'
      }))
    )
    
    // Trier par date la plus récente, puis prendre les 5 premiers
    return allRemb
      .sort((a, b) => dayjs(b.date_remb).valueOf() - dayjs(a.date_remb).valueOf())
      .slice(0, 5)
  }, [emprunts, comptes])

  const handleDeleteClick = (remb) => {
    setRembToDelete(remb)
    setOpenDeleteModal(true)
  }

  const executeDelete = async () => {
    setOpenDeleteModal(false)
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}emprunts/remboursement/${rembToDelete.id_remb}`)
      toast.success('Remboursement annulé, argent restitué.')
      
      await fetchEmprunts()
      await fetchComptes()
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la suppression')
    }
  }

  if (recentRemboursements.length === 0) return null

  return (
    <>
      <Card sx={{ mt: 6, boxShadow: 3, borderRadius: 2 }}>
        <CardHeader 
          title="Derniers remboursements effectués" 
          titleTypographyProps={{ variant: 'h6' }}
          sx={{ pb: 2 }}
        />
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ backgroundColor: 'customColors.tableHeaderBg' }}>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Emprunt concerné</TableCell>
                <TableCell>Compte source</TableCell>
                <TableCell align="right">Montant payé</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentRemboursements.map((remb) => (
                <TableRow key={remb.id_remb} hover>
                  <TableCell>{dayjs(remb.date_remb).format('DD/MM/YYYY')}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{remb.emprunt_designation}</Typography>
                  </TableCell>
                  <TableCell>{remb.compte_source}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                    {parseFloat(remb.montant_remb).toLocaleString('fr-DZ')}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="error" onClick={() => handleDeleteClick(remb)} title="Annuler le paiement">
                      <Icon icon="tabler:trash" fontSize="1.25rem" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <ConfirmDialog 
        open={openDeleteModal}
        handleClose={() => setOpenDeleteModal(false)}
        handleConfirm={executeDelete}
        actionType="delete"
        title="Annuler ce remboursement ?"
        confirmText="Restituer l'argent"
        content={
          <>
            <Typography variant='body1' sx={{ mb: 4 }}>
              Cette action supprimera la trace de ce paiement et restituera les fonds sur le compte source. L'emprunt repassera "En cours" si besoin.
            </Typography>
            {rembToDelete && (
              <Box sx={{ p: 4, backgroundColor: 'rgba(234, 84, 85, 0.08)', border: '1px dashed red', borderRadius: 1 }}>
                <Typography variant='body2'><strong>Emprunt :</strong> {rembToDelete.emprunt_designation}</Typography>
                <Typography variant='body2'><strong>Date :</strong> {dayjs(rembToDelete.date_remb).format('DD/MM/YYYY')}</Typography>
                <Typography variant='h6' sx={{ mt: 2, fontWeight: 'bold', color: 'error.main' }}>
                  Montant à restituer : {parseFloat(rembToDelete.montant_remb).toLocaleString('fr-DZ')}
                </Typography>
              </Box>
            )}
          </>
        }
      />
    </>
  )
}

export default DerniersRemboursements