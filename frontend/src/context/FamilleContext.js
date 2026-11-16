import { createContext, useState, useContext, useCallback } from 'react'
import axios from 'src/configs/axiosConfig'
import toast from 'react-hot-toast'

const FamilleContext = createContext()
export const useFamille = () => useContext(FamilleContext)

const extraireErreur = error =>
  error.response?.data?.message ||
  error.response?.data?.errors?.map(err => err.msg).join(', ') ||
  error.response?.data?.error?.message ||
  'Une erreur est survenue'

export const FamilleProvider = ({ children }) => {
  const [familles, setFamilles] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchFamilles = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}familles/allFamilles`)
      setFamilles(data)
    } catch (error) {
      toast.error(extraireErreur(error))
    } finally {
      setLoading(false)
    }
  }, [])

  const ajouterFamille = async donnees => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}familles/addFamille`, donnees)
      toast.success('La famille a été ajoutée')
      await fetchFamilles()
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  const modifierFamille = async (id, donnees) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}familles/updateFamille/${id}`, donnees)
      toast.success('La famille a été modifiée')
      await fetchFamilles()
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  const supprimerFamille = async id => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}familles/deleteFamille/${id}`)
      toast.success('La famille a été supprimée')
      await fetchFamilles()
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  const attribuerFamille = async (idPrd, familleId) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}familles/attribuer/${idPrd}`, { familleId })
      toast.success('La famille du produit a été mise à jour')
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  return (
    <FamilleContext.Provider
      value={{
        familles,
        loading,
        fetchFamilles,
        ajouterFamille,
        modifierFamille,
        supprimerFamille,
        attribuerFamille
      }}
    >
      {children}
    </FamilleContext.Provider>
  )
}
