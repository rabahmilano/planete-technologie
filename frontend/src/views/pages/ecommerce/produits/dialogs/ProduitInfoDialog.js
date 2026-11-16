import { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, MenuItem, Typography } from '@mui/material'
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { useProduitEcommerce } from 'src/context/ProduitEcommerceContext'
import { useFamille } from 'src/context/FamilleContext'

const aplatirFamilles = (noeuds, niveau = 0, resultat = []) => {
  noeuds.forEach(noeud => {
    resultat.push({ id: noeud.id_famille, nom: noeud.nom_famille, niveau })
    if (noeud.sous_familles?.length) aplatirFamilles(noeud.sous_familles, niveau + 1, resultat)
  })
  return resultat
}

const statutsPublication = ['BROUILLON', 'PUBLIE', 'ARCHIVE']

const ProduitInfoDialog = ({ open, produit, onClose }) => {
  const { majProduit, majDescription, majStatut } = useProduitEcommerce()
  const { familles, fetchFamilles, attribuerFamille } = useFamille()

  const [designation, setDesignation] = useState('')
  const [slug, setSlug] = useState('')
  const [qteDispo, setQteDispo] = useState('')
  const [poidsGrammes, setPoidsGrammes] = useState('')
  const [statutPublication, setStatutPublication] = useState('BROUILLON')
  const [description, setDescription] = useState('')
  const [familleId, setFamilleId] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      if (familles.length === 0) fetchFamilles()
      setDesignation(produit?.designation_prd || '')
      setSlug(produit?.slug_prd || '')
      setQteDispo(produit?.qte_dispo !== undefined ? String(produit.qte_dispo) : '')
      setPoidsGrammes(produit?.poids_grammes !== undefined && produit?.poids_grammes !== null ? String(produit.poids_grammes) : '')
      setStatutPublication(produit?.statut_publication || 'BROUILLON')
      setDescription(produit?.description || '')
      setFamilleId(produit?.famille_id || '')
    }
  }, [open, produit, familles, fetchFamilles])

  const familleChangee = produit && String(produit.famille_id ?? '') !== String(familleId)

  const handleSubmit = async () => {
    setIsLoading(true)

    const donneesProduit = {}
    if (designation.trim() !== produit.designation_prd) donneesProduit.designation_prd = designation.trim()
    if (slug.trim() !== (produit.slug_prd || '')) donneesProduit.slug_prd = slug.trim() || null
    if (qteDispo !== '' && parseInt(qteDispo, 10) !== produit.qte_dispo) donneesProduit.qte_dispo = parseInt(qteDispo, 10)
    if (poidsGrammes !== '' && parseInt(poidsGrammes, 10) !== (produit.poids_grammes ?? 500)) {
      donneesProduit.poids_grammes = parseInt(poidsGrammes, 10)
    }

    let success = true
    if (Object.keys(donneesProduit).length > 0) {
      success = await majProduit(produit.id_prd, donneesProduit)
    }
    if (success && statutPublication !== produit.statut_publication) {
      success = await majStatut(produit.id_prd, statutPublication)
    }
    if (success && description !== (produit.description || '')) {
      success = await majDescription(produit.id_prd, description.trim() || null)
    }
    if (success && familleChangee) {
      success = await attribuerFamille(produit.id_prd, familleId === '' ? null : parseInt(familleId, 10))
    }

    setIsLoading(false)
    if (success) onClose()
  }

  const optionsFamilles = aplatirFamilles(familles)

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Icon icon='tabler:edit' />
        Fiche produit — {produit?.designation_prd}
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={4} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={7}>
            <CustomTextField
              fullWidth
              label='Désignation'
              value={designation}
              onChange={e => setDesignation(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <CustomTextField
              select
              fullWidth
              label='Statut de publication'
              value={statutPublication}
              onChange={e => setStatutPublication(e.target.value)}
            >
              {statutsPublication.map(statutOption => (
                <MenuItem key={statutOption} value={statutOption}>
                  {statutOption}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          <Grid item xs={12} sm={7}>
            <CustomTextField
              fullWidth
              label='Slug boutique (URL, unique)'
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder='telephone-samsung-a15'
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <CustomTextField
              select
              fullWidth
              label='Famille (boutique)'
              value={familleId}
              onChange={e => setFamilleId(e.target.value)}
            >
              <MenuItem value=''>Aucune famille</MenuItem>
              {optionsFamilles.map(option => (
                <MenuItem key={option.id} value={option.id}>
                  {'\u00A0'.repeat(option.niveau * 4)}
                  {option.niveau > 0 ? '↳ ' : ''}
                  {option.nom}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          <Grid item xs={12} sm={4}>
            <CustomTextField
              fullWidth
              type='number'
              label='Quantité disponible'
              value={qteDispo}
              onChange={e => setQteDispo(e.target.value)}
              InputProps={{ inputProps: { min: 0 } }}
              disabled={produit?.id_prd !== undefined && produit?.qte_dispo !== undefined}
              helperText='Géré par les achats/ventes — modifié uniquement si vous changez la valeur'
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <CustomTextField
              fullWidth
              type='number'
              label='Poids (grammes)'
              value={poidsGrammes}
              onChange={e => setPoidsGrammes(e.target.value)}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <CustomTextField
              fullWidth
              type='number'
              label='Quantité réservée'
              value={produit?.qte_reservee ?? 0}
              disabled
              helperText='Calculée automatiquement par les commandes web'
            />
          </Grid>

          <Grid item xs={12}>
            <CustomTextField
              fullWidth
              multiline
              rows={4}
              label='Description boutique'
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder='Description affichée aux clients sur la page produit...'
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant='caption' color='textSecondary'>
              Le slug est utilisé pour les URL de la boutique (ex : /produits/telephone-samsung-a15). Laisser vide pour
              ne pas publier le produit par URL.
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={onClose} disabled={isLoading}>
          Annuler
        </Button>
        <Button
          variant='contained'
          onClick={handleSubmit}
          disabled={!designation.trim() || isLoading}
          startIcon={<Icon icon={isLoading ? 'tabler:loader' : 'tabler:check'} />}
        >
          {isLoading ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ProduitInfoDialog
