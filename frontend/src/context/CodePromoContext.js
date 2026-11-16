import { createContext, useState, useContext, useEffect, useCallback } from 'react'
import axios from 'src/configs/axiosConfig'
import toast from 'react-hot-toast'

const CodePromoContext = createContext()
export const useCodePromo = () => useContext(CodePromoContext)

const messageErreur = error =>
  error.response?.data?.message ||
  error.response?.data?.error?.message ||
  'Une erreur est survenue'

export const CodePromoProvider = ({ children }) => {
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}codes-promo`)
      setCodes(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(messageErreur(error))
    } finally {
      setLoading(false)
    }
  }, [])

  const ajouterCode = async data => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}codes-promo`, data)
      toast.success('Code promo créé')
      await fetchCodes()
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

  const modifierCode = async (id, data) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}codes-promo/${id}`, data)
      toast.success('Code promo modifié')
      await fetchCodes()
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

  const supprimerCode = async id => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}codes-promo/${id}`)
      toast.success('Code promo supprimé')
      await fetchCodes()
      return true
    } catch (error) {
      toast.error(messageErreur(error))
      return false
    }
  }

  const verifierCode = async (code, montant_commande) => {
    try {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}codes-promo/verifier`, {
        code,
        montant_commande
      })
      return data
    } catch (error) {
      toast.error(messageErreur(error))
      return null
    }
  }

  useEffect(() => {
    fetchCodes()
  }, [fetchCodes])

  return (
    <CodePromoContext.Provider
      value={{ codes, loading, fetchCodes, ajouterCode, modifierCode, supprimerCode, verifierCode }}
    >
      {children}
    </CodePromoContext.Provider>
  )
}
