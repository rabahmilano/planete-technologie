import { createContext, useContext, useCallback } from 'react'
import axios from 'src/configs/axiosConfig'
import toast from 'react-hot-toast'

const HomeDashboardContext = createContext()

export const useHomeDashboard = () => useContext(HomeDashboardContext)

export const HomeDashboardProvider = ({ children }) => {
  const fetchRollingKpis = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/dashboard/rolling-kpis`)

      return response.data
    } catch (error) {
      return null
    }
  }, [])

  const fetchArticlesChartData = useCallback(async () => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/dashboard/chart-articles`)
      return data
    } catch (error) {
      return []
    }
  }, [])

  const fetchTransactionsChartData = useCallback(async () => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/dashboard/chart-transactions`)
      return data
    } catch (error) {
      return []
    }
  }, [])

  const fetchAllStats = useCallback(async () => {
    try {
      const colisEnRoute = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/colisEnRoute/stats`)

      return {
        colis: colisEnRoute.data
      }
    } catch (error) {
      toast.error('Erreur lors de la récupération des colis en route')
      return null
    }
  }, [])

  const fetchPeriodicPerformance = useCallback(async () => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/dashboard/analytics-all`)

      return data
    } catch (error) {
      toast.error('Erreur lors de la récupération des statistiques périodiques')

      return {
        weeklyStats: {
          ventes: { count: 0, income: 0, dailyData: [] },
          achats: { count: 0, income: 0, dailyData: [] }
        },
        monthlyStats: {
          ventes: [],
          achats: []
        }
      }
    }
  }, [])

  const fetchVentesRecentesEtTopProduits = useCallback(async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}produits/dashboard/ventes-recentes-top-produits`
      )
      return response.data
    } catch (error) {
      return { dernieresCommandes: [], topProduits: [] }
    }
  }, [])

  return (
    <HomeDashboardContext.Provider
      value={{
        fetchArticlesChartData,
        fetchTransactionsChartData,
        fetchAllStats,
        fetchPeriodicPerformance,
        fetchVentesRecentesEtTopProduits,
        fetchRollingKpis
      }}
    >
      {children}
    </HomeDashboardContext.Provider>
  )
}
