import { forwardRef } from 'react'
import { Dialog, AppBar, Toolbar, IconButton, Typography, Slide, Box, Button, Tooltip } from '@mui/material'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import Icon from 'src/@core/components/icon'
import TransactionDetailKpis from './TransactionDetailKpis'
import TransactionDetailTable from './TransactionDetailTable'

dayjs.locale('fr')

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction='up' ref={ref} {...props} />
})

const TransactionDetailModal = ({ open, onClose, transaction, statutVoyage, onEdit, onDelete }) => {
  if (!transaction) return null

  const dateTrans = transaction.colis_voyage?.[0]?.colis?.date_achat
    ? dayjs(transaction.colis_voyage[0].colis.date_achat).format('DD MMM YYYY')
    : 'Date inconnue'

  return (
    <Dialog fullWidth maxWidth='xl' open={open} onClose={onClose} TransitionComponent={Transition}>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '75vh', maxHeight: '90vh', overflow: 'hidden' }}>
        <AppBar sx={{ position: 'relative', backgroundColor: 'info.main', boxShadow: 3, flexShrink: 0 }}>
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Icon icon='tabler:receipt-2' color='white' fontSize='1.5rem' />
              <Box>
                <Typography variant='h6' color='white' sx={{ lineHeight: 1.2 }}>
                  {transaction.fournisseur || 'Fournisseur Inconnu'}
                </Typography>
                <Typography variant='caption' color='rgba(255,255,255,0.8)'>
                  {dateTrans} • Réf: #{transaction.id_trans}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {statutVoyage === 'EN_COURS' && (
                <>
                  <Tooltip title='Modifier cette facture'>
                    <Button
                      variant='contained'
                      color='warning'
                      size='small'
                      startIcon={<Icon icon='tabler:edit' />}
                      onClick={() => onEdit(transaction)}
                      sx={{ color: 'white' }}
                    >
                      Modifier
                    </Button>
                  </Tooltip>
                  <Tooltip title='Supprimer la transaction'>
                    <Button
                      variant='contained'
                      color='error'
                      size='small'
                      startIcon={<Icon icon='tabler:trash' />}
                      onClick={() => onDelete(transaction)}
                    >
                      Supprimer
                    </Button>
                  </Tooltip>
                </>
              )}

              <IconButton edge='end' onClick={onClose} sx={{ ml: 2, color: 'white' }}>
                <Icon icon='tabler:x' />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        <Box sx={{ flexGrow: 1, p: 6, backgroundColor: '#f8f9fa', overflowY: 'auto' }}>
          <TransactionDetailKpis transaction={transaction} />

          <Typography variant='h6' fontWeight={700} sx={{ mb: 4, color: '#1e293b' }}>
            Détail des Articles
          </Typography>

          <TransactionDetailTable articles={transaction.colis_voyage || []} />
        </Box>
      </Box>
    </Dialog>
  )
}

export default TransactionDetailModal
