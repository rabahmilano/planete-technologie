import { useState, useEffect, forwardRef } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Slide from '@mui/material/Slide'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Box from '@mui/material/Box'

import Icon from 'src/@core/components/icon'
import { useCompte } from 'src/context/CompteContext'
import { formatMontant } from 'src/@core/utils/format'
import dayjs from 'dayjs'

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction='up' ref={ref} {...props} />
})

const HistoriqueCrediterDialog = ({ open, handleClose, compte }) => {
  const { getHistoriqueCredit } = useCompte()
  const [historique, setHistorique] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && compte) {
      const fetchHistorique = async () => {
        setLoading(true)
        const data = await getHistoriqueCredit(compte.id_cpt)
        setHistorique(data)
        setLoading(false)
      }
      fetchHistorique()
    }
  }, [open, compte])

  return (
    <Dialog fullScreen open={open} onClose={handleClose} TransitionComponent={Transition}>
      <AppBar sx={{ position: 'relative' }}>
        <Toolbar>
          <IconButton edge='start' color='inherit' onClick={handleClose} aria-label='close'>
            <Icon icon='tabler:x' />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1, color: 'white' }} variant='h6' component='div'>
            Historique d'approvisionnement - {compte?.designation_cpt} ({compte?.dev_code})
          </Typography>
        </Toolbar>
      </AppBar>
      <DialogContent sx={{ p: { xs: 4, md: 8 }, backgroundColor: 'background.default' }}>
        <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: 3 }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 150px)' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date de l'opération</TableCell>
                  <TableCell align='right' sx={{ fontWeight: 'bold' }}>
                    Montant Injecté
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: 'bold' }}>
                    Taux de Change
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from(new Array(5)).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton animation='wave' />
                      </TableCell>
                      <TableCell>
                        <Skeleton animation='wave' />
                      </TableCell>
                      <TableCell>
                        <Skeleton animation='wave' />
                      </TableCell>
                    </TableRow>
                  ))
                ) : historique.length > 0 ? (
                  historique.map(row => (
                    <TableRow key={row.id_op_crd} hover>
                      <TableCell>{dayjs(row.date_op).format('DD/MM/YYYY')}</TableCell>
                      <TableCell align='right'>
                        <Typography fontWeight={600} color='success.main'>
                          + {formatMontant(row.montant_op)} {compte?.dev_code}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>{formatMontant(row.taux_change)} DZD</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} align='center' sx={{ py: 10 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Icon icon='tabler:database-off' fontSize='3rem' color='text.disabled' />
                        <Typography variant='body2' sx={{ mt: 2, color: 'text.secondary' }}>
                          Aucun historique d'approvisionnement pour ce compte.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </DialogContent>
    </Dialog>
  )
}

export default HistoriqueCrediterDialog
