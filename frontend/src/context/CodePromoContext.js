import { createContext, useState, useContext, useCallback } from 'react'
import axios from 'src/configs/axiosConfig'
import toast from 'react-hot-toast'

const CodePromoContext = createContext()
export const useCodePromo = () => useContext(CodePromoContext)

const extraireErreur = error =>
  error.response?.data?.message ||
  error.response?.data?.errors?.map(err => err.msg).join(', ') ||
  error.response?.data?.error?.message ||
  'Une erreur est survenue'

export const CodePromoProvider = ({ children }) => {
  const [codesPromo, setCodesPromo] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchCodesPromo = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}codes-promo/allCodesPromo`)
      setCodesPromo(data)
    } catch (error) {
      toast.error(extraireErreur(error))
    } finally {
      setLoading(false)
    }
  }, [])

  const ajouterCodePromo = async donnees => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}codes-promo/addCodePromo`, donnees)
      toast.success('Le code promo a été créé')
      await fetchCodesPromo()
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  const modifierCodePromo = async (id, donnees) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}codes-promo/updateCodePromo/${id}`, donnees)
      toast.success('Le code promo a été modifié')
      await fetchCodesPromo()
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  const supprimerCodePromo = async id => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}codes-promo/deleteCodePromo/${id}`)
      toast.success('Le code promo a été supprimé')
      await fetchCodesPromo()
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  return (
    <CodePromoContext.Provider
      value={{ codesPromo, loading, fetchCodesPromo, ajouterCodePromo, modifierCodePromo, supprimerCodePromo }}
    >
      {children}
    </CodePromoContext.Provider>
  )
}
