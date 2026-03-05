import { createContext, useContext, useState, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const CommandeContext = createContext()

export const CommandeProvider = ({ children }) => {
  const [commandes, setCommandes] = useState([])
  const [totalCommandes, setTotalCommandes] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchCommandes = useCallback(async (page = 0, limit = 10) => {
    setLoading(true)
    try {
      // API attend une page commençant à 1
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}commandes`, {
        params: { page: page + 1, limit }
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
    <CommandeContext.Provider value={{ commandes, totalCommandes, loading, fetchCommandes }}>
      {children}
    </CommandeContext.Provider>
  )
}

export const useCommande = () => useContext(CommandeContext)