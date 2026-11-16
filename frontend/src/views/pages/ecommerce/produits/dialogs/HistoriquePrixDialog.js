import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  LinearProgress,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material'
import dayjs from 'dayjs'
import Icon from 'src/@core/components/icon'
import { formatMontant } from 'src/@core/utils/format'
import { useProduitEcommerce } from 'src/context/ProduitEcommerceContext'

const HistoriquePrixDialog = ({ open, produit, onClose }) => {
  const { fetchHistoriquePrix } = useProduitEcommerce()

  const [historique, setHistorique] = useState([])
  const [chargement, setChargement] = useState(false)

  const chargerHistorique = useCallback(async () => {
    if (!produit) return
    setChargement(true)
    const donnees = await fetchHistoriquePrix(produit.id_prd)
    setHistorique(donnees)
    setChargement(false)
  }, [produit, fetchHistoriquePrix])

  useEffect(() => {
    if (open) chargerHistorique()
  }, [open, chargerHistorique])

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Icon icon='tabler:history' />
        Historique des prix — {produit?.designation_prd}
      </DialogTitle>

      <DialogContent dividers>
        {chargement && <LinearProgress sx={{ mb: 3 }} />}

        {historique.length === 0 && !chargement ? (
          <Typography sx={{ py: 3, textAlign: 'center' }} color='textSecondary'>
            Aucun changement de prix enregistré pour ce produit.
          </Typography>
        ) : (
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Du</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Au</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align='right'>
                    Ancien prix
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align='right'>
                    Nouveau prix
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historique.map(entree => (
                  <TableRow key={entree.id_historique} hover>
                    <TableCell>{dayjs(entree.date_debut).format('DD/MM/YYYY HH:mm')}</TableCell>
                    <TableCell>
                      {entree.date_fin ? dayjs(entree.date_fin).format('DD/MM/YYYY HH:mm') : 'En cours'}
                    </TableCell>
                    <TableCell align='right'>{formatMontant(entree.ancien_prix)} DA</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 600 }}>
                      {formatMontant(entree.nouveau_prix)} DA
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={onClose}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default HistoriquePrixDialog
