import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const DepenseContext = createContext()
export const useDepense = () => useContext(DepenseContext)

export const DepenseProvider = ({ children }) => {
  const [listNature, setListNature] = useState([])
  const [depenses, setDepenses] = useState([])
  const [totalDepenses, setTotalDepenses] = useState(0)
  const [loading, setLoading] = useState(true)
  const [globalChartData, setGlobalChartData] = useState([]);

  // MISE À JOUR: L'état initial inclut maintenant une clé pour les droits de timbre des colis
  const [globalStats, setGlobalStats] = useState({
    totalDepenses: 0,
    totalEpargne: 0,
    totalDroitsTimbreColis: 0,
    globalChartData: []
  })

  const fetchListNature = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}depenses/allNatDepense`)
      setListNature(response.data)
    } catch (error) {
      toast.error('Erreur de récupération des natures.')
    }
  }, [])

  const fetchGlobalStats = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}depenses/stats/global`)
      setGlobalStats(response.data)
    } catch (error) {
      toast.error('Erreur de récupération des statistiques globales.')
    }
  }, [])

  const fetchData = useCallback(async (page, limit, filters) => {
    setLoading(true)
    try {
      const params = { page: page + 1, limit }
      if (filters.nature) params.nature = filters.nature
      if (filters.periode) params.periode = filters.periode

      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}depenses`, { params })

      setDepenses(response.data.depenses)
      setTotalDepenses(response.data.total)
      if (response.data.globalChartData) {
        setGlobalChartData(response.data.globalChartData);
      }
    } catch (error) {
      toast.error('Erreur lors de la récupération des dépenses.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchListNature()
    fetchGlobalStats()
  }, [fetchListNature, fetchGlobalStats])

  const value = { listNature, depenses, totalDepenses, loading, fetchData, globalStats, globalChartData }

  return <DepenseContext.Provider value={value}>{children}</DepenseContext.Provider>
}
