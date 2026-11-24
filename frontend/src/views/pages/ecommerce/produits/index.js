import { forwardRef, useEffect, useRef, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Slide,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  FormControlLabel,
  Switch
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import toast from 'react-hot-toast'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import { useDebounce } from 'src/@core/hooks/useDebounce'
import { useProduitDashboard } from 'src/context/ProduitDashboardContext'
import { useProduitEcommerce } from 'src/context/ProduitEcommerceContext'
import { useFamille } from 'src/context/FamilleContext'

const REGEX_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const MESSAGE_FORMAT_SLUG =
  'Format invalide : minuscules a-z, chiffres 0-9 et tirets uniquement, sans accents ni espaces (ex. : chargeur-ugreen-30w)'
const NB_IMAGES_MAX = 7

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction='up' ref={ref} {...props} />
})

// Style des cartes de section : celui des modaux plein écran du projet
// (HistoriqueCrediterDialog, ProductDetailModal) — ombre douce, pas de bordure.
const sxCarteSection = { border: 'none', boxShadow: '0 4px 24px 0 rgba(0,0,0,0.05)', borderRadius: 3 }

// Ligne label/valeur de la carte « Aide à la décision » : libellé à gauche,
// montant aligné à droite, séparateur discret entre les lignes.
const sxLigneAide = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 4,
  py: 1.5
}

const couleurStatut = statut => {
  switch (statut) {
    case 'PUBLIE':
      return 'success'
    case 'ARCHIVE':
      return 'default'
    case 'BROUILLON':
    default:
      return 'warning'
  }
}

const libelleStatut = statut => {
  switch (statut) {
    case 'PUBLIE':
      return 'PUBLIÉ'
    case 'ARCHIVE':
      return 'ARCHIVÉ'
    case 'BROUILLON':
    default:
      return 'BROUILLON'
  }
}

const formaterDate = valeur => {
  if (!valeur) return '—'
  
return new Date(valeur).toLocaleDateString('fr-FR')
}

// Poids en kg, sans zéros inutiles (« 12 kg », « 12,5 kg »).
const formaterKg = kg => {
  if (kg == null || Number.isNaN(kg)) return '—'
  
return `${Number(kg.toFixed(2)).toLocaleString('fr-FR')} kg`
}

// Montants en DZD, toujours avec 2 décimales (« 2 990,00 DZD ») : un seul
// formateur partagé pour tout le modal, fr-FR.
const formaterMontant = valeur => {
  if (valeur == null) return '—'

  return `${Number(valeur).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD`
}

// Style d'en-tête de table du projet (tableau principal de cette page,
// TableauHistorique.js) : fond navy, texte blanc.
const sxEnteteTableau = { backgroundColor: '#0d1b2a' }
const sxCelluleEnteteTableau = { color: 'white' }

const TYPES_IMAGES_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp']
const TAILLE_IMAGE_MAX = 5 * 1024 * 1024

// Applique la rotation au fichier AVANT envoi : l'image arrive déjà
// pivotée sur Cloudinary (canvas → blob → File).
const pivoterFichierLocal = (fichier, rotation) =>
  new Promise((resolve, reject) => {
    if (!rotation) return resolve(fichier)
    const url = URL.createObjectURL(fichier)
    const image = new Image()
    image.onload = () => {
      const echange = rotation === 90 || rotation === 270
      const canvas = document.createElement('canvas')
      canvas.width = echange ? image.height : image.width
      canvas.height = echange ? image.width : image.height
      const ctx = canvas.getContext('2d')
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.drawImage(image, -image.width / 2, -image.height / 2)
      URL.revokeObjectURL(url)
      canvas.toBlob(
        blob => {
          if (blob) resolve(new File([blob], fichier.name, { type: fichier.type }))
          else reject(new Error('Rotation impossible'))
        },
        fichier.type
      )
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Lecture de l’image impossible'))
    }
    image.src = url
  })

const manquantsPourPublication = detail => {
  const manquants = []
  if (!detail?.intitule_publication?.trim()) manquants.push('un intitulé de publication')
  if (!detail?.description) manquants.push('une description')
  if (!detail?.famille_id) manquants.push('une famille')
  if (!detail?.slug_prd) manquants.push('un slug')
  if (detail?.prix_vente == null) manquants.push('un prix de vente')
  if (
    detail?.poids_grammes != null &&
    detail.poids_grammes > 5000 &&
    (detail.longueur_cm == null || detail.largeur_cm == null || detail.hauteur_cm == null)
  ) {
    manquants.push('les dimensions du colis (poids > 5 kg)')
  }
  if ((detail?.images || []).length < 2) manquants.push('au moins 2 images')
  
return manquants
}

