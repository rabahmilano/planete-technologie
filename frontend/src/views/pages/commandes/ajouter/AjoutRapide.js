import React, { useState } from 'react'
import { Card, CardContent, Typography, Button, Box, InputAdornment, Divider } from '@mui/material'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import Icon from 'src/@core/components/icon'
import CustomAutocomplete from 'src/@core/components/mui/autocomplete'
import CustomTextField from 'src/@core/components/mui/text-field'
import CleaveInput from 'src/components/CleaveInput'
import toast from 'react-hot-toast'

const AjoutRapide = ({ options, cart, dateVente, setDateVente, onAddToCart }) => {
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')

  const getStockRestant = product => {
    if (!product) return 0
    const inCart = cart.find(item => item.id === product.id)
    return product.quantityAvailable - (inCart ? inCart.quantity : 0)
  }

  const availableOptions = options.filter(opt => getStockRestant(opt) > 0)

  const handleAdd = () => {
    if (!selectedProduct) return toast.error('Veuillez sélectionner un produit.')

    const qte = parseInt(quantity)
    const prix = parseFloat(unitPrice)

    if (isNaN(qte) || qte <= 0) return toast.error('La quantité doit être supérieure à 0.')
    if (isNaN(prix) || prix <= 0) return toast.error('Le prix unitaire doit être supérieur à 0.')

    const stockRestant = getStockRestant(selectedProduct)
    if (qte > stockRestant) return toast.error(`Stock insuffisant. Il ne reste que ${stockRestant} unité(s).`)

    onAddToCart(selectedProduct, qte, prix)

    setSelectedProduct(null)
    setQuantity('')
    setUnitPrice('')
  }

  return (
    <Card sx={{ boxShadow: 3 }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Typography variant='h6' sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Icon icon='tabler:barcode' />
          Ajout Rapide
        </Typography>

        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
          <DatePicker
            value={dateVente}
            onChange={newValue => setDateVente(newValue)}
            maxDate={dayjs().endOf('day')}
            label='Date de la commande'
            slotProps={{ textField: { fullWidth: true, variant: 'outlined' } }}
          />
        </LocalizationProvider>

        <Divider sx={{ my: 2 }} />

        <CustomAutocomplete
          fullWidth
          options={availableOptions}
          getOptionLabel={option => option.designation}
          value={selectedProduct}
          onChange={(e, newValue) => setSelectedProduct(newValue)}
          renderInput={params => <CustomTextField {...params} label='Rechercher un produit...' />}
        />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            mt: -3,
            mb: 1,
            minHeight: '20px',
            visibility: selectedProduct ? 'visible' : 'hidden'
          }}
        >
          <Typography
            variant='caption'
            sx={{
              color: getStockRestant(selectedProduct) > 0 ? 'success.main' : 'error.main',
              fontWeight: 'bold'
            }}
          >
            Stock disponible : {selectedProduct ? getStockRestant(selectedProduct) : 0}
          </Typography>
        </Box>

        <CustomTextField
          fullWidth
          label='Prix Unitaire de Vente'
          value={unitPrice}
          onChange={e => setUnitPrice(e.target.value)}
          name='unitPrice'
          InputProps={{
            inputComponent: CleaveInput,
            endAdornment: <InputAdornment position='end'>DA</InputAdornment>
          }}
        />

        <CustomTextField
          fullWidth
          type='number'
          name='no_autofill_qty_xyz'
          autoComplete='off'
          label='Quantité'
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          inputProps={{ autoComplete: 'off' }}
          error={selectedProduct && quantity > getStockRestant(selectedProduct)}
        />

        <Button
          variant='contained'
          color='primary'
          startIcon={<Icon icon='tabler:shopping-cart-plus' />}
          onClick={handleAdd}
          disabled={!selectedProduct || !quantity || !unitPrice}
          sx={{ mt: 2 }}
        >
          Ajouter au panier
        </Button>
      </CardContent>
    </Card>
  )
}

export default AjoutRapide
