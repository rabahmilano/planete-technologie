import { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, MenuItem } from '@mui/material'
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { useFamille } from 'src/context/FamilleContext'

const aplatirFamilles = (noeuds, niveau = 0, resultat = []) => {
  noeuds.forEach(noeud => {
    resultat.push({ id: noeud.id_famille, nom: noeud.nom_famille, niveau })
    if (noeud.sous_familles?.length) aplatirFamilles(noeud.sous_familles, niveau + 1, resultat)
  })
  return resultat
}

const FamilleDialog = ({ open, famille, onClose }) => {
  const { familles, ajouterFamille, modifierFamille } = useFamille()

  const [nomFamille, setNomFamille] = useState('')
  const [familleParenteId, setFamilleParenteId] = useState('')
  const [imageFamille, setImageFamille] = useState('')
  const [ordreFamille, setOrdreFamille] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setNomFamille(famille?.nom_famille || '')
      setFamilleParenteId(famille?.famille_parente_id || '')
      setImageFamille(famille?.image_famille || '')
      setOrdreFamille(famille?.ordre_famille !== undefined && famille?.ordre_famille !== null ? String(famille.ordre_famille) : '')
    }
  }, [open, famille])

  const optionsParent = aplatirFamilles(familles).filter(option => option.id !== famille?.id_famille)

  const handleSubmit = async () => {
    setIsLoading(true)
    const donnees = {
      nomFamille,
      familleParenteId: familleParenteId === '' ? null : parseInt(familleParenteId, 10),
      imageFamille: imageFamille || null,
      ordreFamille: ordreFamille === '' ? 0 : parseInt(ordreFamille, 10)
    }
    const success = famille
      ? await modifierFamille(famille.id_famille, donnees)
      : await ajouterFamille(donnees)
    setIsLoading(false)
    if (success) onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Icon icon={famille ? 'tabler:edit' : 'tabler:category-plus'} />
        {famille ? 'Modifier la famille' : 'Nouvelle famille'}
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={4} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <CustomTextField
              fullWidth
              label='Nom de la famille'
              value={nomFamille}
              onChange={e => setNomFamille(e.target.value)}
              placeholder='Ex : Téléphones & Accessoires'
            />
          </Grid>

          <Grid item xs={12} sm={7}>
            <CustomTextField
              select
              fullWidth
              label='Famille parente (optionnel)'
              value={familleParenteId}
              onChange={e => setFamilleParenteId(e.target.value)}
            >
              <MenuItem value=''>Aucune (famille racine)</MenuItem>
              {optionsParent.map(option => (
                <MenuItem key={option.id} value={option.id}>
                  {'\u00A0'.repeat(option.niveau * 4)}
                  {option.niveau > 0 ? '↳ ' : ''}
                  {option.nom}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          <Grid item xs={12} sm={5}>
            <CustomTextField
              fullWidth
              type='number'
              label="Ordre d'affichage"
              value={ordreFamille}
              onChange={e => setOrdreFamille(e.target.value)}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>

          <Grid item xs={12}>
            <CustomTextField
              fullWidth
              label="URL de l'image (optionnel)"
              value={imageFamille}
              onChange={e => setImageFamille(e.target.value)}
              placeholder='https://...'
            />
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
          disabled={!nomFamille.trim() || isLoading}
          startIcon={<Icon icon={isLoading ? 'tabler:loader' : 'tabler:check'} />}
        >
          {isLoading ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default FamilleDialog
