import { createContext, useContext, useState, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const CommandeContext = createContext()

export const CommandeProvider = ({ children }) => {
  const [commandes, setCommandes] = useState([])
  const [totalCommandes, setTotalCommandes] = useState(0)
  const [globalStats, setGlobalStats] = useState({ totalCA: 0, totalCommandes: 0, panierMoyen: 0 })
  const [loading, setLoading] = useState(true)

  // Récupérer les statistiques globales
  const fetchGlobalStats = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}commandes/stats`)
      setGlobalStats(response.data)
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques', error)
    }
  }, [])

  // Récupérer la liste avec gestion des filtres
  const fetchCommandes = useCallback(async (page = 0, limit = 10, filters = {}) => {
    setLoading(true)
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}commandes`, {
        params: { 
          page: page + 1, 
          limit,
          periode: filters.periode || 'all',
          produit: filters.produit || 'all'
        }
      })
      setCommandes(response.data.data)
      setTotalCommandes(response.data.total)
    } catch (error) {
      toast.error('Erreur lors du chargement des commandes')
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <CommandeContext.Provider value={{ commandes, totalCommandes, globalStats, loading, fetchCommandes, fetchGlobalStats }}>
      {children}
    </CommandeContext.Provider>
  )
}

export const useCommande = () => useContext(CommandeContext)