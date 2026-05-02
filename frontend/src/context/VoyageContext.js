import { createContext, useState, useCallback, useContext } from 'react'
import axiosInstance from 'src/configs/axiosConfig'
import toast from 'react-hot-toast'

export const VoyageContext = createContext()
export const useVoyage = () => useContext(VoyageContext)

export const VoyageProvider = ({ children }) => {
  const [voyages, setVoyages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const API_URL = `${process.env.NEXT_PUBLIC_BASE_URL}voyages`

  const fetchVoyages = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axiosInstance.get(API_URL)
      setVoyages(data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement')
      toast.error('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }, [API_URL])

  const getVoyageById = async id => {
    try {
      const { data } = await axiosInstance.get(`${API_URL}/${id}`)
      return data
    } catch (err) {
      toast.error(err.response?.data?.message || 'Voyage introuvable')
      return null
    }
  }

  const addVoyage = async voyageData => {
    try {
      const { data } = await axiosInstance.post(API_URL, voyageData)
      toast.success('Voyage créé avec succès !')
      fetchVoyages()
      return data
    } catch (err) {
      const errorMsg =
        err.response?.data?.errors?.[0]?.msg || err.response?.data?.error?.message || 'Erreur de création'
      toast.error(errorMsg)
      return false
    }
  }

  const updateVoyage = async (id, voyageData) => {
    try {
      await axiosInstance.put(`${API_URL}/${id}`, voyageData)
      toast.success('Voyage mis à jour !')
      fetchVoyages()
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de mise à jour')
      return false
    }
  }

  const deleteVoyage = async id => {
    try {
      await axiosInstance.delete(`${API_URL}/${id}`)
      toast.success('Voyage supprimé.')
      fetchVoyages()
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action impossible')
      return false
    }
  }

  const changerStatutVoyage = async (id, statut, tauxChange = null) => {
    try {
      await axiosInstance.put(`${API_URL}/${id}/statut`, { statut, tauxChange })
      const message = statut === 'CLOTURE' ? 'Voyage clôturé et prix calculés !' : 'Voyage réouvert avec succès.'
      toast.success(message)
      fetchVoyages()
      return true
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Erreur statut', { duration: 5000 })
      return false
    }
  }

  const addTransactionVoyage = async transactionData => {
    try {
      await axiosInstance.post(`${API_URL}/${transactionData.idVoyage}/addTransaction`, transactionData)
      toast.success('Transaction enregistrée !')
      return true
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || 'Erreur transaction'
      toast.error(errorMsg, { duration: 6000 })
      return false
    }
  }

  const deleteTransactionVoyage = async idTrans => {
    try {
      await axiosInstance.delete(`${API_URL}/transaction/${idTrans}`)
      toast.success('Transaction supprimée et fonds restitués.')
      fetchVoyages()
      return true
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Erreur lors de la suppression'
      toast.error(errorMsg)
      return false
    }
  }

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
        addTransactionVoyage,
        deleteTransactionVoyage
      }}
    >
      {children}
    </VoyageContext.Provider>
  )
}
