import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const EmpruntContext = createContext()

export const useEmprunt = () => useContext(EmpruntContext)

export const EmpruntProvider = ({ children }) => {
  const [emprunts, setEmprunts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchEmprunts = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}emprunts/allEmprunts`)
      setEmprunts(response.data)
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la récupération des emprunts.')
    } finally {
      setLoading(false)
    }
  }, [])

  const ajouterEmprunt = async data => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}emprunts/addEmprunt`, data)
      toast.success('Emprunt enregistré avec succès.')
      await fetchEmprunts()
      return true
    } catch (error) {
      toast.error(error.response?.data?.error?.message || "Erreur lors de l'enregistrement de l'emprunt.")
      return false
    }
  }

  const modifierEmprunt = async (id, data) => {
    try {
      await axios.put(`${process.env.NEXT_PUBLIC_BASE_URL}emprunts/updateEmprunt/${id}`, data)
      toast.success('Emprunt mis à jour avec succès.')
      await fetchEmprunts()
      return true
    } catch (error) {
      toast.error(error.response?.data?.error?.message || "Erreur lors de la mise à jour de l'emprunt.")
      return false
    }
  }

  const supprimerEmprunt = async id => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}emprunts/${id}`)
      toast.success('Emprunt supprimé, solde du compte mis à jour.')
      await fetchEmprunts()
      return true
    } catch (error) {
      toast.error(error.response?.data?.error?.message || "Erreur lors de la suppression de l'emprunt.")
      return false
    }
  }

  const modifierRemboursement = async (id, data) => {
    try {
      await axios.put(`${process.env.NEXT_PUBLIC_BASE_URL}emprunts/remboursement/${id}`, data)
      toast.success('Remboursement corrigé avec succès.')
      await fetchEmprunts()
      return true
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la correction du remboursement.')
      return false
    }
  }

  const supprimerRemboursement = async id => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}emprunts/remboursement/${id}`)
      toast.success('Remboursement annulé, fonds restitués.')
      await fetchEmprunts()
      return true
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de l’annulation du remboursement.')
      return false
    }
  }

  useEffect(() => {
    fetchEmprunts()
  }, [fetchEmprunts])

  const value = {
    emprunts,
    loading,
    fetchEmprunts,
    ajouterEmprunt,
    modifierEmprunt,
    supprimerEmprunt,
    modifierRemboursement,
    supprimerRemboursement
  }

  return <EmpruntContext.Provider value={value}>{children}</EmpruntContext.Provider>
}
