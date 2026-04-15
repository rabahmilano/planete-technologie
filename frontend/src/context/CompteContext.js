import { createContext, useState, useContext, useEffect } from 'react'
import axios from 'src/configs/axiosConfig'
import toast from 'react-hot-toast'

const CompteContext = createContext()

export const useCompte = () => useContext(CompteContext)

export const CompteProvider = ({ children }) => {
  const [tousLesComptes, setTousLesComptes] = useState([])
  const [comptes, setComptes] = useState([])
  const [bilanGlobal, setBilanGlobal] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchComptes = async () => {
    setLoading(true)
    try {
      const reponse = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}comptes/allComptes`)
      const data = reponse.data
      setTousLesComptes(data)
      setComptes(data.filter(c => c.type_cpt?.toUpperCase() !== 'COFFRE'))

      const bilanReponse = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}comptes/bilan-global`)
      setBilanGlobal(bilanReponse.data)
    } catch (error) {
      toast.error('Erreur lors de la récupération des données')
    } finally {
      setLoading(false)
    }
  }

  const ajouterCompte = async data => {
    try {
      const reponse = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}comptes/addCompte`, data)
      if (reponse.status === 201) {
        toast.success('Compte créé avec succès')
        fetchComptes()
        return true
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la création')
      return false
    }
  }

  const crediter = async data => {
    try {
      const reponse = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}comptes/crediterCompte`, data)
      if (reponse.status === 200) {
        toast.success(reponse.data.message)
        fetchComptes()
        return true
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Erreur lors de l'opération")
      return false
    }
  }

  const transferer = async data => {
    try {
      const reponse = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}transferts/createTransfert`, data)
      if (reponse.status === 201) {
        toast.success(reponse.data.message)
        fetchComptes()
        return true
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors du transfert')
      return false
    }
  }

  useEffect(() => {
    fetchComptes()
  }, [])

  const value = {
    tousLesComptes,
    comptes,
    bilanGlobal,
    fetchComptes,
    ajouterCompte,
    crediter,
    transferer,
    loading
  }

  return <CompteContext.Provider value={value}>{children}</CompteContext.Provider>
}
