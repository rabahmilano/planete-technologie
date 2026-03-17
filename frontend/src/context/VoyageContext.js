import { createContext, useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

// Création du contexte
export const VoyageContext = createContext()

export const VoyageProvider = ({ children }) => {
  // ==========================================
  // STATES (États globaux)
  // ==========================================
  const [voyages, setVoyages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // URL de base de notre nouvelle API
  const API_URL = `${process.env.NEXT_PUBLIC_BASE_URL}voyages` // Adapte le port si nécessaire

  // ==========================================
  // FONCTIONS DE LECTURE (GET)
  // ==========================================

  // Récupérer tous les voyages
  const fetchVoyages = async () => {
    setLoading(true)
    try {
      const response = await axios.get(API_URL)
      setVoyages(response.data)
      setError(null)
    } catch (err) {
      console.error('Erreur fetchVoyages:', err)
      setError(err.response?.data?.message || 'Erreur lors du chargement des voyages')
      toast.error('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  // Récupérer un voyage spécifique avec tous ses détails (KPIs, Transactions, Dépenses)
  const getVoyageById = async id => {
    try {
      const response = await axios.get(`${API_URL}/${id}`)
      return response.data
    } catch (err) {
      console.error('Erreur getVoyageById:', err)
      toast.error(err.response?.data?.message || 'Erreur lors du chargement du voyage')
      return null
    }
  }

  // ==========================================
  // FONCTIONS D'ÉCRITURE (POST, PUT, DELETE)
  // ==========================================

  const addVoyage = async voyageData => {
    try {
      const response = await axios.post(API_URL, voyageData)
      toast.success('Voyage créé avec succès !')
      fetchVoyages() // Rafraîchir la liste
      return response.data
    } catch (err) {
      const errorMsg =
        err.response?.data?.errors?.[0]?.msg || err.response?.data?.error?.message || 'Erreur de création'
      toast.error(errorMsg)
      throw err
    }
  }

  const updateVoyage = async (id, voyageData) => {
    try {
      await axios.put(`${API_URL}/${id}`, voyageData)
      toast.success('Voyage mis à jour avec succès !')
      fetchVoyages()
      return true
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error?.message || 'Erreur de mise à jour'
      toast.error(errorMsg)
      throw err
    }
  }

  const deleteVoyage = async id => {
    try {
      await axios.delete(`${API_URL}/${id}`)
      toast.success('Voyage supprimé.')
      fetchVoyages()
      return true
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Impossible de supprimer ce voyage'
      toast.error(errorMsg)
      return false
    }
  }

  // ==========================================
  // FONCTIONS MÉTIERS AVANCÉES (L'ERP)
  // ==========================================

  // Changer le statut (EN_COURS ou CLOTURE avec calcul du coefficient)
  const changerStatutVoyage = async (id, statut, tauxChange = null) => {
    try {
      const payload = { statut, tauxChange }
      await axios.put(`${API_URL}/${id}/statut`, payload)

      if (statut === 'CLOTURE') {
        toast.success('Voyage clôturé ! Les prix de revient TTC ont été calculés.')
      } else {
        toast.success(`Le voyage est maintenant ${statut.replace('_', ' ')}`)
      }

      fetchVoyages()
      return true
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || 'Erreur lors du changement de statut'
      toast.error(errorMsg, { duration: 5000 }) // Toast plus long pour lire l'erreur métier
      throw err
    }
  }

  // Ajouter une transaction (Facture) et ses colis liés au voyage
  const addTransactionVoyage = async transactionData => {
    try {
      await axios.post(`${API_URL}/${transactionData.idVoyage}/transactions`, transactionData)
      toast.success('Facture et articles enregistrés avec succès !')
      // On ne fait pas fetchVoyages ici, on laissera le composant recharger les détails du voyage
      return true
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || 'Erreur lors de la création de la transaction'
      toast.error(errorMsg, { duration: 6000 })
      throw err
    }
  }

  // Charger les voyages au démarrage
  useEffect(() => {
    fetchVoyages()
  }, [])

  return (
    <VoyageContext.Provider
      value={{
        voyages,
        loading,
        error,
        fetchVoyages,
        getVoyageById,
        addVoyage,
        updateVoyage,
        deleteVoyage,
        changerStatutVoyage,
        addTransactionVoyage
      }}
    >
      {children}
    </VoyageContext.Provider>
  )
}
