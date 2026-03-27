// src/context/ProduitContext.js
import { createContext, useState, useContext, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const ProduitContext = createContext()
export const useProduit = () => useContext(ProduitContext)

export const ProduitProvider = ({ children }) => {
  const [listCategorie, setListCategorie] = useState([])
  const [listCompte, setListCompte] = useState([])

  const fetchCategories = useCallback(async () => {
    try {
      const reponse = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/allCategories`)
      setListCategorie(reponse.data)
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la récupération des catégories')
    }
  }, [])

  const fetchComptes = useCallback(async () => {
    try {
      const reponse = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}comptes/allComptes`)
      setListCompte(reponse.data)
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la récupération des comptes')
    }
  }, [])

  const ajouterProduit = async data => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}produits/addProduit`, data)
      toast.success("L'opération d'achat a été bien enregistrée")

      await fetchCategories()
      await fetchComptes()

      return true
    } catch (error) {
      toast.error(error.response?.data?.error?.message || "Erreur lors de l'enregistrement de l'achat")

      return false
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchComptes()
  }, [fetchCategories, fetchComptes])

  return (
    <ProduitContext.Provider value={{ listCategorie, listCompte, fetchCategories, fetchComptes, ajouterProduit }}>
      {children}
    </ProduitContext.Provider>
  )
}
