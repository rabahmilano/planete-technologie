import { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const DeviseContext = createContext()

export const useDevises = () => useContext(DeviseContext)

export const DeviseProvider = ({ children }) => {
  const [devises, setDevises] = useState([])

  const fetchDevises = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}devises/allDevises`)
      setDevises(response.data)
    } catch (error) {
      console.error('Erreur lors de la récupération des devises:', error)
    }
  }

  const ajouterDevise = async data => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}devises/addDevise`, data)
      if (response.status === 201) {
        toast.success('Devise ajoutée avec succès')
        fetchDevises()
        return true
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 400) {
          toast.error('Erreur de validation: ' + error.response.data.errors.map(err => err.msg).join(', '))
        } else if (error.response.status === 409) {
          toast.error('La devise existe déjà')
        } else {
          toast.error('Erreur du serveur: ' + (error.response.data.message || error.response.data.error?.message || ''))
        }
      } else if (error.request) {
        toast.error('Pas de réponse du serveur')
      } else {
        toast.error('Erreur: ' + error.message)
      }
      return false
    }
  }

  useEffect(() => {
    fetchDevises()
  }, [])

  return <DeviseContext.Provider value={{ devises, fetchDevises, ajouterDevise }}>{children}</DeviseContext.Provider>
}
