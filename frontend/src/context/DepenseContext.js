import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axiosInstance from 'src/configs/axiosConfig'
import toast from 'react-hot-toast'

const DepenseContext = createContext()
export const useDepense = () => useContext(DepenseContext)

export const DepenseProvider = ({ children }) => {
  const [listNature, setListNature] = useState([])
  const [depenses, setDepenses] = useState([])
  const [totalDepenses, setTotalDepenses] = useState(0)
  const [loading, setLoading] = useState(true)

  const [globalStats, setGlobalStats] = useState({
    totalDepenses: 0,
    totalEpargne: 0,
    totalDroitsTimbreColis: 0,
    globalChartData: []
  })

  const fetchListNature = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`${process.env.NEXT_PUBLIC_BASE_URL}depenses/allNatDepense`)
      setListNature(response.data)
    } catch (error) {
      toast.error('Erreur de récupération des natures.')
    }
  }, [])

  const fetchGlobalStats = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`${process.env.NEXT_PUBLIC_BASE_URL}depenses/stats/global`)
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

      const response = await axiosInstance.get(`${process.env.NEXT_PUBLIC_BASE_URL}depenses`, { params })

      setDepenses(response.data.depenses)
      setTotalDepenses(response.data.total)
    } catch (error) {
      toast.error('Erreur lors de la récupération des dépenses.')
    } finally {
      setLoading(false)
    }
  }, [])

  const getDernieresDepenses = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`${process.env.NEXT_PUBLIC_BASE_URL}depenses`, {
        params: { page: 1, limit: 5, excludeTimbres: true }
      })
      return response.data.depenses || []
    } catch (error) {
      toast.error("Erreur lors du chargement de l'historique")
      return []
    }
  }, [])

  const handleApiError = error => {
    if (error.response) {
      if (error.response.status === 400) {
        toast.error('Erreur de validation: ' + error.response.data.errors?.map(err => err.msg).join(', '))
      } else if (error.response.status === 403 || error.response.status === 404) {
        toast.error(error.response.data.message || error.response.data.error?.message)
      } else {
        toast.error('Erreur du serveur: ' + (error.response.data.message || error.response.data.error?.message || ''))
      }
    } else if (error.request) {
      toast.error('Pas de réponse du serveur')
    } else {
      toast.error('Erreur: ' + error.message)
    }
  }

  const ajouterNatureDepense = async data => {
    try {
      const response = await axiosInstance.post(`${process.env.NEXT_PUBLIC_BASE_URL}depenses/addNatDepense`, data)
      if (response.status === 201) {
        toast.success('Le nouveau type est ajouté')
        fetchListNature()
        return true
      }
    } catch (error) {
      handleApiError(error)
      return false
    }
  }

  const ajouterDepense = async data => {
    try {
      const response = await axiosInstance.post(`${process.env.NEXT_PUBLIC_BASE_URL}depenses/addDepense`, data)
      if (response.status === 201) {
        toast.success('Dépense enregistrée avec succès')
        fetchGlobalStats()
        return true
      }
    } catch (error) {
      handleApiError(error)
      return false
    }
  }

  const modifierDepense = async (id, data) => {
    try {
      const response = await axiosInstance.patch(`${process.env.NEXT_PUBLIC_BASE_URL}depenses/${id}`, data)
      if (response.status === 200) {
        toast.success('Dépense mise à jour avec succès')
        fetchGlobalStats()
        return true
      }
    } catch (error) {
      handleApiError(error)
      return false
    }
  }

  const annulerDepense = async id => {
    try {
      const response = await axiosInstance.delete(`${process.env.NEXT_PUBLIC_BASE_URL}depenses/${id}`)
      if (response.status === 200) {
        toast.success("Dépense annulée avec succès. L'argent a été restitué.")
        fetchGlobalStats()
        return true
      }
    } catch (error) {
      handleApiError(error)
      return false
    }
  }

  useEffect(() => {
    fetchListNature()
    fetchGlobalStats()
  }, [fetchListNature, fetchGlobalStats])

  const value = {
    listNature,
    depenses,
    totalDepenses,
    loading,
    globalStats,
    fetchData,
    fetchGlobalStats,
    getDernieresDepenses,
    ajouterNatureDepense,
    ajouterDepense,
    modifierDepense,
    annulerDepense
  }

  return <DepenseContext.Provider value={value}>{children}</DepenseContext.Provider>
}