const ProduitsEcommerceView = () => {
  const { fetchHistoriquePrix } = useProduitDashboard()

  const {
    fetchProduitEcommerce,
    modifierProduitEcommerce,
    modifierPrix,
    fetchHistoriquePrix: fetchHistoriquePrixVente,
    uploaderImage,
    supprimerImage,
    definirImagePrincipale,
    reordonnerImages,
    pivoterImage,
    ajouterPalier,
    modifierPalier,
    supprimerPalier
  } = useProduitEcommerce()
  const { familles } = useFamille()

  const [produits, setProduits] = useState([])
  const [total, setTotal] = useState(0)
  const [recherche, setRecherche] = useState('')
  const [page, setPage] = useState(0)
  const [lignesParPage, setLignesParPage] = useState(24)
  const [chargement, setChargement] = useState(false)
  const [details, setDetails] = useState({})

  const rechercheDebouncee = useDebounce(recherche, 500)

  useEffect(() => {
    setPage(0)
  }, [rechercheDebouncee])

  const [produitSelectionne, setProduitSelectionne] = useState(null)
  const [onglet, setOnglet] = useState('1')
  const [formInfos, setFormInfos] = useState({})
  const [formPrix, setFormPrix] = useState({})
  const [erreurSlug, setErreurSlug] = useState('')

  // Champs déjà visités : aucune erreur de validation ne s'affiche à
  // l'ouverture du modal — seulement après un blur sur le champ ou une
  // tentative d'enregistrement (qui marque tout).
  const [champsTouches, setChampsTouches] = useState({})
  const marquerChampTouche = nom => setChampsTouches(precedent => ({ ...precedent, [nom]: true }))
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false)
  const [historique, setHistorique] = useState([])
  const [nouveauPalier, setNouveauPalier] = useState({ quantite_min: '', prix_unitaire: '' })
  const [imagesLocales, setImagesLocales] = useState([])
  const [ordreTuiles, setOrdreTuiles] = useState([])
  const [indexSurvole, setIndexSurvole] = useState(null)
  const [messageDepot, setMessageDepot] = useState('')
  const refFichierImage = useRef(null)
  const [publicationEnAttente, setPublicationEnAttente] = useState(null)
  const [publicationEnCours, setPublicationEnCours] = useState(false)
  const [alerteDepublication, setAlerteDepublication] = useState(null)
  const [palierEnEdition, setPalierEnEdition] = useState(null)
  const [formPalier, setFormPalier] = useState({ quantite_min: '', prix_unitaire: '' })
  const [aideDecision, setAideDecision] = useState(null)
  const [ancreFamille, setAncreFamille] = useState(null)
  const [familleDepliee, setFamilleDepliee] = useState(null)

  // Snapshots capturés à l'ouverture : Enregistrer n'appelle que ce qui a changé.
  const initialFormInfos = useRef(null)
  const initialFormPrix = useRef(null)

  const chargerListe = async () => {
    setChargement(true)

    const data = await fetchHistoriquePrix({
      page: page + 1,
      limit: lignesParPage,
      search: rechercheDebouncee.length >= 2 ? rechercheDebouncee : '',
      vue: 'ecommerce'
    })
    const liste = data?.produits || []
    setProduits(liste)
    setTotal(data?.total || 0)
    const enrichis = await Promise.all(liste.map(p => fetchProduitEcommerce(p.id_prd)))
    const parId = {}
    enrichis.forEach(d => {
      if (d) parId[d.id_prd] = d
    })
    setDetails(parId)
    setChargement(false)
  }

  useEffect(() => {
    chargerListe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, lignesParPage, rechercheDebouncee])

  // Normalisation avant comparaison : '' et null valent pareil, les nombres
  // sont comparés en nombres (évite les faux « changé »).
  const normaliserInfos = infos => ({
    description: infos.description || null,
    description_ar: infos.description_ar || null,
    intitule_publication: (infos.intitule_publication || '').trim() || null,
    est_mis_en_avant: Boolean(infos.est_mis_en_avant),
    famille_id: infos.famille_id === '' || infos.famille_id == null ? null : parseInt(infos.famille_id, 10),
    slug_prd: (infos.slug_prd || '').trim() || null,
    poids_grammes: infos.poids_grammes === '' || infos.poids_grammes == null ? null : parseInt(infos.poids_grammes, 10),
    longueur_cm: infos.longueur_cm === '' || infos.longueur_cm == null ? null : parseInt(infos.longueur_cm, 10),
    largeur_cm: infos.largeur_cm === '' || infos.largeur_cm == null ? null : parseInt(infos.largeur_cm, 10),
    hauteur_cm: infos.hauteur_cm === '' || infos.hauteur_cm == null ? null : parseInt(infos.hauteur_cm, 10)
  })

  const normaliserPrix = prix => ({
    prix_vente: prix.prix_vente === '' || prix.prix_vente == null ? null : parseFloat(prix.prix_vente)
  })

  const revoquerImagesLocales = liste => {
    liste.forEach(image => URL.revokeObjectURL(image.urlApercu))
  }

  // Après un enregistrement réussi, le snapshot repart des valeurs
  // enregistrées (sinon le 2e Enregistrer croirait que tout a changé).
  // Les images locales téléversées disparaissent de la file ; celles en
  // échec restent, pour pouvoir réessayer.
  const marquerCommeEnregistre = (detailFrais, localesReussies = []) => {
    initialFormInfos.current = normaliserInfos(formInfos)
    initialFormPrix.current = normaliserPrix(formPrix)
    const reussies = new Set(localesReussies)
    revoquerImagesLocales(imagesLocales.filter(image => reussies.has(image.idLocal)))
    const restantes = imagesLocales.filter(image => !reussies.has(image.idLocal))
    setImagesLocales(restantes)

    const ordreServeur = ((detailFrais || produitSelectionne)?.images || [])
      .slice()
      .sort((a, b) => a.ordre_image - b.ordre_image || a.id_img - b.id_img)
      .map(image => `srv-${image.id_img}`)

    const ordreLocalesRestantes = ordreTuiles.filter(
      cle => cle.startsWith('loc-') && restantes.some(image => `loc-${image.idLocal}` === cle)
    )
    setOrdreTuiles([...ordreServeur, ...ordreLocalesRestantes])
  }

  const fermerDetail = () => {
    revoquerImagesLocales(imagesLocales)
    setImagesLocales([])
    setOrdreTuiles([])
    setAideDecision(null)
    setAncreFamille(null)
    setProduitSelectionne(null)
  }

  const ouvrirDetail = async produit => {
    const detail = details[produit.id_prd] || (await fetchProduitEcommerce(produit.id_prd))
    if (!detail) return
    revoquerImagesLocales(imagesLocales)
    setImagesLocales([])
    setDetails(prev => ({ ...prev, [detail.id_prd]: detail }))
    setProduitSelectionne(detail)

    const infos = {
      description: detail.description || '',
      description_ar: detail.description_ar || '',
      intitule_publication: detail.intitule_publication || '',
      est_mis_en_avant: Boolean(detail.est_mis_en_avant),
      famille_id: detail.famille_id ?? '',
      slug_prd: detail.slug_prd || '',
      poids_grammes: detail.poids_grammes ?? '',
      longueur_cm: detail.longueur_cm ?? '',
      largeur_cm: detail.largeur_cm ?? '',
      hauteur_cm: detail.hauteur_cm ?? ''
    }
    setFormInfos(infos)
    initialFormInfos.current = normaliserInfos(infos)
    const prix = { prix_vente: detail.prix_vente ?? '' }
    setFormPrix(prix)
    initialFormPrix.current = normaliserPrix(prix)
    setOrdreTuiles((detail.images || []).map(image => `srv-${image.id_img}`))
    setErreurSlug('')
    setChampsTouches({})
    setAlerteDepublication(null)
    setPalierEnEdition(null)
    setHistorique(detail.historiques_prix_vente || [])
    setNouveauPalier({ quantite_min: '', prix_unitaire: '' })
    setMessageDepot('')
    setIndexSurvole(null)
    setOnglet('1')

    // Aide à la décision : uniquement à l'ouverture du modal, jamais dans
    // le chargement de la liste.
    setAideDecision(null)
    const detailComplet = await fetchProduitEcommerce(produit.id_prd, true)
    if (detailComplet?.aide_decision) setAideDecision(detailComplet.aide_decision)
  }

  const rafraichirDetail = async id => {
    const detail = await fetchProduitEcommerce(id)
    if (!detail) return null
    setDetails(prev => ({ ...prev, [detail.id_prd]: detail }))
    setProduitSelectionne(detail)
    setHistorique(detail.historiques_prix_vente || [])
    
return detail
  }

  const basculerPublication = async () => {
    const produit = publicationEnAttente
    if (!produit || publicationEnCours) return
    const detail = details[produit.id_prd]
    const actuel = detail?.statut_publication || produit.statut_publication || 'BROUILLON'
    const suivant = actuel === 'PUBLIE' ? 'BROUILLON' : 'PUBLIE'
    setPublicationEnCours(true)
    try {
      const misAJour = await modifierProduitEcommerce(
        produit.id_prd,
        { statut_publication: suivant },
        { silencieux: true }
      )
      if (misAJour) {
        setDetails(prev => ({ ...prev, [produit.id_prd]: { ...prev[produit.id_prd], statut_publication: suivant } }))
        setProduits(prev => prev.map(p => (p.id_prd === produit.id_prd ? { ...p, statut_publication: suivant } : p)))
        toast.success(
          suivant === 'PUBLIE' ? 'Produit publié — visible dans la boutique' : 'Produit retiré de la boutique'
        )
        setPublicationEnAttente(null)
      }
    } finally {
      setPublicationEnCours(false)
    }
  }

  const changerSlugProduit = valeur => {
    setFormInfos({ ...formInfos, slug_prd: valeur })
    if (erreurSlug) setErreurSlug('')
  }

  // Validation du slug au blur (jamais à l'ouverture) : l'erreur ne
  // s'affiche qu'après interaction avec le champ ou tentative d'enregistrement.
  const validerSlugProduit = () => {
    const slugSaisi = (formInfos.slug_prd || '').trim()
    setErreurSlug(slugSaisi && !REGEX_SLUG.test(slugSaisi) ? MESSAGE_FORMAT_SLUG : '')
  }

  // Liste fusionnée (images serveur triées + images locales), dans l'ordre
  // choisi par l'admin. Les clés absentes (image supprimée entre-temps)
  // sont ignorées, les nouvelles sont ajoutées à la fin.
  const tuilesFusionnees = () => {
    const serveurTriees = (produitSelectionne?.images || [])
      .slice()
      .sort((a, b) => a.ordre_image - b.ordre_image || a.id_img - b.id_img)
    const parCle = new Map()
    serveurTriees.forEach(image => parCle.set(`srv-${image.id_img}`, { type: 'serveur', image }))
    imagesLocales.forEach(image => parCle.set(`loc-${image.idLocal}`, { type: 'locale', image }))
    const ordonnees = ordreTuiles.map(cle => parCle.get(cle)).filter(Boolean)
    const dejaVues = new Set(ordonnees.map(tuile => (tuile.type === 'serveur' ? `srv-${tuile.image.id_img}` : `loc-${tuile.image.idLocal}`)))
    parCle.forEach((tuile, cle) => {
      if (!dejaVues.has(cle)) ordonnees.push(tuile)
    })
    
return ordonnees
  }

  const enregistrerTout = async () => {
    if (!produitSelectionne || enregistrementEnCours) return

    // Tentative d'action : les erreurs de validation s'affichent désormais.
    setChampsTouches({ intitule: true, slug: true, prix: true })
    const slugSaisi = (formInfos.slug_prd || '').trim()
    if (slugSaisi && !REGEX_SLUG.test(slugSaisi)) {
      setErreurSlug(MESSAGE_FORMAT_SLUG)
      setOnglet('1')
      
return
    }
    const donneesInfos = normaliserInfos(formInfos)
    const donneesPrix = normaliserPrix(formPrix)
    const infosOntChange = JSON.stringify(donneesInfos) !== JSON.stringify(initialFormInfos.current)
    const prixAChange = JSON.stringify(donneesPrix) !== JSON.stringify(initialFormPrix.current)
    const tuiles = tuilesFusionnees()
    const locales = tuiles.filter(tuile => tuile.type === 'locale')

    const ordreServeurInitial = (produitSelectionne.images || [])
      .slice()
      .sort((a, b) => a.ordre_image - b.ordre_image || a.id_img - b.id_img)
      .map(image => image.id_img)
    const ordreServeurFinal = tuiles.filter(tuile => tuile.type === 'serveur').map(tuile => tuile.image.id_img)

    const ordreAChange =
      locales.length > 0 ||
      JSON.stringify(ordreServeurFinal) !== JSON.stringify(ordreServeurInitial)
    if (!infosOntChange && !prixAChange && locales.length === 0 && !ordreAChange) return
    setEnregistrementEnCours(true)
    let depublication = null
    let echecUpload = 0
    try {
      if (infosOntChange) {
        const infosAJour = await modifierProduitEcommerce(produitSelectionne.id_prd, donneesInfos, {
          silencieux: true
        })
        if (!infosAJour) return
        depublication = infosAJour.depublication_auto || null
      }
      if (prixAChange) {
        const prixAJour = await modifierPrix(produitSelectionne.id_prd, donneesPrix, { silencieux: true })
        if (!prixAJour) return
        depublication = depublication || prixAJour.depublication_auto || null
      }

      // Upload des images locales, image par image, dans l'ordre final
      // fusionné (rotation appliquée au fichier avant envoi).
      const localesReussies = []
      if (locales.length > 0) {
        const idsServeurAvant = new Set((produitSelectionne.images || []).map(image => image.id_img))
        let televersees = 0
        for (const tuile of tuiles) {
          if (tuile.type !== 'locale') continue
          const indexFinal = tuiles.indexOf(tuile)
          try {
            const fichier = await pivoterFichierLocal(tuile.image.file, tuile.image.rotation)

            const ok = await uploaderImage(produitSelectionne.id_prd, fichier, indexFinal, tuile.image.nom, {
              silencieux: true
            })
            if (ok) {
              televersees += 1
              localesReussies.push(tuile.image.idLocal)
            } else echecUpload += 1
          } catch (error) {
            echecUpload += 1
          }
        }
        if (televersees > 0) {
          const detailApresUpload = await fetchProduitEcommerce(produitSelectionne.id_prd)
          if (detailApresUpload) {
            setDetails(prev => ({ ...prev, [detailApresUpload.id_prd]: detailApresUpload }))
            setProduitSelectionne(detailApresUpload)
            setHistorique(detailApresUpload.historiques_prix_vente || [])


            // Les nouvelles images sont celles absentes avant l'upload,
            // dans l'ordre des ordre_image envoyés (= ordre des locales).
            const nouvelles = (detailApresUpload.images || [])
              .filter(image => !idsServeurAvant.has(image.id_img))
              .sort((a, b) => a.ordre_image - b.ordre_image || a.id_img - b.id_img)
            const ordreComplet = []
            let indexNouvelle = 0
            tuiles.forEach(tuile => {
              if (tuile.type === 'serveur') ordreComplet.push(tuile.image.id_img)
              else if (nouvelles[indexNouvelle]) {
                ordreComplet.push(nouvelles[indexNouvelle].id_img)
                indexNouvelle += 1
              }
            })

            const ordreActuel = (detailApresUpload.images || [])
              .slice()
              .sort((a, b) => a.ordre_image - b.ordre_image || a.id_img - b.id_img)
              .map(image => image.id_img)
            if (JSON.stringify(ordreComplet) !== JSON.stringify(ordreActuel)) {
              await reordonnerImages(
                produitSelectionne.id_prd,
                ordreComplet.map((id_img, i) => ({ id_img, ordre_image: i })),
                { silencieux: true }
              )
            }

            // La 1re image de l'ordre final est une locale : elle devient
            // l'image principale.
            if (tuiles[0]?.type === 'locale' && nouvelles.length > 0) {
              const ordreFinalTrie = [...ordreComplet]
              const idPrincipale = ordreFinalTrie[0]
              if (idPrincipale) {
                await definirImagePrincipale(produitSelectionne.id_prd, idPrincipale, { silencieux: true })
              }
            }
          }
        }
      } else if (ordreAChange) {
        await reordonnerImages(
          produitSelectionne.id_prd,
          ordreServeurFinal.map((id_img, i) => ({ id_img, ordre_image: i })),
          { silencieux: true }
        )
      }
      const detailFrais = await rafraichirDetail(produitSelectionne.id_prd)
      await chargerListe()
      if (echecUpload > 0) {
        const reussies = locales.length - echecUpload
        toast.error(
          `${reussies} image${reussies !== 1 ? 's' : ''} sur ${locales.length} téléversée${
            locales.length !== 1 ? 's' : ''
          }`
        )
      } else {
        toast.success('Modifications enregistrées')
      }
      if (depublication) {
        // Le produit vient d'être dépublié automatiquement : on garde le
        // modal ouvert pour que l'admin voie la raison et puisse corriger.
        setAlerteDepublication(depublication.manquants)
      }
      marquerCommeEnregistre(detailFrais, localesReussies)
    } finally {
      setEnregistrementEnCours(false)
    }
  }

  const ajouterFichiersImages = fichiers => {
    const liste = Array.from(fichiers || [])
    if (liste.length === 0) return
    const placesRestantes = NB_IMAGES_MAX - (produitSelectionne?.images || []).length - imagesLocales.length
    const rejets = []
    const acceptees = []
    liste.forEach(fichier => {
      if (!TYPES_IMAGES_ACCEPTES.includes(fichier.type)) {
        rejets.push(`${fichier.name} : format non accepté`)
      } else if (fichier.size > TAILLE_IMAGE_MAX) {
        rejets.push(`${fichier.name} : plus de 5 Mo`)
      } else if (acceptees.length >= placesRestantes) {
        rejets.push(`${fichier.name} : plafond de ${NB_IMAGES_MAX} images atteint`)
      } else {
        acceptees.push(fichier)
      }
    })
    if (acceptees.length > 0) {
      const nouvelles = acceptees.map((fichier, index) => ({
        idLocal: `${Date.now()}-${index}-${fichier.name}`,
        file: fichier,
        urlApercu: URL.createObjectURL(fichier),
        nom: fichier.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]+/g, '-').toLowerCase(),
        rotation: 0
      }))
      setImagesLocales(prev => [...prev, ...nouvelles])
      setOrdreTuiles(prev => [...prev, ...nouvelles.map(image => `loc-${image.idLocal}`)])
      setMessageDepot('')
    }
    if (rejets.length > 0) {
      setMessageDepot(rejets.join(' — '))
      toast.error(rejets.join(' — '))
    }
  }

  const retirerImageLocale = imageLocale => {
    URL.revokeObjectURL(imageLocale.urlApercu)
    setImagesLocales(prev => prev.filter(image => image.idLocal !== imageLocale.idLocal))
    setOrdreTuiles(prev => prev.filter(cle => cle !== `loc-${imageLocale.idLocal}`))
  }

  const pivoterImageLocale = imageLocale => {
    setImagesLocales(prev =>
      prev.map(image =>
        image.idLocal === imageLocale.idLocal ? { ...image, rotation: (image.rotation + 90) % 360 } : image
      )
    )
  }

  const deplacerTuileParGlisser = (indexSource, indexCible) => {
    if (indexCible === indexSource || indexCible < 0) return
    const tuiles = tuilesFusionnees()
    if (indexCible >= tuiles.length) return
    const cles = tuiles.map(tuile => (tuile.type === 'serveur' ? `srv-${tuile.image.id_img}` : `loc-${tuile.image.idLocal}`))
    const [deplacee] = cles.splice(indexSource, 1)
    cles.splice(indexCible, 0, deplacee)
    setOrdreTuiles(cles)
    setIndexSurvole(null)
  }

  const statutAffiche = produit => {
    const detail = details[produit.id_prd]
    
return detail?.statut_publication || produit.statut_publication || 'BROUILLON'
  }

  const aPublier = publicationEnAttente ? statutAffiche(publicationEnAttente) !== 'PUBLIE' : false

  const tuiles = produitSelectionne ? tuilesFusionnees() : []
  const nbImagesTotal = tuiles.length

  // Poids volumétrique / facturé, recalculé à chaque frappe.
  const dimensionsSaisies =
    formInfos.longueur_cm !== '' &&
    formInfos.longueur_cm != null &&
    formInfos.largeur_cm !== '' &&
    formInfos.largeur_cm != null &&
    formInfos.hauteur_cm !== '' &&
    formInfos.hauteur_cm != null

  const poidsVolumetriqueKg = dimensionsSaisies
    ? (parseInt(formInfos.longueur_cm, 10) * parseInt(formInfos.largeur_cm, 10) * parseInt(formInfos.hauteur_cm, 10)) /
      5000
    : null

  // Poids réel saisi. Le défaut de 200 g est stocké sur le produit à
  // l'enregistrement : un champ vide vaut « — » ici.
  const poidsReelKg =
    formInfos.poids_grammes === '' || formInfos.poids_grammes == null
      ? null
      : parseInt(formInfos.poids_grammes, 10) / 1000

  const poidsFactureKg =
    poidsReelKg == null
      ? poidsVolumetriqueKg
      : poidsVolumetriqueKg == null
        ? poidsReelKg
        : Math.max(poidsReelKg, poidsVolumetriqueKg)
  const intituleVide = !(formInfos.intitule_publication || '').trim()

  const prixVide = formPrix.prix_vente === '' || formPrix.prix_vente == null

  // Checklist Publication, en direct sur le formulaire (pas seulement les
  // valeurs enregistrées) : chaque condition affiche son état actuel.
  const conditionsPublication = (() => {
    const detailCourant = {
      ...produitSelectionne,
      intitule_publication: formInfos.intitule_publication,
      description: formInfos.description,
      famille_id: formInfos.famille_id === '' || formInfos.famille_id == null ? null : formInfos.famille_id,
      slug_prd: formInfos.slug_prd,
      prix_vente: formPrix.prix_vente === '' || formPrix.prix_vente == null ? null : formPrix.prix_vente,
      poids_grammes:
        formInfos.poids_grammes === '' || formInfos.poids_grammes == null
          ? null
          : parseInt(formInfos.poids_grammes, 10),
      longueur_cm:
        formInfos.longueur_cm === '' || formInfos.longueur_cm == null
          ? null
          : parseInt(formInfos.longueur_cm, 10),
      largeur_cm:
        formInfos.largeur_cm === '' || formInfos.largeur_cm == null ? null : parseInt(formInfos.largeur_cm, 10),
      hauteur_cm:
        formInfos.hauteur_cm === '' || formInfos.hauteur_cm == null ? null : parseInt(formInfos.hauteur_cm, 10),
      images: tuiles
    }
    const manquants = manquantsPourPublication(detailCourant)

    const lignes = [
      {
        cle: 'intitule',
        libelle: 'Intitulé de publication',
        manquant: manquants.includes('un intitulé de publication')
      },
      { cle: 'description', libelle: 'Description', manquant: manquants.includes('une description') },
      { cle: 'famille', libelle: 'Famille', manquant: manquants.includes('une famille') },
      { cle: 'slug', libelle: 'Slug', manquant: manquants.includes('un slug') },
      { cle: 'prix', libelle: 'Prix de vente', manquant: manquants.includes('un prix de vente') },
      { cle: 'images', libelle: 'Au moins 2 images', manquant: manquants.includes('au moins 2 images') }
    ]

    // 7e condition, seulement quand elle s'applique (poids > 5 kg).
    if (detailCourant.poids_grammes != null && detailCourant.poids_grammes > 5000) {
      lignes.push({
        cle: 'dimensions',
        libelle: 'Dimensions du colis (poids > 5 kg)',
        manquant: manquants.includes('les dimensions du colis (poids > 5 kg)')
      })
    }

    return lignes
  })()

  // Marge moyenne : vente moyenne − achat moyen TTC, uniquement à partir
  // des deux valeurs affichées (« — » si l'une manque).
  const margeMoyenne =
    aideDecision?.prix_achat_dzd_moyen != null && aideDecision?.prix_vente_moyen != null
      ? Number(aideDecision.prix_vente_moyen) - Number(aideDecision.prix_achat_dzd_moyen)
      : null

  // Nom affiché dans le sélecteur famille (parent + sous-familles, 2 niveaux max).
  const nomFamilleSelectionnee = () => {
    if (formInfos.famille_id === '' || formInfos.famille_id == null) return 'Aucune'
    const id = parseInt(formInfos.famille_id, 10)
    for (const parent of familles) {
      if (parent.id_famille === id) return parent.nom_famille
      const enfant = (parent.sous_familles || []).find(f => f.id_famille === id)
      if (enfant) return `${parent.nom_famille} › ${enfant.nom_famille}`
    }
    
return 'Aucune'
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Typography variant='h5'>Produits e-commerce</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
          Gérez la publication, les prix, les images et les paliers des produits de la boutique.
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <TextField
          size='small'
          sx={{ minWidth: 320 }}
          autoComplete='off'
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          placeholder='Rechercher un produit...'
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <Icon icon='tabler:search' fontSize='1.25rem' />
              </InputAdornment>
            ),
            endAdornment: recherche ? (
              <InputAdornment position='end'>
                <Tooltip title='Effacer la recherche'>
                  <IconButton size='small' onClick={() => setRecherche('')} edge='end' aria-label='Effacer la recherche'>
                    <Icon icon='tabler:x' fontSize='1.25rem' />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ) : null
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3, position: 'relative' }}>
          {chargement && <LinearProgress sx={{ position: 'absolute', top: 0, width: '100%', zIndex: 1 }} />}
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
                  <TableCell sx={{ color: 'white' }}>Produit</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Stock</TableCell>
                  <TableCell sx={{ color: 'white' }}>Famille</TableCell>
                  <TableCell sx={{ color: 'white' }} align='right'>Prix effectif</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Publication</TableCell>
                  <TableCell sx={{ color: 'white' }} align='right'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {produits.length === 0 && !chargement ? (
                  <TableRow>
                    <TableCell colSpan={6} align='center'>
                      <Typography sx={{ p: 4 }}>Aucun produit trouvé.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  produits.map(produit => {
                    const detail = details[produit.id_prd]
                    const manquants = manquantsPourPublication(detail)
                    const estPublie = statutAffiche(produit) === 'PUBLIE'

                    // Dépublier est toujours autorisé : seul Publier exige les conditions.
                    const publicationBloquee = !estPublie && manquants.length > 0
                    
return (
                      <TableRow key={produit.id_prd} hover>
                        <TableCell>
                          <Typography sx={{ fontWeight: 600 }}>{produit.designation_prd}</Typography>
                          {(detail?.promo_active || detail?.est_mis_en_avant) && (
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                              {detail?.promo_active && (
                                <Chip label='Promo' color='warning' variant='outlined' size='small' />
                              )}
                              {detail?.est_mis_en_avant && (
                                <Chip label='Mis en avant' color='primary' variant='outlined' size='small' />
                              )}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell align='center'>
                          {produit.qte_dispo == null ? (
                            '—'
                          ) : produit.qte_dispo > 0 ? (
                            produit.qte_dispo
                          ) : (
                            <Chip label='Rupture' color='error' size='small' />
                          )}
                        </TableCell>
                        <TableCell>{detail?.famille?.nom_famille || '—'}</TableCell>
                        <TableCell align='right'>{formaterMontant(detail?.prix_effectif)}</TableCell>
                        <TableCell align='center'>
                          <Chip
                            label={libelleStatut(statutAffiche(produit))}
                            color={couleurStatut(statutAffiche(produit))}
                            size='small'
                          />
                        </TableCell>
                        <TableCell align='right' sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip
                            title={
                              publicationBloquee
                                ? `Publication impossible, il manque : ${manquants.join(', ')}`
                                : estPublie
                                  ? 'Dépublier'
                                  : 'Publier'
                            }
                          >
                            <span>
                              <IconButton
                                size='small'
                                color={estPublie ? 'warning' : 'success'}
                                disabled={publicationBloquee}
                                aria-label={
                                  estPublie
                                    ? `Dépublier ${produit.designation_prd}`
                                    : `Publier ${produit.designation_prd}`
                                }
                                onClick={() => setPublicationEnAttente(produit)}
                              >
                                <Icon icon={estPublie ? 'tabler:eye-off' : 'tabler:eye'} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={`Gérer ${produit.designation_prd}`}>
                            <IconButton
                              size='small'
                              sx={{ ml: 1 }}
                              aria-label={`Gérer ${produit.designation_prd}`}
                              onClick={() => ouvrirDetail(produit)}
                            >
                              <Icon icon='tabler:edit' />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component='div'
            count={total}
            page={page}
            rowsPerPage={lignesParPage}
            rowsPerPageOptions={[12, 24, 50]}
            onPageChange={(event, nouvellePage) => setPage(nouvellePage)}
            onRowsPerPageChange={event => {
              setLignesParPage(parseInt(event.target.value, 10))
              setPage(0)
            }}
            labelRowsPerPage='Lignes par page'
          />
        </Card>
      </Grid>

      <Dialog
        open={Boolean(produitSelectionne)}
        onClose={fermerDetail}
        fullScreen
        TransitionComponent={Transition}
        sx={{ '& .MuiDialog-paper': { backgroundColor: '#f8f9fa' } }}
      >
        <AppBar sx={{ position: 'relative', backgroundColor: '#0d1b2a', boxShadow: 3, flexShrink: 0 }}>
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Icon icon='tabler:edit' color='white' />
              <Box>
                <Typography variant='h6' color='white' sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {produitSelectionne?.designation_prd}
                  <Chip
                    label={libelleStatut(produitSelectionne?.statut_publication)}
                    color={couleurStatut(produitSelectionne?.statut_publication)}
                    size='small'
                  />
                </Typography>
                {produitSelectionne?.prix_effectif != null && (
                  <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Prix effectif : {formaterMontant(produitSelectionne.prix_effectif)}
                    {produitSelectionne.promo_active ? ' (promo active)' : ''}
                  </Typography>
                )}
              </Box>
            </Box>
            <IconButton edge='end' color='inherit' onClick={fermerDetail} aria-label='Fermer'>
              <Icon icon='tabler:x' color='white' />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Box sx={{ px: 6, backgroundColor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={onglet} onChange={(event, valeur) => setOnglet(valeur)}>
            <Tab value='1' label='Info' icon={<Icon icon='tabler:info-circle' />} iconPosition='start' />
            <Tab value='2' label='Prix' icon={<Icon icon='tabler:currency-dollar' />} iconPosition='start' />
            <Tab value='3' label='Images' icon={<Icon icon='tabler:photo' />} iconPosition='start' />
          </Tabs>
        </Box>
        <DialogContent sx={{ p: { xs: 4, md: 8 }, maxWidth: 1400, margin: '0 auto', width: '100%' }}>
          {alerteDepublication && (
            <Alert severity='warning' sx={{ mb: 6 }} onClose={() => setAlerteDepublication(null)}>
              Produit dépublié automatiquement : il manque {alerteDepublication.join(', ')}.
            </Alert>
          )}
          <Grid container spacing={6}>

            {onglet === '1' && (
              <>
                <Grid item xs={12}>
                  <Card sx={sxCarteSection}>
                    <CardHeader
                      title='Produit'
                      action={
                        <FormControlLabel
                          control={
                            <Switch
                              checked={Boolean(formInfos.est_mis_en_avant)}
                              onChange={e => setFormInfos({ ...formInfos, est_mis_en_avant: e.target.checked })}
                            />
                          }
                          label='Mettre en avant'
                        />
                      }
                    />
                    <CardContent>
                      <Grid container spacing={6}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label='Intitulé de publication'
                            autoComplete='off'
                            required
                            error={Boolean(champsTouches.intitule) && intituleVide}
                            helperText={
                              Boolean(champsTouches.intitule) && intituleVide
                                ? 'Intitulé requis pour publier.'
                                : 'S’affiche dans la boutique.'
                            }
                            inputProps={{ maxLength: 150 }}
                            value={formInfos.intitule_publication || ''}
                            onChange={e => setFormInfos({ ...formInfos, intitule_publication: e.target.value })}
                            onBlur={() => marquerChampTouche('intitule')}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label='Slug (URL boutique)'
                            autoComplete='off'
                            required
                            error={Boolean(erreurSlug)}
                            helperText={erreurSlug || 'Minuscules a-z, chiffres 0-9 et tirets uniquement'}
                            value={formInfos.slug_prd || ''}
                            onChange={e => changerSlugProduit(e.target.value)}
                            onBlur={validerSlugProduit}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label='Famille'
                            autoComplete='off'
                            value={nomFamilleSelectionnee()}
                            InputProps={{
                              readOnly: true,
                              endAdornment: (
                                <InputAdornment position='end'>
                                  <Icon icon='tabler:chevron-down' />
                                </InputAdornment>
                              )
                            }}
                            onClick={e => setAncreFamille(e.currentTarget)}
                          />
                          <Popover
                            open={Boolean(ancreFamille)}
                            anchorEl={ancreFamille}
                            onClose={() => setAncreFamille(null)}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                            PaperProps={{ sx: { width: 360, maxHeight: 480, overflow: 'auto' } }}
                          >
                            <List dense>
                              <ListItemButton
                                selected={formInfos.famille_id === '' || formInfos.famille_id == null}
                                onClick={() => {
                                  setFormInfos({ ...formInfos, famille_id: '' })
                                  setAncreFamille(null)
                                }}
                              >
                                <ListItemText primary='Aucune' />
                              </ListItemButton>
                              {familles.map(parent => {
                                const enfants = parent.sous_familles || []
                                if (enfants.length === 0) {
                                  return (
                                    <ListItemButton
                                      key={parent.id_famille}
                                      selected={parseInt(formInfos.famille_id, 10) === parent.id_famille}
                                      onClick={() => {
                                        setFormInfos({ ...formInfos, famille_id: parent.id_famille })
                                        setAncreFamille(null)
                                      }}
                                    >
                                      <ListItemText primary={parent.nom_famille} />
                                    </ListItemButton>
                                  )
                                }
                                const deplie = familleDepliee === parent.id_famille
                                
return (
                                  <Accordion
                                    key={parent.id_famille}
                                    expanded={deplie}
                                    onChange={() => setFamilleDepliee(deplie ? null : parent.id_famille)}
                                    disableGutters
                                    elevation={0}
                                    sx={{ '&:before': { display: 'none' } }}
                                  >
                                    <AccordionSummary
                                      expandIcon={<Icon icon='tabler:chevron-down' />}
                                      sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 1 } }}
                                    >
                                      <Typography
                                        component='button'
                                        type='button'
                                        variant='body2'
                                        onClick={e => {
                                          e.stopPropagation()
                                          setFormInfos({ ...formInfos, famille_id: parent.id_famille })
                                          setAncreFamille(null)
                                        }}
                                        sx={{
                                          background: 'none',
                                          border: 'none',
                                          cursor: 'pointer',
                                          p: 0,
                                          textAlign: 'left',
                                          fontWeight:
                                            parseInt(formInfos.famille_id, 10) === parent.id_famille ? 600 : 400
                                        }}
                                      >
                                        {parent.nom_famille}
                                      </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ p: 0, pl: 4 }}>
                                      {enfants.map(enfant => (
                                        <ListItemButton
                                          key={enfant.id_famille}
                                          selected={parseInt(formInfos.famille_id, 10) === enfant.id_famille}
                                          onClick={() => {
                                            setFormInfos({ ...formInfos, famille_id: enfant.id_famille })
                                            setAncreFamille(null)
                                          }}
                                        >
                                          <ListItemText primary={enfant.nom_famille} />
                                        </ListItemButton>
                                      ))}
                                    </AccordionDetails>
                                  </Accordion>
                                )
                              })}
                            </List>
                          </Popover>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Grid container spacing={3}>
                            <Grid item xs={12} sm={3}>
                              <TextField
                                fullWidth
                                label='Poids (grammes)'
                                type='number'
                                autoComplete='off'
                                value={formInfos.poids_grammes ?? ''}
                                onChange={e => setFormInfos({ ...formInfos, poids_grammes: e.target.value })}
                              />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <TextField
                                fullWidth
                                label='Longueur (cm)'
                                type='number'
                                autoComplete='off'
                                value={formInfos.longueur_cm ?? ''}
                                onChange={e => setFormInfos({ ...formInfos, longueur_cm: e.target.value })}
                              />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <TextField
                                fullWidth
                                label='Largeur (cm)'
                                type='number'
                                autoComplete='off'
                                value={formInfos.largeur_cm ?? ''}
                                onChange={e => setFormInfos({ ...formInfos, largeur_cm: e.target.value })}
                              />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <TextField
                                fullWidth
                                label='Hauteur (cm)'
                                type='number'
                                autoComplete='off'
                                value={formInfos.hauteur_cm ?? ''}
                                onChange={e => setFormInfos({ ...formInfos, hauteur_cm: e.target.value })}
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <Typography variant='body2' color='text.secondary'>
                                Poids volumétrique : {formaterKg(poidsVolumetriqueKg)} — Poids facturé :{' '}
                                {formaterKg(poidsFactureKg)}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card sx={sxCarteSection}>
                    <CardHeader
                      title='Descriptions'
                      subheader="La description s'affiche sur la fiche produit. La version arabe s'affiche quand le client choisit l'arabe, sinon la française."
                    />
                    <CardContent>
                      <Grid container spacing={6}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            multiline
                            rows={12}
                            label='Description'
                            autoComplete='off'
                            value={formInfos.description || ''}
                            onChange={e => setFormInfos({ ...formInfos, description: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            multiline
                            rows={12}
                            label='Description (arabe, optionnel)'
                            autoComplete='off'
                            value={formInfos.description_ar || ''}
                            onChange={e => setFormInfos({ ...formInfos, description_ar: e.target.value })}
                            inputProps={{ dir: 'rtl', lang: 'ar' }}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card sx={sxCarteSection}>
                    <CardHeader title='Publication' />
                    <CardContent>
                      <Box data-testid='checklist-publication'>
                        {conditionsPublication.map(condition => (
                          <Box
                            key={condition.cle}
                            data-testid={`condition-${condition.cle}`}
                            data-etat={condition.manquant ? 'manquant' : 'rempli'}
                            sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}
                          >
                            <Box
                              sx={{
                                color: condition.manquant ? 'error.main' : 'success.main',
                                display: 'flex'
                              }}
                            >
                              <Icon icon={condition.manquant ? 'tabler:x' : 'tabler:check'} />
                            </Box>
                            <Typography variant='body2'>{condition.libelle}</Typography>
                          </Box>
                        ))}
                        <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                          Si une condition n’est plus remplie, le produit est dépublié automatiquement.
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}

            {onglet === '2' && (
              <>
                <Grid
                  item
                  xs={12}
                  md={6}
                  data-testid='colonne-prix-gauche'
                  sx={{ display: 'flex', flexDirection: 'column' }}
                >
                  <Card sx={sxCarteSection}>
                    <CardHeader
                      title='Prix de vente'
                      subheader="Chaque changement est enregistré automatiquement dans l'historique ci-dessous."
                    />
                    <CardContent>
                      <Grid container spacing={6}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label='Prix de vente (DZD)'
                            type='number'
                            autoComplete='off'
                            required
                            error={Boolean(champsTouches.prix) && prixVide}
                            helperText={
                              Boolean(champsTouches.prix) && prixVide ? 'Prix requis pour publier.' : undefined
                            }
                            value={formPrix.prix_vente ?? ''}
                            onChange={e => setFormPrix({ ...formPrix, prix_vente: e.target.value })}
                            onBlur={() => marquerChampTouche('prix')}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                  <Card sx={{ ...sxCarteSection, flex: 1, mt: 6 }}>
                    <CardHeader
                      title='Paliers de prix par quantité'
                      subheader="Chaque palier fixe le prix UNITAIRE appliqué à partir d'une quantité (prix dégressifs). Le palier avec la plus grande quantité atteinte s'applique."
                    />
                    <CardContent>
                      <TableContainer>
                        <Table size='small'>
                          <TableHead>
                            <TableRow sx={sxEnteteTableau}>
                              <TableCell align='center' sx={sxCelluleEnteteTableau}>
                                Quantité minimum
                              </TableCell>
                              <TableCell align='right' sx={sxCelluleEnteteTableau}>
                                Prix unitaire appliqué
                              </TableCell>
                              <TableCell align='center' sx={sxCelluleEnteteTableau}>
                                Actions
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(produitSelectionne?.paliers || []).map(palier => (
                              <TableRow key={palier.id_palier}>
                                {palierEnEdition === palier.id_palier ? (
                                  <>
                                    <TableCell align='center'>
                                      <TextField
                                        size='small'
                                        type='number'
                                        value={formPalier.quantite_min}
                                        onChange={e =>
                                          setFormPalier({ ...formPalier, quantite_min: e.target.value })
                                        }
                                        inputProps={{ min: 1, 'aria-label': 'Quantité minimum du palier' }}
                                        sx={{ width: 90 }}
                                      />
                                    </TableCell>
                                    <TableCell align='right'>
                                      <TextField
                                        size='small'
                                        type='number'
                                        value={formPalier.prix_unitaire}
                                        onChange={e =>
                                          setFormPalier({ ...formPalier, prix_unitaire: e.target.value })
                                        }
                                        inputProps={{ min: 0, step: 'any', 'aria-label': 'Prix unitaire du palier' }}
                                        sx={{ width: 110 }}
                                      />
                                    </TableCell>
                                    <TableCell align='center'>
                                      <Tooltip title='Enregistrer'>
                                        <IconButton
                                          size='small'
                                          color='success'
                                          aria-label='Enregistrer le palier'
                                          disabled={!formPalier.quantite_min || !formPalier.prix_unitaire}
                                          onClick={async () => {
                                            const ok = await modifierPalier(
                                              produitSelectionne.id_prd,
                                              palier.id_palier,
                                              {
                                                quantite_min: parseInt(formPalier.quantite_min, 10),
                                                prix_unitaire: parseFloat(formPalier.prix_unitaire)
                                              }
                                            )
                                            if (ok) {
                                              setPalierEnEdition(null)
                                              await rafraichirDetail(produitSelectionne.id_prd)
                                            }
                                          }}
                                        >
                                          <Icon icon='tabler:check' />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title='Annuler'>
                                        <IconButton
                                          size='small'
                                          aria-label='Annuler la modification du palier'
                                          onClick={() => setPalierEnEdition(null)}
                                        >
                                          <Icon icon='tabler:x' />
                                        </IconButton>
                                      </Tooltip>
                                    </TableCell>
                                  </>
                                ) : (
                                  <>
                                    <TableCell align='center'>dès {palier.quantite_min} pièces</TableCell>
                                    <TableCell align='right'>
                                      {formaterMontant(palier.prix_unitaire)} / pièce
                                    </TableCell>
                                    <TableCell align='center'>
                                      <Tooltip title='Modifier le palier'>
                                        <IconButton
                                          size='small'
                                          aria-label={`Modifier le palier dès ${palier.quantite_min} pièces`}
                                          onClick={() => {
                                            setPalierEnEdition(palier.id_palier)
                                            setFormPalier({
                                              quantite_min: String(palier.quantite_min),
                                              prix_unitaire: String(palier.prix_unitaire)
                                            })
                                          }}
                                        >
                                          <Icon icon='tabler:edit' />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title='Supprimer le palier'>
                                        <IconButton
                                          size='small'
                                          color='error'
                                          aria-label={`Supprimer le palier dès ${palier.quantite_min} pièces`}
                                          onClick={async () => {
                                            if (
                                              await supprimerPalier(produitSelectionne.id_prd, palier.id_palier)
                                            ) {
                                              await rafraichirDetail(produitSelectionne.id_prd)
                                            }
                                          }}
                                        >
                                          <Icon icon='tabler:trash' />
                                        </IconButton>
                                      </Tooltip>
                                    </TableCell>
                                  </>
                                )}
                              </TableRow>
                            ))}
                            {(produitSelectionne?.paliers || []).length === 0 && (
                              <TableRow>
                                <TableCell colSpan={3} align='center'>
                                  <Typography color='text.secondary'>
                                    Aucun palier : le prix de vente s&apos;applique à toutes les quantités.
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Grid container spacing={4} sx={{ mt: 2 }}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label='Quantité minimum (pièces)'
                            type='number'
                            autoComplete='off'
                            value={nouveauPalier.quantite_min}
                            onChange={e => setNouveauPalier({ ...nouveauPalier, quantite_min: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label='Prix unitaire appliqué (DZD)'
                            type='number'
                            autoComplete='off'
                            value={nouveauPalier.prix_unitaire}
                            onChange={e => setNouveauPalier({ ...nouveauPalier, prix_unitaire: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Button
                            variant='outlined'
                            fullWidth
                            disabled={!nouveauPalier.quantite_min || !nouveauPalier.prix_unitaire}
                            onClick={async () => {
                              if (
                                await ajouterPalier(produitSelectionne.id_prd, {
                                  quantite_min: parseInt(nouveauPalier.quantite_min, 10),
                                  prix_unitaire: parseFloat(nouveauPalier.prix_unitaire)
                                })
                              ) {
                                setNouveauPalier({ quantite_min: '', prix_unitaire: '' })
                                await rafraichirDetail(produitSelectionne.id_prd)
                              }
                            }}
                          >
                            Ajouter le palier
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid
                  item
                  xs={12}
                  md={6}
                  data-testid='colonne-prix-droite'
                  sx={{ display: 'flex', flexDirection: 'column' }}
                >
                  <Card sx={sxCarteSection} data-testid='aide-decision'>
                    <CardHeader title='Aide à la décision' />
                    <CardContent>
                      <Box sx={sxLigneAide}>
                        <Typography variant='body2' color='text.secondary'>
                          Prix d’achat moyen (TTC)
                        </Typography>
                        <Typography variant='body2' sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {formaterMontant(aideDecision?.prix_achat_dzd_moyen)}
                        </Typography>
                      </Box>
                      <Divider />
                      <Box sx={sxLigneAide}>
                        <Typography variant='body2' color='text.secondary'>
                          Prix de vente moyen
                        </Typography>
                        <Typography variant='body2' sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {formaterMontant(aideDecision?.prix_vente_moyen)}
                        </Typography>
                      </Box>
                      <Divider />
                      <Box sx={sxLigneAide}>
                        <Typography variant='body2' color='text.secondary'>
                          Marge moyenne
                        </Typography>
                        <Typography variant='body2' sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {formaterMontant(margeMoyenne)}
                        </Typography>
                      </Box>
                      <Divider />
                      <Typography variant='body2' color='text.secondary' sx={{ pt: 1.5, pb: 1 }}>
                        Paliers de prix (lecture seule)
                      </Typography>
                      {(produitSelectionne?.paliers || []).length === 0 ? (
                        <Typography variant='body2' color='text.secondary'>
                          —
                        </Typography>
                      ) : (
                        (produitSelectionne?.paliers || []).map(palier => (
                          <Box key={palier.id_palier} sx={sxLigneAide}>
                            <Typography variant='body2' color='text.secondary'>
                              Dès {palier.quantite_min} pièces
                            </Typography>
                            <Typography variant='body2' sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {formaterMontant(palier.prix_unitaire)} / pièce
                            </Typography>
                          </Box>
                        ))
                      )}
                    </CardContent>
                  </Card>
                  <Card sx={{ ...sxCarteSection, flex: 1, mt: 6 }}>
                    <CardHeader title='Historique des prix' />
                    <CardContent>
                      <TableContainer>
                        <Table size='small'>
                          <TableHead>
                            <TableRow sx={sxEnteteTableau}>
                              <TableCell align='right' sx={sxCelluleEnteteTableau}>
                                Ancien prix
                              </TableCell>
                              <TableCell align='right' sx={sxCelluleEnteteTableau}>
                                Nouveau prix
                              </TableCell>
                              <TableCell sx={sxCelluleEnteteTableau}>Début</TableCell>
                              <TableCell sx={sxCelluleEnteteTableau}>Fin</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {historique.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} align='center'>
                                  <Typography color='text.secondary'>Aucun historique de prix.</Typography>
                                </TableCell>
                              </TableRow>
                            ) : (
                              historique.map(ligne => (
                                <TableRow key={ligne.id_historique}>
                                  <TableCell align='right'>{formaterMontant(ligne.ancien_prix)}</TableCell>
                                  <TableCell align='right'>{formaterMontant(ligne.nouveau_prix)}</TableCell>
                                  <TableCell sx={{ color: 'text.secondary' }}>
                                    {formaterDate(ligne.date_debut)}
                                  </TableCell>
                                  <TableCell sx={{ color: 'text.secondary' }}>
                                    {formaterDate(ligne.date_fin)}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}

            {onglet === '3' && (
              <>
                <Grid item xs={12}>
                  <Card sx={sxCarteSection}>
                    <CardHeader
                      title='Images'
                      subheader='L’image nº 1 sert de vignette en boutique.'
                      action={<Chip label={`${nbImagesTotal}/${NB_IMAGES_MAX}`} size='small' />}
                    />
                    <CardContent>
                      <Grid container spacing={3}>
                        {tuiles.map((tuile, index) => {
                          const estPrincipaleServeur =
                            tuile.type === 'serveur' && tuile.image.est_principale
                          const estPremiere = index === 0
                          const src = tuile.type === 'serveur' ? tuile.image.url_image : tuile.image.urlApercu
                          const rotation = tuile.type === 'locale' ? tuile.image.rotation : 0

                          const cle =
                            tuile.type === 'serveur' ? `srv-${tuile.image.id_img}` : `loc-${tuile.image.idLocal}`
                          
return (
                            <Grid
                              item
                              key={cle}
                              xs={6}
                              sm={4}
                              md={3}
                              draggable
                              onDragStart={event => event.dataTransfer.setData('text/plain', String(index))}
                              onDragOver={event => {
                                event.preventDefault()
                                setIndexSurvole(index)
                              }}
                              onDragLeave={() => setIndexSurvole(null)}
                              onDrop={event => {
                                event.preventDefault()
                                const source = parseInt(event.dataTransfer.getData('text/plain'), 10)
                                if (!isNaN(source)) deplacerTuileParGlisser(source, index)
                              }}
                              sx={
                                indexSurvole === index
                                  ? { outline: '2px solid', outlineColor: 'primary.main', borderRadius: 3 }
                                  : undefined
                              }
                            >
                              <Box
                                sx={{
                                  position: 'relative',
                                  borderRadius: 3,
                                  overflow: 'hidden',
                                  border: estPrincipaleServeur ? '2px solid' : '1px solid',
                                  borderColor: estPrincipaleServeur ? 'primary.main' : 'divider',
                                  opacity: indexSurvole === index ? 0.6 : 1
                                }}
                              >
                                <Box
                                  component='img'
                                  src={src}
                                  alt={`Image ${index + 1} de ${produitSelectionne?.designation_prd}`}
                                  sx={{
                                    width: '100%',
                                    aspectRatio: '1 / 1',
                                    objectFit: 'cover',
                                    display: 'block',
                                    transform: rotation ? `rotate(${rotation}deg)` : 'none'
                                  }}
                                />
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: 8,
                                    left: 8,
                                    minWidth: 24,
                                    height: 24,
                                    px: 1,
                                    borderRadius: '50%',
                                    backgroundColor: 'primary.main',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    fontWeight: 600
                                  }}
                                >
                                  {index + 1}
                                </Box>
                                {estPrincipaleServeur && (
                                  <>
                                    <Chip
                                      label='Principale'
                                      color='primary'
                                      size='small'
                                      sx={{ position: 'absolute', top: 8, left: 40 }}
                                    />
                                    <Box
                                      sx={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        backgroundColor: 'primary.main',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                    >
                                      <Icon icon='tabler:check' fontSize='1rem' />
                                    </Box>
                                  </>
                                )}
                                {tuile.type === 'locale' && (
                                  <Chip
                                    label='À téléverser'
                                    color='warning'
                                    size='small'
                                    sx={{ position: 'absolute', top: 8, right: 8 }}
                                  />
                                )}
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: 1,
                                    py: 1,
                                    backgroundColor: 'rgba(0,0,0,0.45)'
                                  }}
                                >
                                  {tuile.type === 'serveur' && !tuile.image.est_principale && (
                                    <Tooltip title='Définir comme principale'>
                                      <IconButton
                                        size='small'
                                        sx={{ color: 'white' }}
                                        aria-label={`Définir l'image ${index + 1} comme principale`}
                                        onClick={async () => {
                                          if (
                                            await definirImagePrincipale(
                                              produitSelectionne.id_prd,
                                              tuile.image.id_img
                                            )
                                          ) {
                                            await rafraichirDetail(produitSelectionne.id_prd)
                                          }
                                        }}
                                      >
                                        <Icon icon='tabler:star' />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  {tuile.type === 'serveur' ? (
                                    <Tooltip title='Pivoter 90° à droite'>
                                      <IconButton
                                        size='small'
                                        sx={{ color: 'white' }}
                                        aria-label={`Pivoter l'image ${index + 1} de 90 degrés`}
                                        onClick={async () => {
                                          if (await pivoterImage(produitSelectionne.id_prd, tuile.image.id_img)) {
                                            await rafraichirDetail(produitSelectionne.id_prd)
                                          }
                                        }}
                                      >
                                        <Icon icon='tabler:rotate-clockwise' />
                                      </IconButton>
                                    </Tooltip>
                                  ) : (
                                    <Tooltip title='Pivoter 90° à droite'>
                                      <IconButton
                                        size='small'
                                        sx={{ color: 'white' }}
                                        aria-label={`Pivoter l'image ${index + 1} de 90 degrés`}
                                        onClick={() => pivoterImageLocale(tuile.image)}
                                      >
                                        <Icon icon='tabler:rotate-clockwise' />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  <Tooltip title='Supprimer'>
                                    <IconButton
                                      size='small'
                                      sx={{ color: 'error.main' }}
                                      aria-label={`Supprimer l'image ${index + 1}`}
                                      onClick={async () => {
                                        if (tuile.type === 'locale') {
                                          retirerImageLocale(tuile.image)
                                          
return
                                        }

                                        const resultat = await supprimerImage(
                                          produitSelectionne.id_prd,
                                          tuile.image.id_img
                                        )
                                        if (resultat) {
                                          await rafraichirDetail(produitSelectionne.id_prd)
                                          if (resultat.depublication_auto) {
                                            setAlerteDepublication(resultat.depublication_auto.manquants)
                                            await chargerListe()
                                          }
                                        }
                                      }}
                                    >
                                      <Icon icon='tabler:trash' />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </Box>
                              {tuile.type === 'locale' && (
                                <TextField
                                  fullWidth
                                  size='small'
                                  label='Nom du fichier'
                                  placeholder='Vide : généré automatiquement'
                                  autoComplete='off'
                                  value={tuile.image.nom}
                                  onChange={e =>
                                    setImagesLocales(prev =>
                                      prev.map(image =>
                                        image.idLocal === tuile.image.idLocal
                                          ? { ...image, nom: e.target.value }
                                          : image
                                      )
                                    )
                                  }
                                  sx={{ mt: 1 }}
                                />
                              )}
                              {tuile.type === 'serveur' && estPremiere && (
                                <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
                                  Vignette en boutique
                                </Typography>
                              )}
                            </Grid>
                          )
                        })}
                        {tuiles.length === 0 && (
                          <Grid item xs={12}>
                            <Typography color='text.secondary'>
                              Aucune image. La publication exige au moins 2 images.
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                      <Box
                        sx={{
                          border: '2px dashed',
                          borderColor: 'divider',
                          borderRadius: 3,
                          p: 2,
                          textAlign: 'center',
                          cursor: 'pointer',
                          mt: 6
                        }}
                        onClick={() => refFichierImage.current?.click()}
                        onDragOver={event => event.preventDefault()}
                        onDrop={event => {
                          event.preventDefault()
                          ajouterFichiersImages(event.dataTransfer.files)
                        }}
                      >
                        <input
                          ref={refFichierImage}
                          type='file'
                          accept='image/jpeg,image/png,image/webp'
                          multiple
                          hidden
                          onChange={e => {
                            ajouterFichiersImages(e.target.files)
                            e.target.value = ''
                          }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                          <Icon icon='tabler:cloud-upload' fontSize='1.5rem' />
                          <Typography variant='body2'>
                            Glissez vos images ici ou cliquez pour parcourir (JPEG, PNG, WebP — max 5 Mo)
                          </Typography>
                        </Box>
                        {imagesLocales.length > 0 && (
                          <Typography variant='body2' color='warning.main' sx={{ mt: 1 }}>
                            {imagesLocales.length} image{imagesLocales.length > 1 ? 's' : ''} en attente :
                            téléversée{imagesLocales.length > 1 ? 's' : ''} au clic sur Enregistrer. Fermer le modal
                            sans enregistrer les perd.
                          </Typography>
                        )}
                        {messageDepot && (
                          <Typography variant='body2' color='error.main' sx={{ mt: 1 }}>
                            {messageDepot}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}

          </Grid>
        </DialogContent>
        <DialogActions
          sx={{
            px: { xs: 3, md: 8 },
            py: 3,
            backgroundColor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider'
          }}
        >
          <Button onClick={fermerDetail}>Annuler</Button>
          <Button variant='contained' onClick={enregistrerTout} disabled={enregistrementEnCours}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(publicationEnAttente)}
        handleClose={() => setPublicationEnAttente(null)}
        handleConfirm={basculerPublication}
        actionType={aPublier ? 'info' : 'warning'}
        title={aPublier ? 'Publier ce produit ?' : 'Dépublier ce produit ?'}
        confirmText={aPublier ? 'Publier' : 'Dépublier'}
        loading={publicationEnCours}
        content={
          <Typography>
            {aPublier
              ? `« ${publicationEnAttente?.designation_prd} » sera visible sur la boutique en ligne. La publication exige : intitulé, description, famille, slug, prix de vente et au moins 2 images.`
              : `« ${publicationEnAttente?.designation_prd} » sera retiré de la boutique. Il restera visible dans le tableau des produits, avec le statut BROUILLON.`}
          </Typography>
        }
      />
    </Grid>
  )
}

export default ProduitsEcommerceView
