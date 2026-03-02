import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const EmpruntContext = createContext()

export const useEmprunt = () => useContext(EmpruntContext)

export const EmpruntProvider = ({ children }) => {
  const [emprunts, setEmprunts] = useState([])
  const [loading, setLoading] = useState(true)

  // Fonction pour récupérer la liste des emprunts et leurs remboursements
  const fetchEmprunts = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}emprunts/allEmprunts`)
      setEmprunts(response.data)
    } catch (error) {
      console.error("Erreur lors de la récupération des emprunts:", error)
      toast.error('Erreur lors de la récupération des emprunts.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Chargement initial des données
  useEffect(() => {
    fetchEmprunts()
  }, [fetchEmprunts])

  const value = { emprunts, loading, fetchEmprunts }

  return <EmpruntContext.Provider value={value}>{children}</EmpruntContext.Provider>
}