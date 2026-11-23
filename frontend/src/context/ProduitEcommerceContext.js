import { createContext, useContext, useCallback } from 'react'
import axios from 'src/configs/axiosConfig'
import toast from 'react-hot-toast'

const ProduitEcommerceContext = createContext()

export const useProduitEcommerce = () => useContext(ProduitEcommerceContext)

const messageErreur = error =>
  error.response?.data?.message ||
  error.response?.data?.error?.message ||
  'Une erreur est survenue'

const erreurValidation = error => {
  if (error.response?.status === 400 && error.response?.data?.errors) {
    toast.error('Erreur de validation : ' + error.response.data.errors.map(err => err.msg).join(', '))
  } else {
    toast.error(messageErreur(error))
  }
}

export const ProduitEcommerceProvider = ({ children }) => {
  const fetchProduitEcommerce = useCallback(async (id, avecAideDecision = false) => {
    try {
      const suffixe = avecAideDecision ? '?aide_decision=1' : ''
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/${id}/ecommerce${suffixe}`)
      
return data
    } catch (error) {
      toast.error(messageErreur(error))
      
return null
    }
  }, [])

  const modifierProduitEcommerce = async (id, data, options = {}) => {
    try {
      const { data: produit } = await axios.patch(
        `${process.env.NEXT_PUBLIC_BASE_URL}produits/${id}/ecommerce`,
        data
      )
      if (!options.silencieux) toast.success('Produit mis à jour')
      
return produit
    } catch (error) {
      erreurValidation(error)
      
return null
    }
  }

  const modifierPrix = async (id, data, options = {}) => {
    try {
      const { data: produit } = await axios.patch(
        `${process.env.NEXT_PUBLIC_BASE_URL}produits/${id}/prix`,
        data
      )
      if (!options.silencieux) toast.success('Prix mis à jour')
      
return produit
    } catch (error) {
      erreurValidation(error)
      
return null
    }
  }

  const fetchHistoriquePrix = useCallback(async id => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/${id}/historique-prix`)
      
return Array.isArray(data) ? data : []
    } catch (error) {
      toast.error(messageErreur(error))
      
return []
    }
  }, [])

  const ajouterImage = async (id, data) => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}produits/${id}/images`, data)
      toast.success('Image ajoutée')
      
return true
    } catch (error) {
      erreurValidation(error)
      
return false
    }
  }

  const uploaderImage = async (id, fichier, ordre_image = 0, nom_image = '', options = {}) => {
    try {
      const donnees = new FormData()
      donnees.append('image', fichier)
      donnees.append('ordre_image', String(ordre_image))
      if (nom_image.trim()) donnees.append('nom_image', nom_image.trim())
      await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}produits/${id}/images/upload`, donnees)
      if (!options.silencieux) toast.success('Image téléversée')
      
return true
    } catch (error) {
      if (!options.silencieux) erreurValidation(error)
      
return false
    }
  }

  const reordonnerImages = async (id, ordre, options = {}) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}produits/${id}/images/ordre`, { ordre })
      if (!options.silencieux) toast.success('Ordre des images mis à jour')
      
return true
    } catch (error) {
      if (!options.silencieux) erreurValidation(error)
      
return false
    }
  }

  const pivoterImage = async (id, idImage) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}produits/${id}/images/${idImage}/rotation`)
      toast.success('Image pivotée')
      
return true
    } catch (error) {
      toast.error(messageErreur(error))
      
return false
    }
  }

  const supprimerImage = async (id, idImage) => {
    try {
      const { data } = await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}produits/${id}/images/${idImage}`)
      toast.success('Image supprimée')
      
return data
    } catch (error) {
      toast.error(messageErreur(error))
      
return false
    }
  }

  const definirImagePrincipale = async (id, idImage, options = {}) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}produits/${id}/images/${idImage}/principale`)
      if (!options.silencieux) toast.success('Image principale définie')
      
return true
    } catch (error) {
      if (!options.silencieux) toast.error(messageErreur(error))
      
return false
    }
  }

  const ajouterPalier = async (id, data) => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}produits/${id}/paliers`, data)
      toast.success('Palier ajouté')
      
return true
    } catch (error) {
      erreurValidation(error)
      
return false
    }
  }

  const modifierPalier = async (id, idPalier, data) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}produits/${id}/paliers/${idPalier}`, data)
      toast.success('Palier modifié')
      
return true
    } catch (error) {
      erreurValidation(error)
      
return false
    }
  }

  const supprimerPalier = async (id, idPalier) => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}produits/${id}/paliers/${idPalier}`)
      toast.success('Palier supprimé')
      
return true
    } catch (error) {
      toast.error(messageErreur(error))
      
return false
    }
  }

  return (
    <ProduitEcommerceContext.Provider
      value={{
        fetchProduitEcommerce,
        modifierProduitEcommerce,
        modifierPrix,
        fetchHistoriquePrix,
        ajouterImage,
        uploaderImage,
        supprimerImage,
        definirImagePrincipale,
        reordonnerImages,
        pivoterImage,
        ajouterPalier,
        modifierPalier,
        supprimerPalier
      }}
    >
      {children}
    </ProduitEcommerceContext.Provider>
  )
}
