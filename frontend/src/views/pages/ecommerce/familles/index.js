import { useRef, useState } from 'react'
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  TextField,
  Typography
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import { useFamille } from 'src/context/FamilleContext'
import FamilleSelect from '../produits/FamilleSelect'

const REGEX_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const MESSAGE_FORMAT_SLUG =
  'Format invalide : minuscules a-z, chiffres 0-9 et tirets uniquement, sans accents ni espaces (ex. : reseau-cle-wifi)'

const flatten = (familles, niveau = 0, lignes = []) => {
  familles.forEach(famille => {
    lignes.push({ ...famille, niveau })
    if (famille.sous_familles?.length) {
      flatten(famille.sous_familles, niveau + 1, lignes)
    }
  })
  
return lignes
}

const FamillesView = () => {
  const { familles, loading, ajouterFamille, modifierFamille, supprimerFamille, televerserImageFamille } = useFamille()
  const [dialogOuvert, setDialogOuvert] = useState(false)
  const [familleEnCours, setFamilleEnCours] = useState(null)
  const [aSupprimer, setASupprimer] = useState(null)

  const [formulaire, setFormulaire] = useState({
    nom_famille: '',
    slug_famille: '',
    famille_parente_id: '',
    image_famille: '',
    ordre_famille: 0,
    est_active_famille: true
  })
  const [erreurSlug, setErreurSlug] = useState('')
  const [erreurImage, setErreurImage] = useState('')
  const [televersementEnCours, setTeleversementEnCours] = useState(false)
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false)

  // Image choisie mais pas encore envoyée : aperçu LOCAL uniquement, aucun
  // envoi vers Cloudinary avant Enregistrer (même règle que le modal Gérer).
  const [fichierImageLocal, setFichierImageLocal] = useState(null)
  const [apercuLocal, setApercuLocal] = useState(null)
  const refFichierImage = useRef(null)

  const libererApercuLocal = () => {
    if (apercuLocal) URL.revokeObjectURL(apercuLocal)
    setApercuLocal(null)
    setFichierImageLocal(null)
  }

  const lignes = flatten(familles)
  const ordreMax = lignes.reduce((max, l) => Math.max(max, l.ordre_famille || 0), 0)
  // Intervalle de +3 : les nouvelles familles sont numérotées 3, 6, 9…
  // (2 places libres entre deux familles pour insérer).
  const prochainOrdre = Math.floor(ordreMax / 3) * 3 + 3
  const parentChoisi = lignes.find(l => l.id_famille === parseInt(formulaire.famille_parente_id, 10))


  // Arbre proposé au sélecteur : la famille en cours d'édition (et toute sa
  // descendance) en est exclue — on ne peut pas choisir sa propre
  // descendante comme parente (le backend refuse le cycle de toute façon).
  const retirerSousArbre = (arbre, idExclu) =>
    (arbre || [])
      .filter(f => f.id_famille !== idExclu)
      .map(f => ({ ...f, sous_familles: retirerSousArbre(f.sous_familles, idExclu) }))
  const famillesPourSelection = retirerSousArbre(familles, familleEnCours?.id_famille)
  const slugModifie = Boolean(familleEnCours) && formulaire.slug_famille.trim() !== familleEnCours?.slug_famille

  const texteAideSlug = erreurSlug
    ? erreurSlug
    : [
        parentChoisi
          ? `Convention sous-famille : ${parentChoisi.slug_famille}-<slug> (ex. : ${parentChoisi.slug_famille}-cle-wifi)`
          : 'Minuscules a-z, chiffres 0-9 et tirets uniquement',
        slugModifie
          ? "Attention : le slug sert d'identifiant côté boutique, le modifier casse les URL partagées (fiches produits, liens déjà envoyés)."
          : ''
      ]
        .filter(Boolean)
        .join(' — ')

  const ouvrirCreation = (parentId = '') => {
    setFamilleEnCours(null)
    setFormulaire({
      nom_famille: '',
      slug_famille: '',
      famille_parente_id: parentId,
      image_famille: '',
      ordre_famille: prochainOrdre,
      est_active_famille: true
    })
    setErreurSlug('')
    setErreurImage('')
    libererApercuLocal()
    setDialogOuvert(true)
  }

  const ouvrirModification = famille => {
    setFamilleEnCours(famille)
    setFormulaire({
      nom_famille: famille.nom_famille,
      slug_famille: famille.slug_famille,
      famille_parente_id: famille.famille_parente_id ?? '',
      image_famille: famille.image_famille || '',
      ordre_famille: famille.ordre_famille ?? 0,
      est_active_famille: famille.est_active_famille ?? true
    })
    setErreurSlug('')
    setErreurImage('')
    libererApercuLocal()
    setDialogOuvert(true)
  }

  const changerSlug = valeur => {
    setFormulaire({ ...formulaire, slug_famille: valeur })
    if (erreurSlug) setErreurSlug('')
  }

  // Aperçu LOCAL uniquement : aucun envoi vers Cloudinary avant Enregistrer
  // (même règle que le modal Gérer). L'envoi a lieu dans `soumettre`.
  const TYPES_IMAGE_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp']
  const TAILLE_MAX_IMAGE = 5 * 1024 * 1024

  const choisirFichierImage = event => {
    const fichier = event.target.files?.[0]
    event.target.value = ''
    if (!fichier) return
    if (!TYPES_IMAGE_ACCEPTES.includes(fichier.type)) {
      setErreurImage('Format accepté : JPEG, PNG ou WebP.')
      
return
    }
    if (fichier.size > TAILLE_MAX_IMAGE) {
      setErreurImage("L'image dépasse 5 Mo.")
      
return
    }
    setErreurImage('')
    if (apercuLocal) URL.revokeObjectURL(apercuLocal)
    setFichierImageLocal(fichier)
    setApercuLocal(URL.createObjectURL(fichier))
  }

  const retirerImage = () => {
    libererApercuLocal()
    setFormulaire(precedent => ({ ...precedent, image_famille: '' }))
  }

  const soumettre = async () => {
    if (enregistrementEnCours) return
    const slugSaisi = formulaire.slug_famille.trim()
    if (!REGEX_SLUG.test(slugSaisi)) {
      setErreurSlug(MESSAGE_FORMAT_SLUG)
      
return
    }
    setEnregistrementEnCours(true)

    // Envoi de l'image vers Cloudinary seulement maintenant, à l'enregistrement.
    let urlImage = formulaire.image_famille.trim() || null
    if (fichierImageLocal) {
      setTeleversementEnCours(true)
      const resultat = await televerserImageFamille(fichierImageLocal)
      setTeleversementEnCours(false)
      if (!resultat?.url_image) {
        setEnregistrementEnCours(false)
        
return
      }
      urlImage = resultat.url_image
    }

    const donnees = {
      nom_famille: formulaire.nom_famille.trim(),
      slug_famille: slugSaisi,
      famille_parente_id: formulaire.famille_parente_id === '' ? null : parseInt(formulaire.famille_parente_id, 10),
      image_famille: urlImage,
      ordre_famille: parseInt(formulaire.ordre_famille, 10) || 0,
      est_active_famille: formulaire.est_active_famille
    }

    const ok = familleEnCours
      ? await modifierFamille(familleEnCours.id_famille, donnees)
      : await ajouterFamille(donnees)
    setEnregistrementEnCours(false)
    if (ok) {
      libererApercuLocal()
      setDialogOuvert(false)
    }
  }

  const confirmerSuppression = async () => {
    if (await supprimerFamille(aSupprimer.id_famille)) {
      setASupprimer(null)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant='h5'>Familles de produits</Typography>
          <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={() => ouvrirCreation()}>
            Nouvelle famille
          </Button>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3, position: 'relative' }}>
          {loading && <LinearProgress sx={{ position: 'absolute', top: 0, width: '100%', zIndex: 1 }} />}
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
                  <TableCell sx={{ color: 'white' }}>Image</TableCell>
                  <TableCell sx={{ color: 'white' }}>Famille</TableCell>
                  <TableCell sx={{ color: 'white' }}>Slug</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Ordre</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Produits</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lignes.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align='center'>
                      <Typography sx={{ p: 4 }}>Aucune famille. Créez la première famille.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  lignes.map(famille => (
                    <TableRow key={famille.id_famille}>
                      <TableCell>
                        {famille.image_famille ? (
                          <Box
                            component='img'
                            src={famille.image_famille}
                            alt={famille.nom_famille}
                            sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 1 }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'action.hover'
                            }}
                          >
                            <Icon icon='tabler:photo-off' fontSize='1.2rem' />
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', pl: famille.niveau * 4 }}>
                          {famille.niveau > 0 && <Icon icon='tabler:corner-down-right' fontSize='1.1rem' />}
                          <Typography sx={{ fontWeight: famille.niveau === 0 ? 600 : 400 }}>
                            {famille.nom_famille}
                          </Typography>
                          {famille.niveau === 0 && (
                            <Chip label='Racine' size='small' sx={{ ml: 2 }} />
                          )}
                          {!famille.est_active_famille && (
                            <Chip label='Masquée' size='small' color='warning' sx={{ ml: 2 }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{famille.slug_famille}</TableCell>
                      <TableCell align='center'>{famille.ordre_famille}</TableCell>
                      <TableCell align='center'>{famille._count?.produits ?? 0}</TableCell>
                      <TableCell align='center'>
                        <IconButton
                          size='small'
                          title='Ajouter une sous-famille'
                          aria-label={`Ajouter une sous-famille à ${famille.nom_famille}`}
                          onClick={() => ouvrirCreation(famille.id_famille)}
                        >
                          <Icon icon='tabler:git-branch-plus' />
                        </IconButton>
                        <IconButton
                          size='small'
                          title='Modifier'
                          aria-label={`Modifier ${famille.nom_famille}`}
                          onClick={() => ouvrirModification(famille)}
                        >
                          <Icon icon='tabler:pencil' />
                        </IconButton>
                        <IconButton
                          size='small'
                          title='Supprimer'
                          aria-label={`Supprimer ${famille.nom_famille}`}
                          onClick={() => setASupprimer(famille)}
                        >
                          <Icon icon='tabler:trash' />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>

      <Dialog open={dialogOuvert} onClose={() => setDialogOuvert(false)} fullWidth maxWidth='sm'>
        <DialogTitle>{familleEnCours ? 'Modifier la famille' : 'Nouvelle famille'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={4} sx={{ pt: 2 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Nom de la famille'
                autoComplete='off'
                value={formulaire.nom_famille}
                onChange={e => setFormulaire({ ...formulaire, nom_famille: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label='Slug'
                autoComplete='off'
                value={formulaire.slug_famille}
                error={Boolean(erreurSlug)}
                helperText={texteAideSlug}
                onChange={e => changerSlug(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FamilleSelect
                familles={famillesPourSelection}
                label='Famille parente'
                labelAucune='Aucune (famille racine)'
                value={parentChoisi || null}
                onChange={item =>
                  setFormulaire({ ...formulaire, famille_parente_id: item ? item.id_famille : '' })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {(apercuLocal || formulaire.image_famille) && (
                  <Box
                    component='img'
                    src={apercuLocal || formulaire.image_famille}
                    alt='Image de la famille'
                    sx={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 1 }}
                  />
                )}
                <input
                  ref={refFichierImage}
                  type='file'
                  accept='image/jpeg,image/png,image/webp'
                  hidden
                  onChange={choisirFichierImage}
                />
                <Button
                  variant='outlined'
                  startIcon={<Icon icon='tabler:upload' />}
                  onClick={() => refFichierImage.current?.click()}
                  disabled={enregistrementEnCours}
                >
                  {apercuLocal || formulaire.image_famille ? 'Remplacer' : "Choisir une image"}
                </Button>
                {(apercuLocal || formulaire.image_famille) && (
                  <Button color='error' onClick={retirerImage}>
                    Retirer
                  </Button>
                )}
              </Box>
              {erreurImage && (
                <Typography color='error' sx={{ mt: 2 }}>
                  {erreurImage}
                </Typography>
              )}
              {apercuLocal && (
                <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                  Aperçu local — l&apos;image ne sera envoyée qu&apos;à l&apos;enregistrement.
                </Typography>
              )}
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Ordre d'affichage"
                type='number'
                autoComplete='off'
                value={formulaire.ordre_famille}
                onChange={e => setFormulaire({ ...formulaire, ordre_famille: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formulaire.est_active_famille}
                    onChange={e => setFormulaire({ ...formulaire, est_active_famille: e.target.checked })}
                  />
                }
                label='Visible en boutique'
              />
              {!formulaire.est_active_famille && (
                <Typography variant='body2' color='text.secondary'>
                  Masquée : la famille, ses sous-familles et leurs produits ne seront pas visibles en boutique.
                </Typography>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOuvert(false)}>Annuler</Button>
          <Button
            variant='contained'
            onClick={soumettre}
            disabled={
              !formulaire.nom_famille.trim() ||
              !formulaire.slug_famille.trim() ||
              televersementEnCours ||
              enregistrementEnCours
            }
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(aSupprimer)} onClose={() => setASupprimer(null)}>
        <DialogTitle>Supprimer cette famille ?</DialogTitle>
        <DialogContent>
          <Typography>
            La famille « {aSupprimer?.nom_famille} » sera supprimée. La suppression est refusée si elle possède
            des sous-familles ou des produits rattachés.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setASupprimer(null)}>Annuler</Button>
          <Button variant='contained' color='error' onClick={confirmerSuppression}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default FamillesView
