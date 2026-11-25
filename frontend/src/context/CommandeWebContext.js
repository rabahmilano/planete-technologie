import { createContext, useState, useContext, useCallback } from 'react'
import axios from 'src/configs/axiosConfig'
import toast from 'react-hot-toast'

const CommandeWebContext = createContext()

export const useCommandeWeb = () => useContext(CommandeWebContext)

const messageErreur = error =>
  error.response?.data?.message ||
  error.response?.data?.error?.message ||
  'Une erreur est survenue'

export const CommandeWebProvider = ({ children }) => {
  const [commandes, setCommandes] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchCommandes = useCallback(async (params = {}) => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}commandes-web`, { params })
      setCommandes(Array.isArray(data.commandes) ? data.commandes : [])
      setTotal(data.total || 0)
    } catch (error) {
      toast.error(messageErreur(error))
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCommande = useCallback(async id => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}commandes-web/${id}`)
      
return data
    } catch (error) {
      toast.error(messageErreur(error))
      
return null
    }
  }, [])

  const changerStatut = async (id, data) => {
    try {
      const { data: commande } = await axios.patch(
        `${process.env.NEXT_PUBLIC_BASE_URL}commandes-web/${id}/statut`,
        data
      )
      toast.success('Statut mis à jour')
      
return commande
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.errors) {
        toast.error('Erreur de validation : ' + error.response.data.errors.map(err => err.msg).join(', '))
      } else {
        toast.error(messageErreur(error))
      }
      
return null
    }
  }

  const annulerCommande = async id => {
    try {
      const { data: commande } = await axios.patch(
        `${process.env.NEXT_PUBLIC_BASE_URL}commandes-web/${id}/annuler`
      )
      toast.success('Commande annulée')
      
return commande
    } catch (error) {
      toast.error(messageErreur(error))
      
return null
    }
  }

  const convertirEnVente = async id => {
    try {
      const { data: commande } = await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}commandes-web/${id}/convertir-vente`
      )
      toast.success('Vente créée')
      
return commande
    } catch (error) {
      toast.error(messageErreur(error))
      
return null
    }
  }

  const modifierCommande = async (id, data) => {
    try {
      const { data: commande } = await axios.patch(
        `${process.env.NEXT_PUBLIC_BASE_URL}commandes-web/${id}`,
        data
      )
      toast.success('Commande modifiée')
      
return commande
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.errors) {
        toast.error('Erreur de validation : ' + error.response.data.errors.map(err => err.msg).join(', '))
      } else {
        toast.error(messageErreur(error))
      }
      
return null
    }
  }

  return (
    <CommandeWebContext.Provider
      value={{ commandes, total, loading, fetchCommandes, fetchCommande, changerStatut, annulerCommande, modifierCommande, convertirEnVente }}
    >
      {children}
    </CommandeWebContext.Provider>
  )
}
