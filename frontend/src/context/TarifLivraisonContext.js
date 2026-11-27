import { createContext, useState, useContext, useCallback } from 'react'
import axios from 'src/configs/axiosConfig'
import toast from 'react-hot-toast'

const TarifLivraisonContext = createContext()
export const useTarifLivraison = () => useContext(TarifLivraisonContext)

const messageErreur = error =>
  error.response?.data?.message ||
  error.response?.data?.error?.message ||
  'Une erreur est survenue'

// Phase 7 : le contexte ne gère plus la grille de secours (CRUD tarif_livraison,
// supprimée) — uniquement les déclencheurs de synchronisation, le journal, le
// référentiel commune/bureau et la bannière D7.
export const TarifLivraisonProvider = ({ children }) => {
  const [synchroEnCours, setSynchroEnCours] = useState(false)
  const [journal, setJournal] = useState([])
  const [referentiel, setReferentiel] = useState(null)
  const [communesWilaya, setCommunesWilaya] = useState(null)

  // ---- Déclencheurs de synchronisation Yalidine (phase 4) ------------------
  // Le serveur impose une synchro à la fois (409 si déjà en cours) : les
  // boutons sont désactivés par synchroEnCours pendant toute la requête.

  const fetchJournal = useCallback(async () => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}tarifs-livraison/synchronisation/journal`)
      setJournal(Array.isArray(data.journal) ? data.journal : [])
      return data
    } catch (error) {
      toast.error(messageErreur(error))
      return null
    }
  }, [])

  const synchroniserGlobale = useCallback(async () => {
    setSynchroEnCours(true)
    try {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}tarifs-livraison/synchronisation/globale`)
      const enErreur = data.wilayas_erreur?.length || 0
      toast.success(
        `Synchronisation terminée : ${data.communes_ecrites} communes, ${data.bureaux_ecrits} bureaux` +
          (enErreur ? ` — ${enErreur} wilaya(s) en erreur` : '')
      )
      await fetchJournal()
      return data
    } catch (error) {
      toast.error(messageErreur(error))
      return null
    } finally {
      setSynchroEnCours(false)
    }
  }, [fetchJournal])

  const synchroniserWilaya = useCallback(async codeWilaya => {
    setSynchroEnCours(true)
    try {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}tarifs-livraison/synchronisation/wilaya/${codeWilaya}`)
      toast.success(`Wilaya ${codeWilaya} synchronisée : ${data.communes_ecrites} communes, ${data.bureaux_ecrits} bureaux`)
      await fetchJournal()
      return data
    } catch (error) {
      toast.error(messageErreur(error))
      return null
    } finally {
      setSynchroEnCours(false)
    }
  }, [fetchJournal])

  // ---- Lectures du référentiel commune/bureau (phase 5) --------------------
  // La bannière D7 est autonome : fetchDerniereSynchro peut être appelé par
  // la page tarifs ET la page commandes web sans dépendre de ce contexte.

  const fetchDerniereSynchro = useCallback(async () => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}tarifs-livraison/synchronisation/derniere-synchro`)
      return data
    } catch (error) {
      return null
    }
  }, [])

  const fetchReferentiel = useCallback(async () => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}tarifs-livraison/synchronisation/referentiel`)
      setReferentiel(Array.isArray(data.wilayas) ? data.wilayas : [])
      return data
    } catch (error) {
      toast.error(messageErreur(error))
      return null
    }
  }, [])

  const fetchCommunesWilaya = useCallback(async codeWilaya => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}tarifs-livraison/synchronisation/communes/${codeWilaya}`)
      setCommunesWilaya(data)
      return data
    } catch (error) {
      toast.error(messageErreur(error))
      return null
    }
  }, [])

  return (
    <TarifLivraisonContext.Provider
      value={{
        synchroEnCours,
        journal,
        fetchJournal,
        synchroniserGlobale,
        synchroniserWilaya,
        referentiel,
        communesWilaya,
        fetchReferentiel,
        fetchCommunesWilaya,
        fetchDerniereSynchro
      }}
    >
      {children}
    </TarifLivraisonContext.Provider>
  )
}
