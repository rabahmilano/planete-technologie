import { createContext, useState, useContext, useCallback } from 'react'
import axios from 'src/configs/axiosConfig'
import toast from 'react-hot-toast'

const CommandeWebContext = createContext()
export const useCommandeWeb = () => useContext(CommandeWebContext)

const extraireErreur = error =>
  error.response?.data?.message ||
  error.response?.data?.errors?.map(err => err.msg).join(', ') ||
  error.response?.data?.error?.message ||
  'Une erreur est survenue'

export const CommandeWebProvider = ({ children }) => {
  const [commandesWeb, setCommandesWeb] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchCommandesWeb = useCallback(async (page = 1, limit = 25, filtres = {}) => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}commandes-web/allCommandesWeb`, {
        params: {
          page,
          limit,
          statut: filtres.statut || undefined,
          search: filtres.search || ''
        }
      })
      setCommandesWeb(data.commandes)
      setTotal(data.total)
    } catch (error) {
      toast.error(extraireErreur(error))
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCommandeWebDetail = async id => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}commandes-web/${id}`)
      return data
    } catch (error) {
      toast.error(extraireErreur(error))
      return null
    }
  }

  const changerStatut = async (id, statutCommande, codeTracking = null) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}commandes-web/statut/${id}`, {
        statutCommande,
        codeTracking: codeTracking || null
      })
      toast.success(`Statut de la commande changé en ${statutCommande}`)
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  const annulerCommandeWeb = async id => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}commandes-web/annuler/${id}`)
      toast.success('La commande a été annulée et le stock libéré')
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  return (
    <CommandeWebContext.Provider
      value={{
        commandesWeb,
        total,
        loading,
        fetchCommandesWeb,
        fetchCommandeWebDetail,
        changerStatut,
        annulerCommandeWeb
      }}
    >
      {children}
    </CommandeWebContext.Provider>
  )
}
