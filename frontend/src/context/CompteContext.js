import { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const CompteContext = createContext()

export const useCompte = () => useContext(CompteContext)

export const CompteProvider = ({ children }) => {
  const [comptes, setComptes] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchComptes = async () => {
    setLoading(true)
    try {
      const reponse = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}comptes/allComptes`)
      setComptes(reponse.data)
    } catch (error) {
      console.error('Erreur lors de la récupération des comptes:', error)
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
      if (error.response) {
        if (error.response.status === 400) {
          toast.error('Erreur de validation: ' + error.response.data.errors.map(err => err.msg).join(', '))
        } else if (error.response.status === 403 || error.response.status === 409) {
          toast.error(error.response.data.message || error.response.data.error?.message || 'Le compte existe déjà')
        } else {
          toast.error('Erreur du serveur: ' + (error.response.data.message || ''))
        }
      } else {
        toast.error('Erreur de connexion au serveur')
      }
      return false
    }
  }

  const crediter = async data => {
    try {
      const reponse = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}comptes/crediterCompte`, data)
      if (reponse.status === 200) {
        toast.success(reponse.data.message || 'Compte crédité avec succès')
        fetchComptes()
        return true
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 400 && error.response.data.errors) {
          toast.error('Erreur de validation: ' + error.response.data.errors.map(err => err.msg).join(', '))
        } else if (error.response.data.message) {
          toast.error(error.response.data.message)
        } else if (error.response.data.error?.message) {
          toast.error(error.response.data.error.message)
        } else {
          toast.error('Erreur du serveur')
        }
      } else {
        toast.error('Erreur de connexion au serveur')
      }
      return false
    }
  }

  useEffect(() => {
    fetchComptes()
  }, [])

  const value = {
    comptes,
    fetchComptes,
    ajouterCompte,
    crediter,
    loading
  }

  return <CompteContext.Provider value={value}>{children}</CompteContext.Provider>
}
