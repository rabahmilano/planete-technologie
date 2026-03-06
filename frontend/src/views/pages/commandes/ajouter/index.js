import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Grid, Box, Typography } from '@mui/material'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

import AjoutRapide from './AjoutRapide'
import PanierTable from './PanierTable'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'

dayjs.locale('fr')

const PasserCommande = () => {
  const [dateVente, setDateVente] = useState(dayjs())
  const [options, setOptions] = useState([]) 
  const [cart, setCart] = useState([]) 
  const [handleGetProducts, setHandleGetProducts] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/allMarchandiseDisponible`)
        const productsFromAPI = response.data.map(product => ({
          id: product.id_prd,
          designation: product.designation_prd,
          quantityAvailable: product.qte_dispo
        }))
        setOptions(productsFromAPI)
      } catch (error) {
        toast.error('Erreur lors de la récupération des produits.')
      }
    }
    fetchProducts()
  }, [handleGetProducts])

  const totalAmount = cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0)
  const totalUnites = cart.reduce((acc, item) => acc + parseInt(item.quantity || 0), 0)

  // =====================================================================
  // AJOUT AU PANIER AVEC CALCUL DU PRIX UNITAIRE MOYEN PONDÉRÉ (PUMP)
  // =====================================================================
  const handleAddToCart = (product, qte, prix) => {
    const existingItemIndex = cart.findIndex(item => item.id === product.id)
    const newCart = [...cart]

    if (existingItemIndex >= 0) {
      const existingItem = newCart[existingItemIndex]

      // Si le prix est différent de celui déjà dans le panier
      if (existingItem.unitPrice !== prix) {
        // 1. On calcule la valeur totale ancienne et la nouvelle
        const valeurAncienne = existingItem.quantity * existingItem.unitPrice
        const valeurNouvelle = qte * prix
        
        // 2. On calcule la nouvelle quantité totale
        const nouvelleQteTotale = existingItem.quantity + qte
        
        // 3. On calcule le PUMP (Prix moyen lissé)
        const pump = (valeurAncienne + valeurNouvelle) / nouvelleQteTotale

        // 4. On met à jour la ligne
        existingItem.quantity = nouvelleQteTotale
        existingItem.unitPrice = parseFloat(pump.toFixed(2)) // Arrondi propre

        // 5. On avertit l'utilisateur visuellement
        toast('Fusion avec un prix différent ! Le prix a été lissé (Moyenne pondérée).', {
          icon: '⚠️',
          style: {
            borderRadius: '10px',
            background: '#fff3cd',
            color: '#856404',
            border: '1px solid #ffeeba'
          },
          duration: 5000
        });
      } else {
        // Si le prix est le même, on additionne juste
        existingItem.quantity += qte
        toast.success("Quantité ajoutée avec succès.")
      }
    } else {
      // S'il n'existe pas, on l'ajoute normalement
      newCart.push({
        id: product.id,
        designation: product.designation,
        quantity: qte,
        unitPrice: prix,
        maxStock: product.quantityAvailable
      })
    }
    setCart(newCart)
  }

  // MISE À JOUR INLINE (On utilise à nouveau item.id)
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

  const handleRemoveFromCart = (id) => setCart(cart.filter(item => item.id !== id))

  const handleOpenConfirm = () => {
    if (cart.length === 0) return toast.error("Le panier est vide.")
    const hasError = cart.some(item => item.quantity <= 0 || item.unitPrice <= 0)
    if (hasError) return toast.error("Veuillez vérifier les quantités et les prix (doivent être > 0).")
    
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

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}commandes/createCommande`, orderData)
      if (response.status === 200) {
        toast.success(response.data.message)
        setCart([])
        setDateVente(dayjs())
        setConfirmOpen(false) 
        setHandleGetProducts(prev => !prev) 
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Erreur lors de l'envoi de la commande.")
      setConfirmOpen(false)
    }
  }

  return (
    <Box sx={{ py: 4 }}>
      <Grid container spacing={6}>
        <Grid item xs={12} md={4}>
          <AjoutRapide 
            options={options} 
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
        actionType="success"
        title="Valider la commande ?"
        confirmText="Oui, encaisser"
        content={
          <Typography variant='body1'>
            Êtes-vous sûr de vouloir valider cette commande de <strong>{totalUnites} article(s)</strong> pour un montant total de 
            <strong style={{ marginLeft: 5 }}>{totalAmount.toLocaleString('fr-DZ')} DZD</strong> ?
          </Typography>
        }
      />
    </Box>
  )
}

export default PasserCommande