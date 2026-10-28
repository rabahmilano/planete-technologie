import { useEffect, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
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

const HistoriqueAjustementsDialog = ({ open, handleClose }) => {
  const { getAjustements, annulerAjustement } = useCompte()
  const [ajustements, setAjustements] = useState([])
  const [loading, setLoading] = useState(false)
  const [cancelingId, setCancelingId] = useState(null)
  const [ajustementToCancel, setAjustementToCancel] = useState(null)

  const fetchAjustements = async () => {
    setLoading(true)
    try {
      setAjustements(await getAjustements())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) fetchAjustements()
  }, [open])

  const handleAnnuler = async () => {
    if (!ajustementToCancel || cancelingId !== null) return
    const id = ajustementToCancel.id_ajustement
    setCancelingId(id)
    try {
      if (await annulerAjustement(id)) {
        await fetchAjustements()
        setAjustementToCancel(null)
      }
    } finally {
      setCancelingId(null)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='lg' fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Icon icon='tabler:adjustments' fontSize='1.75rem' />
          <Typography variant='h5' sx={{ fontWeight: 600 }}>Historique des ajustements</Typography>
        </Box>
        <IconButton onClick={handleClose} size='small'><Icon icon='tabler:x' /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <TableContainer sx={{ maxHeight: 500 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {['Date', 'Compte', 'Type', 'Montant', 'Taux utilisé', 'Motif', 'État', 'Action'].map(label => (
                  <TableCell key={label} sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>{label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} align='center' sx={{ py: 10 }}><CircularProgress size={30} /></TableCell></TableRow>
              ) : ajustements.length ? ajustements.map(row => (
                <TableRow key={row.id_ajustement} sx={{ opacity: row.isAnnule ? 0.5 : 1 }}>
                  <TableCell>{dayjs(row.date_ajustement).format('DD/MM/YYYY')}</TableCell>
                  <TableCell>{row.compte?.designation_cpt} ({row.compte?.dev_code})</TableCell>
                  <TableCell>
                    <Typography color={row.type_ajustement === 'AUGMENTATION' ? 'success.main' : 'error.main'} fontWeight={600}>
                      {row.type_ajustement === 'AUGMENTATION' ? 'Augmentation' : 'Diminution'}
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>{formatMontant(row.montant)} {row.compte?.dev_code}</TableCell>
                  <TableCell align='right'>{formatMontant(row.taux_change)} DZD</TableCell>
                  <TableCell sx={{ maxWidth: 220, whiteSpace: 'normal' }}>{row.observation}</TableCell>
                  <TableCell>{row.isAnnule ? <Typography color='error.main' fontWeight={600}>ANNULÉ</Typography> : 'Actif'}</TableCell>
                  <TableCell align='center'>
                    {!row.isAnnule && (
                      <Tooltip title="Annuler l’ajustement">
                        <span><IconButton size='small' color='error' onClick={() => setAjustementToCancel(row)}
                          disabled={cancelingId === row.id_ajustement}>
                          {cancelingId === row.id_ajustement ? <CircularProgress size={20} color='inherit' /> : <Icon icon='tabler:arrow-back-up' />}
                        </IconButton></span>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={8} align='center' sx={{ py: 10 }}>Aucun ajustement enregistré.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <ConfirmDialog
        open={Boolean(ajustementToCancel)}
        loading={cancelingId !== null}
        loadingText='Annulation en cours…'
        handleClose={() => { if (cancelingId === null) setAjustementToCancel(null) }}
        handleConfirm={handleAnnuler}
        title='Confirmer l’annulation de l’ajustement'
        confirmText='Confirmer l’annulation'
        cancelText='Retour à l’historique'
        actionType='warning'
        content={
          <Box>
            <Typography sx={{ mb: 3 }}>Le solde et le taux moyen seront recalculés à l’inverse de l’ajustement. L’opération restera conservée dans l’historique et sera marquée comme annulée.</Typography>
            {ajustementToCancel && <Typography>
              <strong>{ajustementToCancel.compte?.designation_cpt}</strong> — {ajustementToCancel.type_ajustement === 'AUGMENTATION' ? 'Augmentation' : 'Diminution'} de {formatMontant(ajustementToCancel.montant)} {ajustementToCancel.compte?.dev_code}
            </Typography>}
          </Box>
        }
      />
    </Dialog>
  )
}

export default HistoriqueAjustementsDialog
