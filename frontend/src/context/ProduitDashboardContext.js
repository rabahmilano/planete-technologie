import { createContext, useContext, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const ProduitDashboardContext = createContext()

export const useProduitDashboard = () => useContext(ProduitDashboardContext)

export const ProduitDashboardProvider = ({ children }) => {
  const fetchProduitsEnStock = useCallback(async () => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/allMarchandiseDisponible`)
      return data
    } catch (error) {
      toast.error('Erreur lors de la récupération des produits en stock.')
      return []
    }
  }, [])

  const fetchColisStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/colisEnRoute/stats`)
      return data
    } catch (error) {
      toast.error('Erreur lors de la récupération des statistiques.')
      return { totalCount: 0, totalValue: 0, totalProduits: 0 }
    }
  }, [])

  const fetchColisEnRoute = useCallback(async () => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/colisEnRoute`)
      return data
    } catch (error) {
      toast.error('Erreur lors de la récupération des colis.')
      return []
    }
  }, [])

  const modifierColis = async (id, data) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}produits/colis/${id}`, data)
      toast.success('Mise à jour réussie')
      return true
    } catch (error) {
      toast.error('Erreur lors de la mise à jour.')
      return false
    }
  }

  const annulerColis = async id => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}produits/colis/${id}`)
      toast.success('Colis annulé avec succès !')
      return true
    } catch (error) {
      toast.error("Erreur lors de l'annulation du colis.")
      return false
    }
  }

  const fetchHistorique = useCallback(async params => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique`, { params })
      return data
    } catch (error) {
      toast.error("Erreur lors de la récupération de l'historique.")
      return { colis: [], total: 0 }
    }
  }, [])

  const fetchHistoriqueAnalytics = useCallback(async filters => {
    try {
      const [statsRes, catChartRes, yearChartRes, accChartRes, topPrdChartRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique/stats`, { params: filters }),
        axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique/charts/by-category`),
        axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique/charts/by-year`),
        axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique/charts/by-account`),
        axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique/charts/top-products`)
      ])

      return {
        stats: statsRes.data,
        chartCategory: catChartRes.data,
        chartYear: yearChartRes.data,
        chartAccount: accChartRes.data,
        chartTopProducts: topPrdChartRes.data
      }
    } catch (error) {
      toast.error('Erreur de récupération des données analytiques.')
      return null
    }
  }, [])

  const updateHistoriqueColis = async (id, dataToUpdate) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique/${id}`, dataToUpdate)
      toast.success('Colis mis à jour avec succès !')
      return true
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour.')
      return false
    }
  }

  const fetchHistoriquePrix = useCallback(async params => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique-prix`, { params })
      return data
    } catch (error) {
      toast.error('Erreur lors de la récupération des produits.')
      return { produits: [], total: 0 }
    }
  }, [])

  const fetchHistoriquePrixStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique-prix/stats`)
      return data
    } catch (error) {
      toast.error('Erreur de récupération des statistiques.')
      return { totalProduits: 0, produitsEnStock: 0, totalQteAchetee: 0 }
    }
  }, [])

  const fetchProductDetails = useCallback(async productId => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/historique-prix/${productId}`)
      return data
    } catch (error) {
      toast.error('Erreur de récupération des détails du produit.')
      return null
    }
  }, [])

  const fetchProductColis = useCallback(async (productId, params) => {
    try {
      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}produits/historique-prix/${productId}/colis`,
        { params }
      )
      return data
    } catch (error) {
      toast.error('Erreur de récupération des colis du produit.')
      return { colis: [], total: 0 }
    }
  }, [])

  return (
    <ProduitDashboardContext.Provider
      value={{
        fetchProduitsEnStock,
        fetchColisStats,
        fetchColisEnRoute,
        modifierColis,
        annulerColis,
        fetchHistorique,
        fetchHistoriqueAnalytics,
        updateHistoriqueColis,
        fetchHistoriquePrix,
        fetchHistoriquePrixStats,
        fetchProductDetails,
        fetchProductColis
      }}
    >
      {children}
    </ProduitDashboardContext.Provider>
  )
}
