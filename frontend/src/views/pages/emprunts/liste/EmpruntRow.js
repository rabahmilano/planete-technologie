import { useState } from 'react'
import {
  TableRow,
  TableCell,
  IconButton,
  Collapse,
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  Chip
} from '@mui/material'
import dayjs from 'dayjs'
import Icon from 'src/@core/components/icon'

const EmpruntRow = ({ emprunt }) => {
  const [open, setOpen] = useState(false)

  const totalRembourse = emprunt.remboursements?.reduce(
    (acc, curr) => acc + parseFloat(curr.montant_remb),
    0
  ) || 0
  
  const resteAPayer = parseFloat(emprunt.montant_emprunt) - totalRembourse

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton aria-label='expand row' size='small' onClick={() => setOpen(!open)}>
            <Icon icon={open ? 'tabler:chevron-up' : 'tabler:chevron-down'} />
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontWeight: 'medium' }}>{emprunt.designation}</TableCell>
        <TableCell>{emprunt.compte?.designation_cpt || 'N/A'}</TableCell>
        <TableCell>{dayjs(emprunt.date_emprunt).format('DD MMMM YYYY')}</TableCell>
        <TableCell align='right'>
          {parseFloat(emprunt.montant_emprunt || 0).toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
        </TableCell>
        <TableCell
          align='right'
          sx={{ fontWeight: 'bold', color: resteAPayer > 0 ? 'error.main' : 'success.main' }}
        >
          {resteAPayer.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
        </TableCell>
        <TableCell align='center'>
          <Chip
            label={emprunt.statut_emprunt === 'SOLDE' ? 'SOLDÉ' : 'EN COURS'}
            color={emprunt.statut_emprunt === 'SOLDE' ? 'success' : 'warning'}
            size='small'
            sx={{ fontWeight: 'bold' }}
          />
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout='auto' unmountOnExit>
            <Box sx={{ margin: 4, padding: 4, backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 1 }}>
              <Typography variant='h6' gutterBottom component='div' sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Icon icon='tabler:receipt-refund' fontSize='1.25rem' color='primary.main' />
                Historique des remboursements
              </Typography>
              
              {emprunt.remboursements && emprunt.remboursements.length > 0 ? (
                <Table size='small' aria-label='remboursements'>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align='right'>Montant Remboursé</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {emprunt.remboursements.map((remb) => (
                      <TableRow key={remb.id_remb}>
                        <TableCell>{dayjs(remb.date_remb).format('DD MMMM YYYY')}</TableCell>
                        <TableCell align='right' sx={{ color: 'success.main', fontWeight: 'medium' }}>
                          + {parseFloat(remb.montant_remb).toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Total remboursé :</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 'bold' }}>
                        {totalRembourse.toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <Typography variant='body2' color='textSecondary' sx={{ mt: 2, fontStyle: 'italic' }}>
                  Aucun remboursement n'a encore été effectué pour cet emprunt.
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

export default EmpruntRow