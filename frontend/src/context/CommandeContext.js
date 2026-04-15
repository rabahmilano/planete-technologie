import { createContext, useContext, useState, useCallback } from 'react'
import axios from 'src/configs/axiosConfig'
import toast from 'react-hot-toast'

const CommandeContext = createContext()

export const CommandeProvider = ({ children }) => {
  const [commandes, setCommandes] = useState([])
  const [totalCommandes, setTotalCommandes] = useState(0)
  const [globalStats, setGlobalStats] = useState({
    totalCA: 0,
    totalCommandes: 0,
    panierMoyen: 0,
    globalCA: 0,
    globalCommandes: 0
  })
  const [loading, setLoading] = useState(true)
  const [produitsDisponibles, setProduitsDisponibles] = useState([])

  const fetchGlobalStats = useCallback(async (filters = {}) => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}commandes/stats`, {
        params: {
          periode: filters.periode || 'all',
          produit: filters.produit || 'all'
        }
      })
      setGlobalStats(response.data)
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques', error)
    }
  }, [])

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

  const fetchProduitsDisponibles = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/allMarchandiseDisponible`)
      const productsFromAPI = response.data.map(product => ({
        id: product.id_prd,
        designation: product.designation_prd,
        quantityAvailable: product.qte_dispo
      }))
      setProduitsDisponibles(productsFromAPI)
    } catch (error) {
      toast.error('Erreur lors de la récupération des produits.')
    }
  }, [])

  const addCommande = useCallback(
    async (orderData, onSuccess) => {
      try {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}commandes/createCommande`, orderData)
        if (response.status === 200) {
          toast.success(response.data.message)
          fetchCommandes()
          fetchGlobalStats()
          if (onSuccess) onSuccess()
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Erreur lors de l'envoi de la commande.")
      }
    },
    [fetchCommandes, fetchGlobalStats]
  )

  const deleteCommande = useCallback(async (id_cde, onSuccess) => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}commandes/${id_cde}`)
      toast.success('Commande annulée. Stocks et compte mis à jour.')
      if (onSuccess) onSuccess()
    } catch (error) {
      toast.error(error.response?.data?.error?.message || "Erreur lors de l'annulation")
    }
  }, [])

  return (
    <CommandeContext.Provider
      value={{
        commandes,
        totalCommandes,
        globalStats,
        loading,
        produitsDisponibles,
        fetchCommandes,
        fetchGlobalStats,
        fetchProduitsDisponibles,
        addCommande,
        deleteCommande
      }}
    >
      {children}
    </CommandeContext.Provider>
  )
}

export const useCommande = () => useContext(CommandeContext)
