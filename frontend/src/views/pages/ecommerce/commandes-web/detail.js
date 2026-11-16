import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
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
import { useCommandeWeb } from 'src/context/CommandeWebContext'
import { STATUTS_COMMANDE } from './index'

const couleurStatut = statut => {
  switch (statut) {
    case 'NOUVELLE':
      return 'info'
    case 'CONFIRMEE':
      return 'primary'
    case 'EXPEDIEE':
      return 'warning'
    case 'LIVREE':
      return 'success'
    case 'ANNULEE':
      return 'error'
    default:
      return 'default'
  }
}

const formaterDate = valeur => {
  if (!valeur) return '—'
  return new Date(valeur).toLocaleString('fr-FR')
}

const formaterMontant = valeur => `${Number(valeur || 0).toLocaleString('fr-FR')} DZD`

const CommandeWebDetailView = () => {
  const router = useRouter()
  const { id } = router.query
  const { fetchCommande, changerStatut, annulerCommande, modifierCommande } = useCommandeWeb()
  const [commande, setCommande] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [dialogStatut, setDialogStatut] = useState(false)
  const [dialogAnnuler, setDialogAnnuler] = useState(false)
  const [dialogNote, setDialogNote] = useState(false)
  const [nouveauStatut, setNouveauStatut] = useState('')
  const [codeTracking, setCodeTracking] = useState('')
  const [noteAdmin, setNoteAdmin] = useState('')

  const charger = async () => {
    if (!id) return
    setChargement(true)
    const data = await fetchCommande(id)
    setCommande(data)
    setChargement(false)
  }

  useEffect(() => {
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const appliquerStatut = async () => {
    const miseAJour = await changerStatut(id, {
      statut_commande: nouveauStatut,
      code_tracking: codeTracking.trim() || undefined
    })
    if (miseAJour) {
      setDialogStatut(false)
      setCodeTracking('')
      await charger()
    }
  }

  const confirmerAnnulation = async () => {
    const miseAJour = await annulerCommande(id)
    if (miseAJour) {
      setDialogAnnuler(false)
      await charger()
    }
  }

  const enregistrerNote = async () => {
    const miseAJour = await modifierCommande(id, { note_admin: noteAdmin })
    if (miseAJour) {
      setDialogNote(false)
      await charger()
    }
  }

  if (chargement) {
    return (
      <Card sx={{ position: 'relative', minHeight: 200 }}>
        <LinearProgress sx={{ position: 'absolute', top: 0, width: '100%' }} />
      </Card>
    )
  }

  if (!commande) {
    return (
      <Card sx={{ p: 6 }}>
        <Typography>Commande introuvable.</Typography>
        <Button sx={{ mt: 4 }} variant='outlined' onClick={() => router.push('/ecommerce/commandes-web')}>
          Retour à la liste
        </Button>
      </Card>
    )
  }

  const annulee = commande.statut_commande === 'ANNULEE'
  const livree = commande.statut_commande === 'LIVREE'

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Button
              variant='outlined'
              startIcon={<Icon icon='tabler:arrow-left' />}
              onClick={() => router.push('/ecommerce/commandes-web')}
            >
              Retour
            </Button>
            <Typography variant='h5'>Commande web #{commande.id_cmd_web}</Typography>
            <Chip label={commande.statut_commande} color={couleurStatut(commande.statut_commande)} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant='outlined'
              startIcon={<Icon icon='tabler:note' />}
              onClick={() => {
                setNoteAdmin(commande.note_admin || '')
                setDialogNote(true)
              }}
            >
              Note admin
            </Button>
            {!annulee && !livree && (
              <Button
                variant='contained'
                color='error'
                startIcon={<Icon icon='tabler:x' />}
                onClick={() => setDialogAnnuler(true)}
              >
                Annuler
              </Button>
            )}
            {!annulee && (
              <Button
                variant='contained'
                startIcon={<Icon icon='tabler:refresh' />}
                onClick={() => {
                  setNouveauStatut(commande.statut_commande)
                  setCodeTracking(commande.code_tracking || '')
                  setDialogStatut(true)
                }}
              >
                Changer le statut
              </Button>
            )}
          </Box>
        </Box>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card sx={{ boxShadow: 3 }}>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 4 }}>
              Client et livraison
            </Typography>
            <Typography>
              <strong>Client :</strong> {commande.nom_client}
            </Typography>
            <Typography>
              <strong>Téléphone :</strong> {commande.telephone}
            </Typography>
            <Typography>
              <strong>Wilaya :</strong> {commande.wilaya} ({commande.code_wilaya})
            </Typography>
            <Typography>
              <strong>Commune :</strong> {commande.commune}
            </Typography>
            <Typography>
              <strong>Adresse :</strong> {commande.adresse_exacte || '—'}
            </Typography>
            <Typography>
              <strong>Type de livraison :</strong>{' '}
              {commande.type_livraison === 'DOMICILE' ? 'À domicile' : 'Au bureau'}
              {commande.bureau_livraison ? ` — ${commande.bureau_livraison}` : ''}
            </Typography>
            <Typography>
              <strong>Code de suivi :</strong> {commande.code_tracking || '—'}
            </Typography>
            <Typography>
              <strong>Créée le :</strong> {formaterDate(commande.date_creation)}
            </Typography>
            <Typography>
              <strong>Paiement :</strong> {commande.statut_paiement}
            </Typography>
            {commande.note_admin && (
              <Typography sx={{ mt: 2 }}>
                <strong>Note admin :</strong> {commande.note_admin}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card sx={{ boxShadow: 3 }}>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 4 }}>
              Montants et promo
            </Typography>
            <Typography>
              <strong>Produits :</strong> {formaterMontant(commande.montant_produits)}
            </Typography>
            <Typography>
              <strong>Réduction :</strong> −{formaterMontant(commande.montant_reduction)}
            </Typography>
            <Typography>
              <strong>Frais de livraison :</strong> {formaterMontant(commande.frais_livraison)}
            </Typography>
            <Divider sx={{ my: 3 }} />
            <Typography variant='h6'>
              Total : {formaterMontant(commande.montant_total_final)}
            </Typography>
            <Typography sx={{ mt: 3 }}>
              <strong>Code promo :</strong>{' '}
              {commande.promo
                ? `${commande.promo.code} (${commande.promo.type_reduction === 'POURCENTAGE' ? `${commande.promo.valeur_reduction} %` : `${commande.promo.valeur_reduction} DZD`})`
                : '—'}
            </Typography>
            <Typography sx={{ mt: 2 }}>
              <strong>Commande interne :</strong>{' '}
              {commande.commande_interne
                ? `#${commande.commande_interne.id_cde} — ${formaterDate(commande.commande_interne.date_cde)} — ${formaterMontant(commande.commande_interne.mnt_cde)}`
                : 'Aucune (créée automatiquement à la livraison)'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
                  <TableCell sx={{ color: 'white' }}>Produit</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Quantité</TableCell>
                  <TableCell sx={{ color: 'white' }} align='right'>Prix unitaire</TableCell>
                  <TableCell sx={{ color: 'white' }} align='right'>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(commande.lignes || []).map(ligne => (
                  <TableRow key={ligne.id_ligne}>
                    <TableCell>{ligne.designation_facturee}</TableCell>
                    <TableCell align='center'>{ligne.quantite}</TableCell>
                    <TableCell align='right'>{formaterMontant(ligne.prix_unitaire_facture)}</TableCell>
                    <TableCell align='right'>
                      {formaterMontant(Number(ligne.prix_unitaire_facture) * ligne.quantite)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>

      <Dialog open={dialogStatut} onClose={() => setDialogStatut(false)} fullWidth maxWidth='sm'>
        <DialogTitle>Changer le statut</DialogTitle>
        <DialogContent>
          <Grid container spacing={4} sx={{ pt: 2 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Nouveau statut</InputLabel>
                <Select
                  label='Nouveau statut'
                  value={nouveauStatut}
                  onChange={e => setNouveauStatut(e.target.value)}
                >
                  {STATUTS_COMMANDE.map(s => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Code de suivi (obligatoire pour expédier)'
                value={codeTracking}
                onChange={e => setCodeTracking(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogStatut(false)}>Annuler</Button>
          <Button
            variant='contained'
            onClick={appliquerStatut}
            disabled={!nouveauStatut || nouveauStatut === commande.statut_commande}
          >
            Appliquer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogAnnuler} onClose={() => setDialogAnnuler(false)}>
        <DialogTitle>Annuler cette commande ?</DialogTitle>
        <DialogContent>
          <Typography>
            {commande.commande_interne
              ? 'Une commande interne a déjà été créée pour cette commande : elle sera supprimée et les stocks restaurés.'
              : 'Les quantités réservées seront libérées.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogAnnuler(false)}>Retour</Button>
          <Button variant='contained' color='error' onClick={confirmerAnnulation}>
            Annuler la commande
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogNote} onClose={() => setDialogNote(false)} fullWidth maxWidth='sm'>
        <DialogTitle>Note admin</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label='Note'
            value={noteAdmin}
            onChange={e => setNoteAdmin(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogNote(false)}>Annuler</Button>
          <Button variant='contained' onClick={enregistrerNote}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default CommandeWebDetailView
