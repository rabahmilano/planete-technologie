import React from 'react'
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  IconButton,
  Button,
  Grid,
  useTheme,
  useMediaQuery
} from '@mui/material'
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import CleaveInput from 'src/components/CleaveInput'
import { formatMontant } from 'src/@core/utils/format'

const PanierTable = ({ cart, totalAmount, totalUnites, onUpdateCartItem, onRemoveFromCart, onValidateClick }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const renderDesktopView = () => (
    <TableContainer component={Paper} sx={{ flexGrow: 1, boxShadow: 'none' }}>
      <Table sx={{ minWidth: 600 }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
            <TableCell sx={{ color: 'white' }}>Désignation</TableCell>
            <TableCell sx={{ color: 'white' }} align='center' width='20%'>
              Prix Unitaire
            </TableCell>
            <TableCell sx={{ color: 'white' }} align='center' width='15%'>
              Qté
            </TableCell>
            <TableCell sx={{ color: 'white' }} align='right' width='20%'>
              Total Ligne
            </TableCell>
            <TableCell sx={{ color: 'white' }} align='center' width='10%'>
              Actions
            </TableCell>
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
            cart.map(item => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ fontWeight: 'medium' }}>
                  {item.designation}
                  <Typography variant='caption' display='block' color='textSecondary'>
                    Stock max: {item.maxStock}
                  </Typography>
                </TableCell>

                <TableCell align='center'>
                  <CustomTextField
                    fullWidth
                    size='small'
                    value={item.unitPrice === 0 ? '' : item.unitPrice}
                    onChange={e => onUpdateCartItem(item.id, 'unitPrice', e.target.value)}
                    name={`price-${item.id}`}
                    InputProps={{ inputComponent: CleaveInput }}
                    sx={{ width: '100px' }}
                  />
                </TableCell>

                <TableCell align='center'>
                  <CustomTextField
                    type='number'
                    size='small'
                    value={item.quantity}
                    onChange={e => {
                      const val = parseInt(e.target.value)
                      onUpdateCartItem(item.id, 'quantity', isNaN(val) || val < 1 ? 1 : val)
                    }}
                    inputProps={{ min: 1, max: item.maxStock, step: 1 }}
                    sx={{
                      width: '80px',
                      '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                        display: 'block',
                        opacity: 1
                      }
                    }}
                  />
                </TableCell>

                <TableCell align='right' sx={{ fontWeight: 'bold' }}>
                  {formatMontant(item.quantity * item.unitPrice)} DA
                </TableCell>

                <TableCell align='center'>
                  <IconButton size='small' color='error' onClick={() => onRemoveFromCart(item.id)}>
                    <Icon icon='tabler:trash' />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )

  const renderMobileView = () => (
    <Box sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {cart.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5, py: 10 }}>
          <Icon icon='tabler:shopping-cart' fontSize={50} />
          <Typography sx={{ mt: 2 }}>Le panier est vide</Typography>
        </Box>
      ) : (
        cart.map(item => (
          <Box
            key={item.id}
            sx={{
              p: 4,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              backgroundColor: 'background.paper',
              boxShadow: 1
            }}
          >
            <Grid container alignItems='center' justifyContent='space-between' sx={{ mb: 3 }}>
              <Grid item xs={10}>
                <Typography variant='subtitle1' sx={{ fontWeight: 'bold' }}>
                  {item.designation}
                </Typography>
                <Typography variant='caption' color='textSecondary'>
                  Stock physique max: {item.maxStock}
                </Typography>
              </Grid>
              <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <IconButton size='small' color='error' onClick={() => onRemoveFromCart(item.id)} sx={{ mt: -2 }}>
                  <Icon icon='tabler:trash' />
                </IconButton>
              </Grid>
            </Grid>

            <Grid container spacing={4} sx={{ mb: 3 }}>
              <Grid item xs={7}>
                <CustomTextField
                  fullWidth
                  label='Prix Unitaire (DA)'
                  size='small'
                  value={item.unitPrice === 0 ? '' : item.unitPrice}
                  onChange={e => onUpdateCartItem(item.id, 'unitPrice', e.target.value)}
                  name={`price-mob-${item.id}`}
                  InputProps={{ inputComponent: CleaveInput }}
                />
              </Grid>
              <Grid item xs={5}>
                <CustomTextField
                  fullWidth
                  label='Qté'
                  type='number'
                  size='small'
                  value={item.quantity}
                  onChange={e => {
                    const val = parseInt(e.target.value)
                    onUpdateCartItem(item.id, 'quantity', isNaN(val) || val < 1 ? 1 : val)
                  }}
                  inputProps={{ min: 1, max: item.maxStock, step: 1 }}
                  sx={{
                    '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                      display: 'block',
                      opacity: 1
                    }
                  }}
                />
              </Grid>
            </Grid>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                borderTop: '1px solid',
                borderColor: 'divider',
                pt: 2
              }}
            >
              <Typography variant='body2' sx={{ mr: 2, color: 'textSecondary' }}>
                Total ligne :
              </Typography>
              <Typography variant='h6' sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {formatMontant(item.quantity * item.unitPrice)} DA
              </Typography>
            </Box>
          </Box>
        ))
      )}
    </Box>
  )

  return (
    <Card sx={{ boxShadow: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {isMobile ? renderMobileView() : renderDesktopView()}

      <Box
        sx={{
          p: 5,
          borderTop: '1px solid rgba(0, 0, 0, 0.12)',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? 4 : 0
        }}
      >
        <Box sx={{ textAlign: isMobile ? 'center' : 'left' }}>
          <Typography
            variant='body1'
            color='textSecondary'
            sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start' }}
          >
            Total à encaisser :
            <Typography
              component='span'
              variant='caption'
              sx={{ ml: 2, p: 1, backgroundColor: '#e9ecef', borderRadius: 1, fontWeight: 'medium' }}
            >
              ({totalUnites} article{totalUnites > 1 ? 's' : ''})
            </Typography>
          </Typography>
          <Typography variant='h4' sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {formatMontant(totalAmount)} DA
          </Typography>
        </Box>

        <Button
          variant='contained'
          color='success'
          size='large'
          startIcon={<Icon icon='tabler:check' />}
          onClick={onValidateClick}
          disabled={cart.length === 0}
          sx={{
            px: isMobile ? 4 : 8,
            py: 3,
            fontWeight: 'bold',
            fontSize: '1.1rem',
            width: isMobile ? '100%' : 'auto'
          }}
        >
          Valider
        </Button>
      </Box>
    </Card>
  )
}

export default PanierTable
