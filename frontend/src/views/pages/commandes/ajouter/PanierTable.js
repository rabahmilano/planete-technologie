import React from 'react'
import { Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box, IconButton, Button } from '@mui/material'
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'

const PanierTable = ({ cart, totalAmount, totalUnites, onUpdateCartItem, onRemoveFromCart, onValidateClick }) => {
  return (
    <Card sx={{ boxShadow: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TableContainer component={Paper} sx={{ flexGrow: 1, boxShadow: 'none' }}>
        <Table sx={{ minWidth: 600 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
              <TableCell sx={{ color: 'white' }}>Désignation</TableCell>
              <TableCell sx={{ color: 'white' }} align='center' width="20%">Prix Unitaire</TableCell>
              <TableCell sx={{ color: 'white' }} align='center' width="15%">Qté</TableCell>
              <TableCell sx={{ color: 'white' }} align='right' width="20%">Total Ligne</TableCell>
              <TableCell sx={{ color: 'white' }} align='center' width="10%">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cart.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align='center' sx={{ py: 10 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5 }}>
                    <Icon icon='tabler:shopping-cart' fontSize={60} />
                    <Typography sx={{ mt: 2 }}>Le panier est vide</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              cart.map((item) => (
                <TableRow key={item.id} hover> {/* Clé rebasculée sur item.id */}
                  <TableCell sx={{ fontWeight: 'medium' }}>
                    {item.designation}
                    <Typography variant="caption" display="block" color="textSecondary">
                      Stock max: {item.maxStock}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align='center'>
                    <CustomTextField
                      type="number"
                      size="small"
                      value={item.unitPrice === 0 ? '' : item.unitPrice}
                      onChange={(e) => onUpdateCartItem(item.id, 'unitPrice', e.target.value)}
                      inputProps={{ min: 0 }} 
                      sx={{ width: '100px' }}
                    />
                  </TableCell>

                  <TableCell align='center'>
                    <CustomTextField
                      type="number"
                      size="small"
                      value={item.quantity === 0 ? '' : item.quantity}
                      onChange={(e) => onUpdateCartItem(item.id, 'quantity', e.target.value)}
                      inputProps={{ min: 1, max: item.maxStock }} 
                      sx={{ width: '80px' }}
                    />
                  </TableCell>

                  <TableCell align='right' sx={{ fontWeight: 'bold' }}>
                    {(item.quantity * item.unitPrice).toLocaleString('fr-DZ')} DZD
                  </TableCell>

                  <TableCell align='center'>
                    <IconButton size="small" color="error" onClick={() => onRemoveFromCart(item.id)}>
                      <Icon icon='tabler:trash' />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ p: 5, borderTop: '1px solid rgba(0, 0, 0, 0.12)', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant='body1' color='textSecondary' sx={{ mb: 1 }}>
            Total à encaisser : 
            <Typography component="span" variant="caption" sx={{ ml: 2, p: 1, backgroundColor: '#e9ecef', borderRadius: 1 }}>
              ({totalUnites} article{totalUnites > 1 ? 's' : ''})
            </Typography>
          </Typography>
          
          <Typography variant='h4' sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {totalAmount.toLocaleString('fr-DZ')} DZD
          </Typography>
        </Box>
        
        <Button 
          variant='contained' 
          color='success' 
          size="large"
          startIcon={<Icon icon='tabler:check' />}
          onClick={onValidateClick}
          disabled={cart.length === 0}
          sx={{ px: 8, py: 3, fontWeight: 'bold', fontSize: '1.1rem' }}
        >
          Valider
        </Button>
      </Box>
    </Card>
  )
}

export default PanierTable