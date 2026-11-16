import { useState } from 'react'
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import { useFamille } from 'src/context/FamilleContext'

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
  const { familles, loading, ajouterFamille, modifierFamille, supprimerFamille } = useFamille()
  const [dialogOuvert, setDialogOuvert] = useState(false)
  const [familleEnCours, setFamilleEnCours] = useState(null)
  const [aSupprimer, setASupprimer] = useState(null)
  const [formulaire, setFormulaire] = useState({ nom_famille: '', famille_parente_id: '', image_famille: '', ordre_famille: 0 })

  const lignes = flatten(familles)
  const racines = familles.map(f => ({ id_famille: f.id_famille, nom_famille: f.nom_famille }))

  const ouvrirCreation = (parentId = '') => {
    setFamilleEnCours(null)
    setFormulaire({ nom_famille: '', famille_parente_id: parentId, image_famille: '', ordre_famille: 0 })
    setDialogOuvert(true)
  }

  const ouvrirModification = famille => {
    setFamilleEnCours(famille)
    setFormulaire({
      nom_famille: famille.nom_famille,
      famille_parente_id: famille.famille_parente_id ?? '',
      image_famille: famille.image_famille || '',
      ordre_famille: famille.ordre_famille ?? 0
    })
    setDialogOuvert(true)
  }

  const soumettre = async () => {
    const donnees = {
      nom_famille: formulaire.nom_famille.trim(),
      famille_parente_id: formulaire.famille_parente_id === '' ? null : parseInt(formulaire.famille_parente_id, 10),
      image_famille: formulaire.image_famille.trim() || null,
      ordre_famille: parseInt(formulaire.ordre_famille, 10) || 0
    }
    const ok = familleEnCours
      ? await modifierFamille(familleEnCours.id_famille, donnees)
      : await ajouterFamille(donnees)
    if (ok) setDialogOuvert(false)
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
                    <TableCell colSpan={5} align='center'>
                      <Typography sx={{ p: 4 }}>Aucune famille. Créez la première famille.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  lignes.map(famille => (
                    <TableRow key={famille.id_famille}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', pl: famille.niveau * 4 }}>
                          {famille.niveau > 0 && <Icon icon='tabler:corner-down-right' fontSize='1.1rem' />}
                          <Typography sx={{ fontWeight: famille.niveau === 0 ? 600 : 400 }}>
                            {famille.nom_famille}
                          </Typography>
                          {famille.niveau === 0 && (
                            <Chip label='Racine' size='small' sx={{ ml: 2 }} />
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
                          onClick={() => ouvrirCreation(famille.id_famille)}
                        >
                          <Icon icon='tabler:git-branch-plus' />
                        </IconButton>
                        <IconButton size='small' title='Modifier' onClick={() => ouvrirModification(famille)}>
                          <Icon icon='tabler:pencil' />
                        </IconButton>
                        <IconButton size='small' title='Supprimer' onClick={() => setASupprimer(famille)}>
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
                value={formulaire.nom_famille}
                onChange={e => setFormulaire({ ...formulaire, nom_famille: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Famille parente</InputLabel>
                <Select
                  label='Famille parente'
                  value={formulaire.famille_parente_id}
                  onChange={e => setFormulaire({ ...formulaire, famille_parente_id: e.target.value })}
                >
                  <MenuItem value=''>Aucune (famille racine)</MenuItem>
                  {racines
                    .filter(r => r.id_famille !== familleEnCours?.id_famille)
                    .map(r => (
                      <MenuItem key={r.id_famille} value={r.id_famille}>
                        {r.nom_famille}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="URL de l'image"
                value={formulaire.image_famille}
                onChange={e => setFormulaire({ ...formulaire, image_famille: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Ordre d'affichage"
                type='number'
                value={formulaire.ordre_famille}
                onChange={e => setFormulaire({ ...formulaire, ordre_famille: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOuvert(false)}>Annuler</Button>
          <Button variant='contained' onClick={soumettre} disabled={!formulaire.nom_famille.trim()}>
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
