import { createContext, useState, useCallback, useContext } from 'react'
import axiosInstance from 'src/configs/axiosConfig'
import toast from 'react-hot-toast'

export const SortieExceptionnelleContext = createContext()
export const useSortieExceptionnelle = () => useContext(SortieExceptionnelleContext)

export const SortieExceptionnelleProvider = ({ children }) => {
  const [sorties, setSorties] = useState([])
  const [loading, setLoading] = useState(false)

  const API_URL = `${process.env.NEXT_PUBLIC_BASE_URL}sorties-exceptionnelles`

  const fetchSorties = useCallback(
    async (params = {}) => {
      setLoading(true)
      try {
        const { data } = await axiosInstance.get(`${API_URL}/getSorties`, { params })
        setSorties(data.data)
        return data
      } catch (err) {
        toast.error(err.response?.data?.message || 'Erreur lors de la récupération des sorties')
        return null
      } finally {
        setLoading(false)
      }
    },
    [API_URL]
  )

  const declarerSortie = async data => {
    try {
      await axiosInstance.post(`${API_URL}/declarerSortie`, data)
      toast.success('La sortie a été déclarée avec succès')
      fetchSorties()
      return true
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Erreur lors de la déclaration'
      toast.error(errorMsg)
      return false
    }
  }

  const rembourserSortie = async (id, data) => {
    try {
      await axiosInstance.post(`${API_URL}/rembourserSortie/${id}`, data)
      toast.success('Remboursement enregistré avec succès')
      fetchSorties()
      return true
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Erreur lors du remboursement'
      toast.error(errorMsg)
      return false
    }
  }

  const refuserRemboursement = async id => {
    try {
      await axiosInstance.patch(`${API_URL}/refuserRemboursement/${id}`)
      toast.success('Le remboursement a été marqué comme refusé')
      fetchSorties()
      return true
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Erreur lors du refus'
      toast.error(errorMsg)
      return false
    }
  }

  const annulerDecision = async id => {
    try {
      await axiosInstance.patch(`${API_URL}/annulerDecision/${id}`)
      toast.success('La décision a été annulée avec succès')
      fetchSorties()
      return true
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Erreur lors de l'annulation"
      toast.error(errorMsg)
      return false
    }
  }

  const modifierSortie = async (id, data) => {
    try {
      await axiosInstance.patch(`${API_URL}/modifierSortie/${id}`, data)
      toast.success('La déclaration a été modifiée avec succès')
      fetchSorties()
      return true
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Erreur lors de la modification'
      toast.error(errorMsg)
      return false
    }
  }

  const supprimerSortie = async id => {
    try {
      await axiosInstance.delete(`${API_URL}/supprimerSortie/${id}`)
      toast.success('La déclaration a été supprimée et les stocks restitués')
      fetchSorties()
      return true
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Erreur lors de la suppression'
      toast.error(errorMsg)
      return false
    }
  }

  return (
    <SortieExceptionnelleContext.Provider
      value={{
        sorties,
        loading,
        fetchSorties,
        declarerSortie,
        rembourserSortie,
        refuserRemboursement,
        annulerDecision,
        modifierSortie,
        supprimerSortie
      }}
    >
      {children}
    </SortieExceptionnelleContext.Provider>
  )
}
