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
import { useTarifLivraison } from 'src/context/TarifLivraisonContext'

const TYPES_LIVRAISON = ['DOMICILE', 'BUREAU']

const TarifsLivraisonView = () => {
  const { tarifs, loading, fetchTarifs, ajouterTarif, modifierTarif, supprimerTarif } = useTarifLivraison()
  const [filtreType, setFiltreType] = useState('')
  const [dialogOuvert, setDialogOuvert] = useState(false)
  const [tarifEnCours, setTarifEnCours] = useState(null)
  const [aSupprimer, setASupprimer] = useState(null)
  const [formulaire, setFormulaire] = useState({
    code_wilaya_tarif: '',
    nom_wilaya_tarif: '',
    type_livraison_tarif: 'DOMICILE',
    prix_livraison_tarif: '',
    actif_tarif: true
  })

  const tarifsFiltres = filtreType ? tarifs.filter(t => t.type_livraison_tarif === filtreType) : tarifs

  const ouvrirCreation = () => {
    setTarifEnCours(null)
    setFormulaire({
      code_wilaya_tarif: '',
      nom_wilaya_tarif: '',
      type_livraison_tarif: 'DOMICILE',
      prix_livraison_tarif: '',
      actif_tarif: true
    })
    setDialogOuvert(true)
  }

  const ouvrirModification = tarif => {
    setTarifEnCours(tarif)
    setFormulaire({
      code_wilaya_tarif: tarif.code_wilaya_tarif,
      nom_wilaya_tarif: tarif.nom_wilaya_tarif,
      type_livraison_tarif: tarif.type_livraison_tarif,
      prix_livraison_tarif: tarif.prix_livraison_tarif,
      actif_tarif: tarif.actif_tarif
    })
    setDialogOuvert(true)
  }

  const soumettre = async () => {
    const donnees = {
      code_wilaya_tarif: parseInt(formulaire.code_wilaya_tarif, 10),
      nom_wilaya_tarif: formulaire.nom_wilaya_tarif.trim(),
      type_livraison_tarif: formulaire.type_livraison_tarif,
      prix_livraison_tarif: parseFloat(formulaire.prix_livraison_tarif),
      actif_tarif: formulaire.actif_tarif
    }
    const ok = tarifEnCours
      ? await modifierTarif(tarifEnCours.id_tarif, donnees)
      : await ajouterTarif(donnees)
    if (ok) setDialogOuvert(false)
  }

  const basculerActif = async tarif => {
    await modifierTarif(tarif.id_tarif, { actif_tarif: !tarif.actif_tarif })
  }

  const confirmerSuppression = async () => {
    if (await supprimerTarif(aSupprimer.id_tarif)) {
      setASupprimer(null)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant='h5'>Tarifs de livraison</Typography>
          <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={ouvrirCreation}>
            Nouveau tarif
          </Button>
        </Box>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 4 }}>
          Grille de secours des frais de livraison par wilaya et par type, utilisée quand le tarif Yalidine
          n&apos;est pas disponible.
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <FormControl sx={{ minWidth: 220, mb: 4 }}>
          <InputLabel>Type de livraison</InputLabel>
          <Select
            label='Type de livraison'
            value={filtreType}
            onChange={e => setFiltreType(e.target.value)}
          >
            <MenuItem value=''>Tous les types</MenuItem>
            {TYPES_LIVRAISON.map(type => (
              <MenuItem key={type} value={type}>
                {type === 'DOMICILE' ? 'À domicile' : 'Au bureau'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant='outlined' sx={{ ml: 3 }} onClick={() => fetchTarifs()}>
          Actualiser
        </Button>
      </Grid>
      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3, position: 'relative' }}>
          {loading && <LinearProgress sx={{ position: 'absolute', top: 0, width: '100%', zIndex: 1 }} />}
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
                  <TableCell sx={{ color: 'white' }} align='center'>Code wilaya</TableCell>
                  <TableCell sx={{ color: 'white' }}>Wilaya</TableCell>
                  <TableCell sx={{ color: 'white' }}>Type</TableCell>
                  <TableCell sx={{ color: 'white' }} align='right'>Prix</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Actif</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tarifsFiltres.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align='center'>
                      <Typography sx={{ p: 4 }}>Aucun tarif de livraison.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  tarifsFiltres.map(tarif => (
                    <TableRow key={tarif.id_tarif}>
                      <TableCell align='center'>{tarif.code_wilaya_tarif}</TableCell>
                      <TableCell>{tarif.nom_wilaya_tarif}</TableCell>
                      <TableCell>
                        {tarif.type_livraison_tarif === 'DOMICILE' ? 'À domicile' : 'Au bureau'}
                      </TableCell>
                      <TableCell align='right'>
                        {Number(tarif.prix_livraison_tarif).toLocaleString('fr-FR')} DZD
                      </TableCell>
                      <TableCell align='center'>
                        <Chip
                          label={tarif.actif_tarif ? 'Actif' : 'Inactif'}
                          color={tarif.actif_tarif ? 'success' : 'default'}
                          size='small'
                        />
                      </TableCell>
                      <TableCell align='center'>
                        <IconButton size='small' title='Activer / désactiver' onClick={() => basculerActif(tarif)}>
                          <Icon icon={tarif.actif_tarif ? 'tabler:toggle-right' : 'tabler:toggle-left'} />
                        </IconButton>
                        <IconButton size='small' title='Modifier' onClick={() => ouvrirModification(tarif)}>
                          <Icon icon='tabler:pencil' />
                        </IconButton>
                        <IconButton size='small' title='Supprimer' onClick={() => setASupprimer(tarif)}>
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
        <DialogTitle>{tarifEnCours ? 'Modifier le tarif' : 'Nouveau tarif de livraison'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={4} sx={{ pt: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Code wilaya (1–58)'
                type='number'
                inputProps={{ min: 1, max: 58 }}
                value={formulaire.code_wilaya_tarif}
                onChange={e => setFormulaire({ ...formulaire, code_wilaya_tarif: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Nom de la wilaya'
                value={formulaire.nom_wilaya_tarif}
                onChange={e => setFormulaire({ ...formulaire, nom_wilaya_tarif: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type de livraison</InputLabel>
                <Select
                  label='Type de livraison'
                  value={formulaire.type_livraison_tarif}
                  onChange={e => setFormulaire({ ...formulaire, type_livraison_tarif: e.target.value })}
                >
                  <MenuItem value='DOMICILE'>À domicile</MenuItem>
                  <MenuItem value='BUREAU'>Au bureau</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Prix (DZD)'
                type='number'
                value={formulaire.prix_livraison_tarif}
                onChange={e => setFormulaire({ ...formulaire, prix_livraison_tarif: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>État</InputLabel>
                <Select
                  label='État'
                  value={formulaire.actif_tarif}
                  onChange={e => setFormulaire({ ...formulaire, actif_tarif: e.target.value })}
                >
                  <MenuItem value={true}>Actif</MenuItem>
                  <MenuItem value={false}>Inactif</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOuvert(false)}>Annuler</Button>
          <Button
            variant='contained'
            onClick={soumettre}
            disabled={!formulaire.code_wilaya_tarif || !formulaire.nom_wilaya_tarif.trim() || formulaire.prix_livraison_tarif === ''}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(aSupprimer)} onClose={() => setASupprimer(null)}>
        <DialogTitle>Supprimer ce tarif ?</DialogTitle>
        <DialogContent>
          <Typography>
            Le tarif {aSupprimer?.nom_wilaya_tarif} (
            {aSupprimer?.type_livraison_tarif === 'DOMICILE' ? 'à domicile' : 'au bureau'}) sera supprimé.
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

export default TarifsLivraisonView
