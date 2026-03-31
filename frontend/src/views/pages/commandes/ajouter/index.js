import React, { useState, useEffect } from 'react'
import { Grid, Box, Typography } from '@mui/material'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

import AjoutRapide from './AjoutRapide'
import PanierTable from './PanierTable'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import { useCommande } from 'src/context/CommandeContext'
import { formatMontant } from 'src/@core/utils/format'

dayjs.locale('fr')

const PasserCommande = () => {
  const [dateVente, setDateVente] = useState(dayjs())
  const [cart, setCart] = useState([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { produitsDisponibles, fetchProduitsDisponibles, addCommande } = useCommande()

  useEffect(() => {
    fetchProduitsDisponibles()
  }, [fetchProduitsDisponibles])

  const totalAmount = cart.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0)
  const totalUnites = cart.reduce((acc, item) => acc + parseInt(item.quantity || 0), 0)

  const handleAddToCart = (product, qte, prix) => {
    const existingItemIndex = cart.findIndex(item => item.id === product.id)

    if (existingItemIndex >= 0) {
      const currentItem = cart[existingItemIndex]
      let qteToAdd = qte

      if (currentItem.quantity + qteToAdd > product.quantityAvailable) {
        toast.error(`Stock insuffisant. Maximum disponible : ${product.quantityAvailable}.`)
        qteToAdd = product.quantityAvailable - currentItem.quantity
        if (qteToAdd <= 0) return
      }

      const newCart = cart.map(item => {
        if (item.id === product.id) {
          if (item.unitPrice !== prix) {
            const valeurAncienne = item.quantity * item.unitPrice
            const valeurNouvelle = qteToAdd * prix
            const nouvelleQteTotale = item.quantity + qteToAdd
            const pump = (valeurAncienne + valeurNouvelle) / nouvelleQteTotale

            toast('Fusion des lots : Le prix de vente a été lissé (Moyenne pondérée).', {
              icon: '⚠️',
              style: { borderRadius: '10px', background: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' },
              duration: 5000
            })

            return {
              ...item,
              quantity: nouvelleQteTotale,
              unitPrice: parseFloat(pump.toFixed(2))
            }
          } else {
            toast.success('Quantité ajoutée au panier.')
            return { ...item, quantity: item.quantity + qteToAdd }
          }
        }
        return item
      })
      setCart(newCart)
    } else {
      let initialQte = qte

      if (initialQte > product.quantityAvailable) {
        toast.error(`Stock insuffisant. Maximum disponible : ${product.quantityAvailable}.`)
        initialQte = product.quantityAvailable
        if (initialQte <= 0) return
      }

      setCart([
        ...cart,
        {
          id: product.id,
          designation: product.designation,
          quantity: initialQte,
          unitPrice: prix,
          maxStock: product.quantityAvailable
        }
      ])
    }
  }

  const handleUpdateCartItem = (id, field, value) => {
    const newCart = cart.map(item => {
      if (item.id === id) {
        let newValue = parseFloat(value)
        if (isNaN(newValue) || newValue < 0) newValue = 0

        if (field === 'quantity' && newValue > item.maxStock) {
          toast.error(`La quantité maximale pour ce produit est de ${item.maxStock}`)
          newValue = item.maxStock
        }

        return { ...item, [field]: newValue }
      }
      return item
    })
    setCart(newCart)
  }

  const handleRemoveFromCart = id => setCart(cart.filter(item => item.id !== id))

  const handleOpenConfirm = () => {
    if (cart.length === 0) return toast.error('Le panier est vide.')

    const hasError = cart.some(item => item.quantity <= 0 || item.unitPrice <= 0)
    if (hasError) return toast.error('Veuillez vérifier les quantités et les prix (doivent être > 0).')

    setConfirmOpen(true)
  }

  const handleSubmitOrder = async () => {
    const orderData = {
      dateVente: dayjs(dateVente).format('YYYY-MM-DDT12:00:00.000Z'),
      produits: cart.map(item => ({
        id_prd: item.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice
      })),
      totalAmount: totalAmount
    }

    await addCommande(orderData, () => {
      setCart([])
      setDateVente(dayjs())
      setConfirmOpen(false)
      fetchProduitsDisponibles()
    })
  }

  return (
    <Box sx={{ py: 4 }}>
      <Grid container spacing={6}>
        <Grid item xs={12} md={4}>
          <AjoutRapide
            options={produitsDisponibles}
            cart={cart}
            dateVente={dateVente}
            setDateVente={setDateVente}
            onAddToCart={handleAddToCart}
          />
        </Grid>

        <Grid item xs={12} md={8}>
          <PanierTable
            cart={cart}
            totalAmount={totalAmount}
            totalUnites={totalUnites}
            onUpdateCartItem={handleUpdateCartItem}
            onRemoveFromCart={handleRemoveFromCart}
            onValidateClick={handleOpenConfirm}
          />
        </Grid>
      </Grid>

      <ConfirmDialog
        open={confirmOpen}
        handleClose={() => setConfirmOpen(false)}
        handleConfirm={handleSubmitOrder}
        actionType='success'
        title='Valider la commande ?'
        confirmText='Oui, encaisser'
        content={
          <Typography variant='body1'>
            Êtes-vous sûr de vouloir valider cette commande de <strong>{totalUnites} article(s)</strong> pour un montant
            total de
            <strong style={{ marginLeft: 5 }}>{formatMontant(totalAmount)} DA</strong> ?
          </Typography>
        }
      />
    </Box>
  )
}

export default PasserCommande
