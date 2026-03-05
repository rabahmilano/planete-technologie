import { useState } from 'react'
import { TableRow, TableCell, IconButton, Collapse, Box, Typography, Table, TableHead, TableBody } from '@mui/material'
import dayjs from 'dayjs'
import Icon from 'src/@core/components/icon'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import axios from 'axios'
import toast from 'react-hot-toast'

const CommandeRow = ({ commande, refreshData }) => {
  const [open, setOpen] = useState(false)
  const [openDeleteModal, setOpenDeleteModal] = useState(false)

  const handleDelete = async () => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}commandes/${commande.id_cde}`)
      toast.success('Commande annulée. Stocks et compte mis à jour.')
      refreshData()
    } catch (error) {
      toast.error(error.response?.data?.error?.message || "Erreur lors de l'annulation")
    } finally {
      setOpenDeleteModal(false)
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
        <TableCell sx={{ fontWeight: 'bold' }}>#{commande.id_cde}</TableCell>
        <TableCell>{dayjs(commande.date_cde).format('DD/MM/YYYY')}</TableCell>
        <TableCell align='center'>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
             {commande.totalProduits} Produit(s)
          </Typography>
          <Typography variant="caption" color="textSecondary">
             (Total: {commande.totalUnites} unité{commande.totalUnites > 1 ? 's' : ''})
          </Typography>
        </TableCell>
        <TableCell align='right' sx={{ fontWeight: 'bold', color: 'success.main' }}>
          {parseFloat(commande.mnt_cde).toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
        </TableCell>
        <TableCell align='center'>
          <IconButton size="small" color="error" onClick={() => setOpenDeleteModal(true)} title="Annuler la commande">
            <Icon icon="tabler:trash" fontSize="1.25rem" />
          </IconButton>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout='auto' unmountOnExit>
            <Box sx={{ margin: 4, padding: 4, backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 1 }}>
              <Typography variant='h6' gutterBottom component='div' sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Icon icon='tabler:box' fontSize='1.25rem' color='primary.main' />
                Détails des produits
              </Typography>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Produit</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align='center'>Quantité</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align='right'>Prix U.</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align='right'>Total Ligne</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {commande.lignes.map((ligne, index) => (
                    <TableRow key={index}>
                      <TableCell>{ligne.designation}</TableCell>
                      <TableCell align='center'>{ligne.qte}</TableCell>
                      <TableCell align='right'>
                        {parseFloat(ligne.pu_vente).toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 'medium' }}>
                        {parseFloat(ligne.total_ligne).toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

      <ConfirmDialog 
        open={openDeleteModal}
        handleClose={() => setOpenDeleteModal(false)}
        handleConfirm={handleDelete}
        actionType="delete"
        title="Annuler cette commande ?"
        confirmText="Annuler et Restaurer"
        content={
          <Typography variant='body1'>
            Cette action est irréversible. Les produits seront remis en stock et le montant de <strong>{parseFloat(commande.mnt_cde).toLocaleString('fr-DZ')} DZD</strong> sera déduit de la caisse.
          </Typography>
        }
      />
    </>
  )
}

export default CommandeRow