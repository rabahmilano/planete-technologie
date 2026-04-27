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

import Icon from 'src/@core/components/icon'
import { useCompte } from 'src/context/CompteContext'
import { formatMontant } from 'src/@core/utils/format'
import dayjs from 'dayjs'

const HistoriqueTransfertsDialog = ({ open, handleClose }) => {
  const { getTransferts, annulerTransfert } = useCompte()
  const [transferts, setTransferts] = useState([])
  const [loading, setLoading] = useState(false)
  const [cancelingId, setCancelingId] = useState(null)

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

  const handleAnnuler = async id => {
    if (!window.confirm('Voulez-vous vraiment annuler ce transfert ? Les soldes seront recalculés.')) return

    setCancelingId(id)
    const success = await annulerTransfert(id)
    if (success) {
      await fetchTransferts()
    }
    setCancelingId(null)
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
                  Montant
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
                  <TableCell colSpan={6} align='center' sx={{ py: 10 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : transferts.length > 0 ? (
                transferts.map(row => (
                  <TableRow key={row.id_transfert} hover>
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
                    <TableCell align='center'>
                      <Tooltip title='Annuler le transfert'>
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => handleAnnuler(row.id_transfert)}
                          disabled={cancelingId === row.id_transfert}
                        >
                          {cancelingId === row.id_transfert ? (
                            <CircularProgress size={20} color='inherit' />
                          ) : (
                            <Icon icon='tabler:trash' />
                          )}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align='center' sx={{ py: 10 }}>
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
    </Dialog>
  )
}

export default HistoriqueTransfertsDialog
