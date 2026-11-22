import { createContext, useState, useContext, useEffect, useCallback } from 'react'
import axios from 'src/configs/axiosConfig'
import toast from 'react-hot-toast'

const FamilleContext = createContext()
export const useFamille = () => useContext(FamilleContext)

const messageErreur = error =>
  error.response?.data?.message ||
  error.response?.data?.error?.message ||
  'Une erreur est survenue'

export const FamilleProvider = ({ children }) => {
  const [familles, setFamilles] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchFamilles = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}familles`)
      setFamilles(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(messageErreur(error))
    } finally {
      setLoading(false)
    }
  }, [])

  const ajouterFamille = async data => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}familles`, data)
      toast.success('Famille créée')
      await fetchFamilles()
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

  const modifierFamille = async (id, data) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}familles/${id}`, data)
      toast.success('Famille modifiée')
      await fetchFamilles()
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

  const supprimerFamille = async id => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}familles/${id}`)
      toast.success('Famille supprimée')
      await fetchFamilles()
      return true
    } catch (error) {
      toast.error(messageErreur(error))
      return false
    }
  }

  const televerserImageFamille = async fichier => {
    try {
      const donnees = new FormData()
      donnees.append('image', fichier)
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}familles/image/upload`,
        donnees
      )
      return data
    } catch (error) {
      toast.error(messageErreur(error))
      return null
    }
  }

  useEffect(() => {
    fetchFamilles()
  }, [fetchFamilles])

  return (
    <FamilleContext.Provider
      value={{
        familles,
        loading,
        fetchFamilles,
        ajouterFamille,
        modifierFamille,
        supprimerFamille,
        televerserImageFamille
      }}
    >
      {children}
    </FamilleContext.Provider>
  )
}
