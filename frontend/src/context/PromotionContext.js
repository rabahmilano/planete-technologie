import { createContext, useState, useContext, useEffect, useCallback } from 'react'
import axios from 'src/configs/axiosConfig'
import toast from 'react-hot-toast'

const PromotionContext = createContext()
export const usePromotion = () => useContext(PromotionContext)

const messageErreur = error =>
  error.response?.data?.message ||
  error.response?.data?.error?.message ||
  'Une erreur est survenue'

const erreurValidation = error => {
  if (error.response?.status === 400 && error.response?.data?.errors) {
    toast.error('Erreur de validation : ' + error.response.data.errors.map(err => err.msg).join(', '))
  } else {
    toast.error(messageErreur(error))
  }
}

export const PromotionProvider = ({ children }) => {
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchPromotions = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}promotions`)
      setPromotions(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(messageErreur(error))
    } finally {
      setLoading(false)
    }
  }, [])

  const ajouterPromotion = async data => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}promotions`, data)
      toast.success('Promotion créée')
      await fetchPromotions()
      return true
    } catch (error) {
      erreurValidation(error)
      return false
    }
  }

  const modifierPromotion = async (id, data) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}promotions/${id}`, data)
      toast.success('Promotion modifiée')
      await fetchPromotions()
      return true
    } catch (error) {
      erreurValidation(error)
      return false
    }
  }

  const supprimerPromotion = async id => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}promotions/${id}`)
      toast.success('Promotion supprimée')
      await fetchPromotions()
      return true
    } catch (error) {
      toast.error(messageErreur(error))
      return false
    }
  }

  useEffect(() => {
    fetchPromotions()
  }, [fetchPromotions])

  return (
    <PromotionContext.Provider
      value={{ promotions, loading, fetchPromotions, ajouterPromotion, modifierPromotion, supprimerPromotion }}
    >
      {children}
    </PromotionContext.Provider>
  )
}
