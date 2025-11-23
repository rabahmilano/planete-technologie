import { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const ProduitContext = createContext()
export const useProduit = () => useContext(ProduitContext)

export const ProduitProvider = ({ children }) => {
  const [listCategorie, setListCategorie] = useState([])
  const [listCompte, setListCompte] = useState([])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const reponse = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/allCategories`)
        setListCategorie(reponse.data)
      } catch (error) {
        toast.error('Erreur lors de la récupération des categories')
      }
    }
    const fetchComptes = async () => {
      try {
        // Assurez-vous que cette route existe dans votre backend (ex: dans compteRouter.js)
        const reponse = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}comptes/allComptes`)
        setListCompte(reponse.data)
      } catch (error) {
        toast.error('Erreur lors de la récupération des comptes')
      }
    }
    fetchCategories()
    fetchComptes()
  }, [])

  return <ProduitContext.Provider value={{ listCategorie, listCompte }}>{children}</ProduitContext.Provider>
}

/*
import { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'

const ProduitContext = createContext()

export const useProduit = () => useContext(ProduitContext)

export const ProduitProvider = ({ children }) => {
  const [listCategorie, setListCategorie] = useState([])

  const fetchCategories = async () => {
    try {
      const reponse = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/allCategories`)
      setListCategorie(reponse.data)
    } catch (error) {
      toast.error('Erreur lors de la récupération des categories')
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  return <ProduitContext.Provider value={{ listCategorie, fetchCategories }}>{children}</ProduitContext.Provider>
}
*/
