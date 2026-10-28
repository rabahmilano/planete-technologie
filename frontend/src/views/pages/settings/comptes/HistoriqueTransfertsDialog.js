import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'

import Icon from 'src/@core/components/icon'
import { useCompte } from 'src/context/CompteContext'
import { formatMontant } from 'src/@core/utils/format'
import dayjs from 'dayjs'

const HistoriqueTransfertsDialog = ({ open, handleClose }) => {
  const { getTransferts, annulerTransfert } = useCompte()
  const [transferts, setTransferts] = useState([])
  const [loading, setLoading] = useState(false)
  const [cancelingId, setCancelingId] = useState(null)
  const [transfertToCancel, setTransfertToCancel] = useState(null)

  const fetchTransferts = async () => {
    setLoading(true)
    const data = await getTransferts()
    setTransferts(data)
    setLoading(false)
  }

  useEffect(() => {
    if (open) {
      fetchTransferts()
    }
  }, [open])

  const handleAnnuler = async () => {
    if (!transfertToCancel || cancelingId !== null) return

    const id = transfertToCancel.id_transfert
    setCancelingId(id)
    try {
      const success = await annulerTransfert(id)
      if (success) {
        await fetchTransferts()
        setTransfertToCancel(null)
      }
    } finally {
      setCancelingId(null)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='lg' fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Icon icon='tabler:arrows-transfer-down' fontSize='1.75rem' color='text.primary' />
          <Typography variant='h5' sx={{ fontWeight: 600 }}>
            Historique des Transferts
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size='small'>
          <Icon icon='tabler:x' />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <TableContainer sx={{ maxHeight: 500 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Source</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Destination</TableCell>
                <TableCell align='right' sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>
                  Débit
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>
                  Crédit
                </TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>Observation</TableCell>
                <TableCell align='center' sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 10 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : transferts.length > 0 ? (
                transferts.map(row => (
                  <TableRow
                    key={row.id_transfert}
                    hover={!row.isAnnule}
                    sx={{
                      opacity: row.isAnnule ? 0.5 : 1,
                      backgroundColor: row.isAnnule ? 'rgba(0,0,0,0.03)' : 'inherit',
                      '& td': {
                        textDecoration: row.isAnnule ? 'line-through' : 'none',
                        color: row.isAnnule ? 'text.disabled' : 'inherit'
                      }
                    }}
                  >
                    <TableCell>
                      <Typography variant='body2' sx={{ fontWeight: 500 }}>
                        {dayjs(row.date_transfert).format('DD/MM/YYYY')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' sx={{ fontWeight: 600, color: 'error.main' }}>
                        {row.compte_source?.designation_cpt}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' sx={{ fontWeight: 600, color: 'success.main' }}>
                        {row.compte_dest?.designation_cpt}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body1' sx={{ fontWeight: 700 }}>
                        {formatMontant(row.montant)}{' '}
                        <Typography component='span' variant='caption'>
                          {row.compte_source?.dev_code}
                        </Typography>
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body1' sx={{ fontWeight: 700 }}>
                        {formatMontant(row.montant_dest ?? row.montant)}{' '}
                        <Typography component='span' variant='caption'>
                          {row.compte_dest?.dev_code}
                        </Typography>
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant='body2'
                        sx={{
                          color: 'text.secondary',
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {row.observation || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align='center' sx={{ textDecoration: 'none !important' }}>
                      {row.isAnnule ? (
                        <Typography variant='caption' fontWeight='bold' color='error' sx={{ textDecoration: 'none' }}>
                          ANNULÉ
                        </Typography>
                      ) : (
                        <Tooltip title='Annuler le transfert'>
                          <span>
                            <IconButton
                              size='small'
                              color='error'
                              onClick={() => setTransfertToCancel(row)}
                              disabled={cancelingId === row.id_transfert}
                              title='Annuler le transfert'
                            >
                              {cancelingId === row.id_transfert ? (
                                <CircularProgress size={20} color='inherit' />
                              ) : (
                                <Icon icon='tabler:trash' />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 10 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Aucun transfert enregistré.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <ConfirmDialog
        open={Boolean(transfertToCancel)}
        loading={cancelingId !== null}
        loadingText='Annulation en cours…'
        handleClose={() => {
          if (cancelingId === null) setTransfertToCancel(null)
        }}
        handleConfirm={handleAnnuler}
        title='Confirmer l’annulation du transfert'
        confirmText='Confirmer l’annulation'
        cancelText='Retour à l’historique'
        actionType='warning'
        content={
          <Box>
            <Typography sx={{ mb: 3 }}>
              Cette opération restaurera le montant débité sur le compte source et retirera le montant crédité du compte destination. Elle ne peut être annulée qu’une seule fois.
            </Typography>
            {transfertToCancel && (
              <Box sx={{ p: 4, borderRadius: 1, border: '1px dashed', borderColor: 'warning.main', backgroundColor: 'action.hover' }}>
                <Typography variant='body2' sx={{ mb: 1 }}>
                  <strong>Source :</strong> {transfertToCancel.compte_source?.designation_cpt} — {formatMontant(transfertToCancel.montant)} {transfertToCancel.compte_source?.dev_code}
                </Typography>
                <Typography variant='body2' sx={{ mb: 1 }}>
                  <strong>Destination :</strong> {transfertToCancel.compte_dest?.designation_cpt} — {formatMontant(transfertToCancel.montant_dest ?? transfertToCancel.montant)} {transfertToCancel.compte_dest?.dev_code}
                </Typography>
                <Typography variant='body2'>
                  <strong>Date :</strong> {dayjs(transfertToCancel.date_transfert).format('DD/MM/YYYY')}
                </Typography>
              </Box>
            )}
          </Box>
        }
      />
    </Dialog>
  )
}

export default HistoriqueTransfertsDialog
