import React from 'react'
import {
  Card,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  LinearProgress,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Avatar
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import { formatMontant } from 'src/@core/utils/format'
import { useProduitEcommerce } from 'src/context/ProduitEcommerceContext'

const couleursStatuts = { BROUILLON: 'warning', PUBLIE: 'success', ARCHIVE: 'default' }

const ProduitRow = ({ produit, onOuvrirDialog }) => (
  <TableRow hover>
    <TableCell>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {produit.images?.[0] ? (
          <Avatar src={produit.images[0].url_image} variant='rounded' sx={{ width: 42, height: 42 }} />
        ) : (
          <Avatar variant='rounded' sx={{ width: 42, height: 42 }}>
            <Icon icon='tabler:photo-off' />
          </Avatar>
        )}
        <Box>
          <Typography sx={{ fontWeight: 600 }}>{produit.designation_prd}</Typography>
          <Typography variant='caption' color='textSecondary'>
            #{produit.id_prd} · {produit.slug_prd || 'sans slug'}
          </Typography>
        </Box>
      </Box>
    </TableCell>
    <TableCell>{produit.famille?.nom_famille || '—'}</TableCell>
    <TableCell>
      <Chip size='small' label={produit.statut_publication} color={couleursStatuts[produit.statut_publication] || 'default'} />
    </TableCell>
    <TableCell align='right'>
      {produit.promo_active ? (
        <Box>
          <Typography variant='body2' sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
            {formatMontant(produit.prix_vente)} DA
          </Typography>
          <Typography sx={{ fontWeight: 700, color: 'error.main' }}>
            {formatMontant(produit.prix_promo)} DA
          </Typography>
        </Box>
      ) : (
        <Typography sx={{ fontWeight: produit.prix_vente ? 600 : 400, color: produit.prix_vente ? 'inherit' : 'text.secondary' }}>
          {produit.prix_vente ? `${formatMontant(produit.prix_vente)} DA` : 'Prix non défini'}
        </Typography>
      )}
    </TableCell>
    <TableCell align='center'>
      <Typography>{produit.qte_dispo}</Typography>
      {produit.qte_reservee > 0 && (
        <Typography variant='caption' color='warning.main'>
          dont {produit.qte_reservee} réservé(s)
        </Typography>
      )}
    </TableCell>
    <TableCell align='center'>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
        <Tooltip title='Fiche produit (description, famille, statut)'>
          <IconButton size='small' onClick={() => onOuvrirDialog(produit, 'info')}>
            <Icon icon='tabler:edit' fontSize='1.1rem' />
          </IconButton>
        </Tooltip>
        <Tooltip title='Prix & promotion'>
          <IconButton size='small' color='primary' onClick={() => onOuvrirDialog(produit, 'prix')}>
            <Icon icon='tabler:tag' fontSize='1.1rem' />
          </IconButton>
        </Tooltip>
        <Tooltip title='Images'>
          <IconButton size='small' color='secondary' onClick={() => onOuvrirDialog(produit, 'images')}>
            <Icon icon='tabler:photo' fontSize='1.1rem' />
          </IconButton>
        </Tooltip>
        <Tooltip title='Paliers de prix'>
          <IconButton size='small' color='info' onClick={() => onOuvrirDialog(produit, 'paliers')}>
            <Icon icon='tabler:stairs' fontSize='1.1rem' />
          </IconButton>
        </Tooltip>
        <Tooltip title='Historique des prix de vente'>
          <IconButton size='small' onClick={() => onOuvrirDialog(produit, 'historique')}>
            <Icon icon='tabler:history' fontSize='1.1rem' />
          </IconButton>
        </Tooltip>
      </Box>
    </TableCell>
  </TableRow>
)

const ProduitsTable = ({ page, setPage, limit, onOuvrirDialog }) => {
  const { produits, total, loading } = useProduitEcommerce()

  const handleChangePage = (event, nouvellePage) => setPage(nouvellePage + 1)

  return (
    <Card variant='outlined' sx={{ m: 4, mt: 5, boxShadow: 'none' }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, width: '100%', zIndex: 1 }} />}
      <TableContainer>
        <Table sx={{ minWidth: 750 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
              <TableCell sx={{ color: 'white' }}>Produit</TableCell>
              <TableCell sx={{ color: 'white' }}>Famille</TableCell>
              <TableCell sx={{ color: 'white' }}>Publication</TableCell>
              <TableCell sx={{ color: 'white' }} align='right'>
                Prix
              </TableCell>
              <TableCell sx={{ color: 'white' }} align='center'>
                Stock
              </TableCell>
              <TableCell sx={{ color: 'white' }} align='center'>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {produits.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={6} align='center'>
                  <Typography sx={{ p: 4 }}>Aucun produit trouvé.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              produits.map(produit => (
                <ProduitRow key={produit.id_prd} produit={produit} onOuvrirDialog={onOuvrirDialog} />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[limit]}
        component='div'
        count={total}
        rowsPerPage={limit}
        page={page - 1}
        onPageChange={handleChangePage}
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`}
      />
    </Card>
  )
}

export default ProduitsTable
