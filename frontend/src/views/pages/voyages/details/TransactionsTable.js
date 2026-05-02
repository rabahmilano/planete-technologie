import { useState, useContext } from 'react'
import {
  Card,
  CardHeader,
  Box,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Typography,
  Tooltip,
  IconButton
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import { formatMontant } from 'src/@core/utils/format'
import { VoyageContext } from 'src/context/VoyageContext'

import ArticlesVoyageModal from './ArticlesVoyageModal'
import TransactionDetailModal from './TransactionDetailModal'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'

const TransactionsTable = ({ transactions, statut, onAddFacture }) => {
  const { deleteTransactionVoyage } = useContext(VoyageContext)

  const [modalGlobalOpen, setModalGlobalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState(null)

  const handleOpenDetail = transaction => {
    setSelectedTransaction(transaction)
    setDetailModalOpen(true)
  }

  const handleEditTransaction = transaction => {
    console.log('Action: Modifier la transaction', transaction)
  }

  const handleDeleteTransaction = transaction => {
    setTransactionToDelete(transaction)
    setConfirmOpen(true)
  }

  const executeDelete = async () => {
    if (!transactionToDelete) return

    const success = await deleteTransactionVoyage(transactionToDelete.id_trans)

    if (success) {
      setConfirmOpen(false)
      setDetailModalOpen(false)
      setTransactionToDelete(null)
    }
  }

  const renderDeleteContent = () => {
    if (!transactionToDelete) return null

    const totalFacture = parseFloat(transactionToDelete.mnt_tot_fact || 0)
    const commBnk = parseFloat(transactionToDelete.mnt_comm_banque || 0)
    const commPaie = parseFloat(transactionToDelete.mnt_comm_paie || 0)
    const totalPreleve = totalFacture + commBnk + commPaie

    return (
      <Box>
        <Typography variant='body1' sx={{ mb: 4, color: 'text.secondary' }}>
          Êtes-vous sûr de vouloir annuler cette facture ? Cette action supprimera la transaction de vos statistiques et
          restituera l'argent sur le compte source.
        </Typography>

        <Box
          sx={{
            p: 4,
            borderRadius: 1,
            border: '1px dashed',
            borderColor: 'error.main',
            backgroundColor: 'rgba(234, 84, 85, 0.08)'
          }}
        >
          <Typography variant='body2' sx={{ mb: 1, color: 'text.secondary' }}>
            <strong>Fournisseur :</strong> {transactionToDelete.fournisseur}
          </Typography>
          <Typography variant='body2' sx={{ mb: 2, color: 'text.secondary' }}>
            <strong>Articles associés :</strong> {transactionToDelete._count?.colis_voyage || 0}
          </Typography>
          <Typography variant='h6' sx={{ color: 'error.main', fontWeight: 700, fontSize: '1rem' }}>
            Montant à restituer : {formatMontant(totalPreleve)} {transactionToDelete.dev_trans}
          </Typography>
        </Box>
      </Box>
    )
  }

  return (
    <>
      <Card sx={{ boxShadow: 3, borderRadius: 2, height: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 5 }}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Icon icon='tabler:shopping-cart' color='#28c76f' />
                Transactions Marchandises
              </Box>
            }
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title='Voir tous les articles du voyage'>
              <IconButton color='#0d1b2a' onClick={() => setModalGlobalOpen(true)}>
                <Icon icon='tabler:packages' />
              </IconButton>
            </Tooltip>

            {statut === 'EN_COURS' && (
              <Tooltip title='Ajouter Facture'>
                <IconButton color='success' onClick={onAddFacture}>
                  <Icon icon='tabler:basket-plus' />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        <Divider sx={{ m: '0 !important' }} />
        <TableContainer sx={{ maxHeight: 350 }}>
          <Table size='small' stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    backgroundColor: '#0d1b2a',
                    color: 'white',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    py: 2
                  }}
                >
                  Fournisseur
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#0d1b2a',
                    color: 'white',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    py: 2
                  }}
                >
                  Devise
                </TableCell>
                <TableCell
                  align='right'
                  sx={{
                    backgroundColor: '#0d1b2a',
                    color: 'white',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    py: 2
                  }}
                >
                  Total Devise
                </TableCell>
                <TableCell
                  align='right'
                  sx={{
                    backgroundColor: '#0d1b2a',
                    color: 'white',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    py: 2
                  }}
                >
                  Total DA
                </TableCell>
                <TableCell
                  align='center'
                  sx={{
                    backgroundColor: '#0d1b2a',
                    color: 'white',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    py: 2
                  }}
                >
                  Articles
                </TableCell>
                <TableCell
                  align='center'
                  sx={{
                    backgroundColor: '#0d1b2a',
                    color: 'white',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    py: 2
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align='center' sx={{ py: 4 }}>
                    Aucun achat enregistré.
                  </TableCell>
                </TableRow>
              ) : (
                transactions?.map(t => (
                  <TableRow hover key={t.id_trans}>
                    <TableCell>
                      <Typography variant='body2' fontWeight={600}>
                        {t.fournisseur || 'Inconnu'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t.dev_trans}
                        size='small'
                        color='primary'
                        variant='tonal'
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' fontWeight={600}>
                        {formatMontant(t.mnt_tot_fact)}
                      </Typography>
                    </TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700, color: 'success.main' }}>
                      {formatMontant(parseFloat(t.mnt_tot_fact || 0) * parseFloat(t.taux_trans || 1))} DZD
                    </TableCell>
                    <TableCell align='center'>
                      <Chip label={`${t._count?.colis_voyage || 0} lots`} variant='outlined' size='small' />
                    </TableCell>
                    <TableCell align='center'>
                      <Tooltip title='Inspecter cette facture'>
                        <IconButton color='info' onClick={() => handleOpenDetail(t)} size='small'>
                          <Icon icon='tabler:receipt-2' />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <ArticlesVoyageModal
        open={modalGlobalOpen}
        onClose={() => setModalGlobalOpen(false)}
        transactions={transactions}
      />

      <TransactionDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        transaction={selectedTransaction}
        statutVoyage={statut}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
      />

      <ConfirmDialog
        open={confirmOpen}
        handleClose={() => setConfirmOpen(false)}
        handleConfirm={executeDelete}
        title='Annuler cette facture ?'
        content={renderDeleteContent()}
        actionType='delete'
        confirmText="Oui, restituer l'argent"
        cancelText='Annuler'
      />
    </>
  )
}

export default TransactionsTable
