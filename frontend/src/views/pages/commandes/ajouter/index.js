import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  CardContent,
  IconButton
} from '@mui/material'

import CustomAutocomplete from 'src/@core/components/mui/autocomplete'
import CustomTextField from 'src/@core/components/mui/text-field'
import toast from 'react-hot-toast'
import { useForm, Controller } from 'react-hook-form'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import Icon from 'src/@core/components/icon'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)
dayjs.locale('fr')

const defaultValues = {
  designationProduit: '',
  cat: '',
  mntTotDev: '',
  cpt: '',
  qte: '',
  dateVente: dayjs().utc(true).startOf('day')
  // dateVente: dayjs('2024-10-01').utc(true).startOf('day')
}

const PasserCommande = () => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues
  } = useForm({ defaultValues })

  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [products, setProducts] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [totalAmount, setTotalAmount] = useState(0)
  const [options, setOptions] = useState([])

  const [handleGetProducts, setHandleGetProducts] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/allMarchandiseDisponible`)
        const productsFromAPI = response.data.map(product => ({
          id: product.id_prd,
          designation: product.designation_prd,
          quantityAvailable: product.qte_dispo,
          unitPrice: 0 // Si l'API ne fournit pas le prix unitaire, vous devrez gérer cela différemment
        }))
        setOptions(productsFromAPI)
      } catch (error) {
        toast.error('Erreur lors de la récupération des produits.')
      }
    }

    fetchProducts()
  }, [handleGetProducts])

  const handleDialogOpen = () => {
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setSelectedProduct(null)
    setQuantity('')
    setUnitPrice('')
  }

  const handleProductChange = (event, newValue) => {
    setSelectedProduct(newValue)
  }

  const handleQuantityChange = event => {
    setQuantity(event.target.value)
  }

  const handleAddProduct = () => {
    if (selectedProduct && quantity > 0 && quantity <= selectedProduct.quantityAvailable) {
      const existingProductIndex = products.findIndex(p => p.id === selectedProduct.id)
      let newProducts = [...products]
      let newTotalAmount = totalAmount

      if (existingProductIndex >= 0) {
        newProducts[existingProductIndex].quantity += parseInt(quantity)
        newProducts[existingProductIndex].totalPrice =
          newProducts[existingProductIndex].quantity * parseFloat(unitPrice)
      } else {
        newProducts.push({
          id: selectedProduct.id,
          designation: selectedProduct.designation,
          unitPrice: parseFloat(unitPrice),
          quantity: parseInt(quantity),
          totalPrice: parseFloat(unitPrice) * parseInt(quantity)
        })
      }

      newTotalAmount += parseFloat(unitPrice) * parseInt(quantity)

      setProducts(newProducts)
      setTotalAmount(newTotalAmount)

      const updatedOptions = options.map(product => {
        if (product.id === selectedProduct.id) {
          return { ...product, quantityAvailable: product.quantityAvailable - parseInt(quantity) }
        }
        return product
      })

      setOptions(updatedOptions)

      handleDialogClose()
    } else {
      toast.error('La quantité doit être supérieure à 0 et ne pas dépasser la quantité disponible.')
    }
  }

  const handleSubmitOrder = async () => {
    // Préparer les données à envoyer
    const orderData = {
      dateVente: dayjs(getValues('dateVente')).toISOString(),
      produits: products.map(product => ({
        id_prd: product.id,
        quantity: product.quantity,
        unitPrice: product.unitPrice,
        totalPrice: product.totalPrice
      })),
      totalAmount: totalAmount
    }

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}commandes/createCommande`, orderData)
      if (response.status === 200) {
        const { message } = response.data
        toast.success(message)
        // Réinitialiser l'état après le succès de la commande
        setProducts([])
        setTotalAmount(0)
        setHandleGetProducts(prevState => !prevState)
      } else {
        toast.error("Erreur lors de l'ajout de la commande.")
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi de la commande:", error)
      toast.error("Erreur lors de l'envoi de la commande.")
    }
  }

  return (
    <CardContent>
      <Grid container spacing={5}>
        <Grid item xs={12} sm={3}>
          <IconButton
            size='large'
            onClick={handleDialogOpen}
            color='info'
            sx={{
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': {
                  transform: 'scale(1.5)'
                },
                '50%': {
                  transform: 'scale(1.1)'
                },
                '100%': {
                  transform: 'scale(1.5)'
                }
              }
            }}
          >
            <Icon icon='tabler:shopping-cart-plus' />
          </IconButton>
        </Grid>

        <Grid item xs={12} sm={9}>
          <Controller
            name='dateVente'
            control={control}
            rules={{ required: 'Ce champ est obligatoire' }}
            render={({ field, fieldState: { error } }) => (
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                <DatePicker
                  {...field}
                  maxDate={dayjs()}
                  label='Date de vente'
                  slotProps={{
                    textField: {
                      variant: 'outlined',
                      error: !!error,
                      helperText: error && 'Ce champ est obligatoire'
                    }
                  }}
                />
              </LocalizationProvider>
            )}
          />
        </Grid>

        <Grid item xs={12} sx={{ mt: 5 }}>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
                  <TableCell align='center' colSpan={3} sx={{ color: 'white' }}>
                    Désignation
                  </TableCell>
                  <TableCell align='center' sx={{ color: 'white' }}>
                    Prix Unitaire
                  </TableCell>
                  <TableCell align='center' sx={{ color: 'white' }}>
                    Quantité
                  </TableCell>
                  <TableCell align='right' sx={{ color: 'white' }}>
                    Total
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>Aucun produit n'est selectionné</TableCell>
                  </TableRow>
                ) : (
                  products.map((product, index) => (
                    <TableRow key={product.id}>
                      <TableCell colSpan={3}>{product.designation}</TableCell>
                      <TableCell align='right'>{product.unitPrice} DA</TableCell>
                      <TableCell align='right'>{product.quantity}</TableCell>
                      <TableCell align='right'>{product.totalPrice} DA</TableCell>
                    </TableRow>
                  ))
                )}

                <TableRow>
                  <TableCell colSpan={3} />
                  <TableCell colSpan={2} align='right'>
                    Montant Total:{' '}
                  </TableCell>
                  <TableCell align='right'>{totalAmount} DA</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid item xs={12}>
          <Button type='button' variant='contained' onClick={handleSubmitOrder}>
            Ajouter
          </Button>
        </Grid>

        <Dialog open={dialogOpen} onClose={handleDialogClose}>
          <DialogTitle>Ajouter un produit</DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <CustomAutocomplete
                  fullWidth
                  options={options}
                  getOptionLabel={option => option.designation}
                  onChange={handleProductChange}
                  renderInput={params => <CustomTextField {...params} label='Produit' />}
                />
              </Grid>
              <Grid item xs={12}>
                <CustomTextField
                  fullWidth
                  type='number'
                  label='Prix Unitaire'
                  value={unitPrice}
                  onChange={event => setUnitPrice(event.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <CustomTextField
                  fullWidth
                  type='number'
                  label='Quantité'
                  value={quantity}
                  onChange={handleQuantityChange}
                  error={quantity > selectedProduct?.quantityAvailable}
                  helperText={
                    quantity > selectedProduct?.quantityAvailable && 'Quantité supérieure à la quantité disponible'
                  }
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleAddProduct} color='primary'>
              Ajouter
            </Button>
            <Button onClick={handleDialogClose} color='secondary'>
              Annuler
            </Button>
          </DialogActions>
        </Dialog>
      </Grid>
    </CardContent>
  )
}

export default PasserCommande
