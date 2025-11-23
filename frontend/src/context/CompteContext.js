import { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'

const CompteContext = createContext()

export const useCompte = () => useContext(CompteContext)

export const CompteProvider = ({ children }) => {
  const [comptes, setComptes] = useState([])

  const fetchComptes = async () => {
    try {
      const reponse = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}comptes/allComptes`)
      setComptes(reponse.data)
    } catch (error) {
      console.error('Erreur lors de la récupération des comptes:', error)
    }
  }

  useEffect(() => {
    fetchComptes()
  }, [])

  return <CompteContext.Provider value={{ comptes, fetchComptes }}>{children}</CompteContext.Provider>
}
