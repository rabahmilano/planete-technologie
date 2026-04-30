import { createContext, useState, useContext, useEffect, useCallback } from 'react'
import axios from 'src/configs/axiosConfig'
import toast from 'react-hot-toast'

const ProduitContext = createContext()
export const useProduit = () => useContext(ProduitContext)

export const ProduitProvider = ({ children }) => {
  const [listCategorie, setListCategorie] = useState([])
  const [listCompte, setListCompte] = useState([])

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/allCategories`)
      setListCategorie(data)
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la récupération des catégories')
    }
  }, [])

  const fetchComptes = useCallback(async () => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}comptes/allComptes`)
      setListCompte(data)
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la récupération des comptes')
    }
  }, [])

  const rechercherProduits = async query => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/search`, { params: { query } })
      return data
    } catch (error) {
      return []
    }
  }

  const searchAutocompleteProduits = useCallback(async query => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/search-autocomplete`, {
        params: { q: query }
      })
      return data || []
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la recherche des produits')
      return []
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
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        "Erreur lors de l'enregistrement de l'achat"

      toast.error(errorMessage)
      return false
    }
  }

  const ajouterCategorie = async data => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}produits/addCategorie`, data)
      toast.success('La catégorie a été ajoutée')
      await fetchCategories()
      return true
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.errors) {
        toast.error('Erreur de validation: ' + error.response.data.errors.map(err => err.msg).join(', '))
      } else {
        toast.error(
          error.response?.data?.message ||
            error.response?.data?.error?.message ||
            "Erreur lors de l'ajout de la catégorie"
        )
      }
      return false
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchComptes()
  }, [fetchCategories, fetchComptes])

  return (
    <ProduitContext.Provider
      value={{
        listCategorie,
        listCompte,
        fetchCategories,
        fetchComptes,
        ajouterProduit,
        rechercherProduits,
        searchAutocompleteProduits,
        ajouterCategorie
      }}
    >
      {children}
    </ProduitContext.Provider>
  )
}
