import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import { formatMontant } from 'src/@core/utils/format'

const ArticlesVoyageModal = ({ open, onClose, transactions }) => {
  const allArticles =
    transactions?.flatMap(t =>
      t.colis_voyage.map(cv => ({
        ...cv,
        fournisseur: t.fournisseur,
        devise: t.dev_trans
      }))
    ) || []

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='lg'>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant='h6' sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Icon icon='tabler:packages' color='primary' />
          Détail de tous les articles du voyage
        </Typography>
        <IconButton onClick={onClose} size='small'>
          <Icon icon='tabler:x' />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <TableContainer sx={{ maxHeight: 500 }}>
          <Table stickyHeader size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Produit</TableCell>
                <TableCell>Fournisseur</TableCell>
                <TableCell align='center'>Catégorie</TableCell>
                <TableCell align='center'>Quantité</TableCell>
                <TableCell align='right'>PU Devise</TableCell>
                <TableCell align='right'>Total Devise</TableCell>
                <TableCell align='right'>Total DZD</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allArticles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 5 }}>
                    Aucun article enregistré.
                  </TableCell>
                </TableRow>
              ) : (
                allArticles.map((article, index) => (
                  <TableRow hover key={index}>
                    <TableCell>
                      <Typography variant='body2' fontWeight={600}>
                        {article.colis.produit?.designation_prd}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {article.fournisseur || 'Inconnu'}
                      </Typography>
                    </TableCell>
                    <TableCell align='center'>
                      <Chip label={article.colis.categorie?.designation_cat} size='small' variant='outlined' />
                    </TableCell>
                    <TableCell align='center'>
                      <Typography variant='body2' fontWeight={600}>
                        {article.colis.qte_achat}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2'>
                        {formatMontant(article.pu_dev_dest)} {article.devise}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' fontWeight={600}>
                        {formatMontant(article.mnt_tot_dest)} {article.devise}
                      </Typography>
                    </TableCell>
                    <TableCell align='right' sx={{ fontWeight: 600, color: 'success.main' }}>
                      {formatMontant(article.colis.mnt_tot_dzd)} DA
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
    </Dialog>
  )
}

export default ArticlesVoyageModal
