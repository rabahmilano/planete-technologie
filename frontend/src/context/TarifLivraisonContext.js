import { createContext, useState, useContext, useEffect, useCallback } from 'react'
import axios from 'src/configs/axiosConfig'
import toast from 'react-hot-toast'

const TarifLivraisonContext = createContext()
export const useTarifLivraison = () => useContext(TarifLivraisonContext)

const messageErreur = error =>
  error.response?.data?.message ||
  error.response?.data?.error?.message ||
  'Une erreur est survenue'

export const TarifLivraisonProvider = ({ children }) => {
  const [tarifs, setTarifs] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchTarifs = useCallback(async (params = {}) => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}tarifs-livraison`, { params })
      setTarifs(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(messageErreur(error))
    } finally {
      setLoading(false)
    }
  }, [])

  const ajouterTarif = async data => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}tarifs-livraison`, data)
      toast.success('Tarif créé')
      await fetchTarifs()
      return true
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.errors) {
        toast.error('Erreur de validation : ' + error.response.data.errors.map(err => err.msg).join(', '))
      } else {
        toast.error(messageErreur(error))
      }
      return false
    }
  }

  const modifierTarif = async (id, data) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}tarifs-livraison/${id}`, data)
      toast.success('Tarif modifié')
      await fetchTarifs()
      return true
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.errors) {
        toast.error('Erreur de validation : ' + error.response.data.errors.map(err => err.msg).join(', '))
      } else {
        toast.error(messageErreur(error))
      }
      return false
    }
  }

  const supprimerTarif = async id => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}tarifs-livraison/${id}`)
      toast.success('Tarif supprimé')
      await fetchTarifs()
      return true
    } catch (error) {
      toast.error(messageErreur(error))
      return false
    }
  }

  useEffect(() => {
    fetchTarifs()
  }, [fetchTarifs])

  return (
    <TarifLivraisonContext.Provider
      value={{ tarifs, loading, fetchTarifs, ajouterTarif, modifierTarif, supprimerTarif }}
    >
      {children}
    </TarifLivraisonContext.Provider>
  )
}
