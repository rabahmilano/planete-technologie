import { createContext, useState, useContext, useCallback } from 'react'
import axios from 'src/configs/axiosConfig'
import toast from 'react-hot-toast'

const ProduitEcommerceContext = createContext()
export const useProduitEcommerce = () => useContext(ProduitEcommerceContext)

const extraireErreur = error =>
  error.response?.data?.message ||
  error.response?.data?.errors?.map(err => err.msg).join(', ') ||
  error.response?.data?.error?.message ||
  'Une erreur est survenue'

export const ProduitEcommerceProvider = ({ children }) => {
  const [produits, setProduits] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchProduits = useCallback(async (page = 1, limit = 25, filtres = {}) => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/ecommerce/liste`, {
        params: {
          page,
          limit,
          search: filtres.search || '',
          statut: filtres.statut || undefined,
          familleId: filtres.familleId || undefined
        }
      })
      setProduits(data.produits)
      setTotal(data.total)
    } catch (error) {
      toast.error(extraireErreur(error))
    } finally {
      setLoading(false)
    }
  }, [])

  const majProduit = async (id, donnees) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}produits/ecommerce/${id}`, donnees)
      toast.success('Le produit a été mis à jour')
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  const majDescription = async (id, description) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}produits/ecommerce/${id}/description`, {
        description
      })
      toast.success('La description a été enregistrée')
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  const majStatut = async (id, statutPublication) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}produits/ecommerce/${id}/statut`, {
        statutPublication
      })
      toast.success(`Statut changé en ${statutPublication}`)
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  const majPrix = async (id, donnees) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}produits/ecommerce/${id}/prix`, donnees)
      toast.success('Les prix ont été mis à jour')
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  const fetchHistoriquePrix = async id => {
    try {
      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}produits/ecommerce/${id}/historique-prix`
      )
      return data
    } catch (error) {
      toast.error(extraireErreur(error))
      return []
    }
  }

  const fetchImagesProduit = async prdId => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/images`, {
        params: { prd_id: prdId }
      })
      return data
    } catch (error) {
      toast.error(extraireErreur(error))
      return []
    }
  }

  const ajouterImage = async donnees => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}produits/images`, donnees)
      toast.success("L'image a été ajoutée")
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  const supprimerImage = async idImg => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}produits/images/${idImg}`)
      toast.success("L'image a été supprimée")
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  const definirImagePrincipale = async idImg => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}produits/images/${idImg}/principale`)
      toast.success("L'image principale a été définie")
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  const fetchPaliersProduit = async prdId => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/paliers`, {
        params: { prd_id: prdId }
      })
      return data
    } catch (error) {
      toast.error(extraireErreur(error))
      return []
    }
  }

  const ajouterPalier = async donnees => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}produits/paliers`, donnees)
      toast.success('Le palier a été ajouté')
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  const modifierPalier = async (idPalier, donnees) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}produits/paliers/${idPalier}`, donnees)
      toast.success('Le palier a été modifié')
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  const supprimerPalier = async idPalier => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}produits/paliers/${idPalier}`)
      toast.success('Le palier a été supprimé')
      return true
    } catch (error) {
      toast.error(extraireErreur(error))
      return false
    }
  }

  return (
    <ProduitEcommerceContext.Provider
      value={{
        produits,
        total,
        loading,
        fetchProduits,
        majProduit,
        majDescription,
        majStatut,
        majPrix,
        fetchHistoriquePrix,
        fetchImagesProduit,
        ajouterImage,
        supprimerImage,
        definirImagePrincipale,
        fetchPaliersProduit,
        ajouterPalier,
        modifierPalier,
        supprimerPalier
      }}
    >
      {children}
    </ProduitEcommerceContext.Provider>
  )
}
