import { createContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

export const VoyageContext = createContext()

export const VoyageProvider = ({ children }) => {
  const [voyages, setVoyages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const API_URL = `${process.env.NEXT_PUBLIC_BASE_URL}voyages`

  const fetchVoyages = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(API_URL)
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
      const { data } = await axios.get(`${API_URL}/${id}`)
      return data
    } catch (err) {
      toast.error(err.response?.data?.message || 'Voyage introuvable')
      return null
    }
  }

  const addVoyage = async voyageData => {
    try {
      const { data } = await axios.post(API_URL, voyageData)
      toast.success('Voyage créé avec succès !')
      fetchVoyages()
      return data
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
      toast.success('Voyage mis à jour !')
      fetchVoyages()
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de mise à jour')
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
      toast.error(err.response?.data?.message || 'Action impossible')
      return false
    }
  }

  const changerStatutVoyage = async (id, statut, tauxChange = null) => {
    try {
      await axios.put(`${API_URL}/${id}/statut`, { statut, tauxChange })

      const message = statut === 'CLOTURE' ? 'Voyage clôturé et prix calculés !' : 'Voyage réouvert avec succès.'

      toast.success(message)
      fetchVoyages()
      return true
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Erreur statut', { duration: 5000 })
      throw err
    }
  }

  const addTransactionVoyage = async transactionData => {
    try {
      await axios.post(`${API_URL}/${transactionData.idVoyage}/transactions`, transactionData)
      toast.success('Transaction enregistrée !')
      return true
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || 'Erreur transaction'
      toast.error(errorMsg, { duration: 6000 })
      throw err
    }
  }

  useEffect(() => {
    fetchVoyages()
  }, [fetchVoyages])

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
