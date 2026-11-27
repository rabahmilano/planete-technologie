import { useEffect, useState } from 'react'
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
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import BanniereSynchroLivraison from 'src/components/BanniereSynchroLivraison'
import { useTarifLivraison } from 'src/context/TarifLivraisonContext'

// Phase 7 : la grille de secours (CRUD tarif_livraison) a été supprimée —
// cette page ne montre plus que le référentiel Yalidine par commune : bannière
// D7, déclencheurs de synchronisation (globale + par wilaya), journal, détail
// des communes avec les 4 tarifs et le filtre « communes avec bureau ».
const TarifsLivraisonView = () => {
  const {
    synchroEnCours,
    journal,
    fetchJournal,
    synchroniserGlobale,
    synchroniserWilaya,
    referentiel,
    fetchReferentiel,
    communesWilaya,
    fetchCommunesWilaya
  } = useTarifLivraison()
  const [confirmationSynchro, setConfirmationSynchro] = useState(false)
  const [dialogWilaya, setDialogWilaya] = useState(null)
  const [filtreBureau, setFiltreBureau] = useState(false)

  useEffect(() => {
    fetchJournal()
    fetchReferentiel()
  }, [fetchJournal, fetchReferentiel])

  const lancerSynchronisation = async () => {
    setConfirmationSynchro(false)
    await synchroniserGlobale()
    await fetchReferentiel()
  }

  const synchroniserCetteWilaya = async code => {
    const resultat = await synchroniserWilaya(code)
    if (resultat) {
      await fetchReferentiel()
      if (dialogWilaya === code) await fetchCommunesWilaya(code)
    }
  }

  const ouvrirDetailWilaya = code => {
    setFiltreBureau(false)
    setDialogWilaya(code)
    fetchCommunesWilaya(code)
  }

  const libellePortee = portee =>
    portee === 'AUTO' ? 'Automatique (hebdomadaire)' : 'Manuelle'

  const communesAffichees =
    (communesWilaya?.communes || []).filter(c => (filtreBureau ? c.a_bureau : true))

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <BanniereSynchroLivraison />
      </Grid>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant='h5'>Tarifs de livraison</Typography>
          <Button
            variant='contained'
            startIcon={<Icon icon='tabler:refresh' />}
            disabled={synchroEnCours}
            onClick={() => setConfirmationSynchro(true)}
          >
            {synchroEnCours ? 'Synchronisation en cours…' : 'Synchroniser les tarifs'}
          </Button>
        </Box>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 4 }}>
          Tarifs Yalidine stockés par commune (58 wilayas). La synchronisation
          écrase les montants en base avec les valeurs officielles du jour —
          le devis de la boutique les lit directement.
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3, position: 'relative' }}>
          {synchroEnCours && <LinearProgress sx={{ position: 'absolute', top: 0, width: '100%', zIndex: 1 }} />}
          <CardContent sx={{ pt: 4, pb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant='h6'>Wilayas du référentiel Yalidine</Typography>
              <Button size='small' startIcon={<Icon icon='tabler:reload' />} onClick={() => fetchReferentiel()}>
                Actualiser
              </Button>
            </Box>
            <TableContainer>
              <Table sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
                    <TableCell sx={{ color: 'white' }} align='center'>Code</TableCell>
                    <TableCell sx={{ color: 'white' }}>Wilaya</TableCell>
                    <TableCell sx={{ color: 'white' }} align='center'>Livrable</TableCell>
                    <TableCell sx={{ color: 'white' }} align='center'>Communes</TableCell>
                    <TableCell sx={{ color: 'white' }} align='center'>Avec bureau</TableCell>
                    <TableCell sx={{ color: 'white' }} align='center'>Bureaux</TableCell>
                    <TableCell sx={{ color: 'white' }}>Tarifs (dom./bur. express · écon.)</TableCell>
                    <TableCell sx={{ color: 'white' }}>Dernière synchro</TableCell>
                    <TableCell sx={{ color: 'white' }} align='center'>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(referentiel || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align='center'>
                        <Typography sx={{ py: 3 }}>Référentiel vide — lancez une synchronisation.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    referentiel.map(wilaya => (
                      <TableRow key={wilaya.code_wilaya}>
                        <TableCell align='center'>{wilaya.code_wilaya}</TableCell>
                        <TableCell>{wilaya.nom_wilaya}</TableCell>
                        <TableCell align='center'>
                          <Chip
                            label={wilaya.livrable ? 'Livrable' : 'Non livrable'}
                            color={wilaya.livrable ? 'success' : 'error'}
                            size='small'
                          />
                        </TableCell>
                        <TableCell align='center'>{wilaya.nb_communes}</TableCell>
                        <TableCell align='center'>{wilaya.nb_communes_bureau}</TableCell>
                        <TableCell align='center'>{wilaya.nb_bureaux}</TableCell>
                        <TableCell>
                          {wilaya.tarifs_uniformes
                            ? `${wilaya.tarifs_uniformes.map(t => (t === null ? '—' : Number(t))).join(' / ')} DZD`
                            : 'Variable selon la commune'}
                        </TableCell>
                        <TableCell>
                          {wilaya.date_synchro ? new Date(wilaya.date_synchro).toLocaleString('fr-FR') : '—'}
                        </TableCell>
                        <TableCell align='center'>
                          <IconButton
                            size='small'
                            title='Synchroniser cette wilaya (re-fetch communes, bureaux et tarifs)'
                            disabled={synchroEnCours}
                            onClick={() => synchroniserCetteWilaya(wilaya.code_wilaya)}
                          >
                            <Icon icon='tabler:refresh' />
                          </IconButton>
                          <IconButton size='small' title='Détail des communes' onClick={() => ouvrirDetailWilaya(wilaya.code_wilaya)}>
                            <Icon icon='tabler:eye' />
                          </IconButton>
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

      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3, position: 'relative' }}>
          {synchroEnCours && <LinearProgress sx={{ position: 'absolute', top: 0, width: '100%', zIndex: 1 }} />}
          <CardContent sx={{ pt: 4, pb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant='h6'>Journal des synchronisations</Typography>
              <Button size='small' startIcon={<Icon icon='tabler:reload' />} onClick={() => fetchJournal()}>
                Actualiser
              </Button>
            </Box>
            {journal.length === 0 ? (
              <Typography variant='body2' color='text.secondary'>
                Aucune synchronisation enregistrée depuis le démarrage du serveur. La synchro automatique
                hebdomadaire et les boutons ci-dessus alimentent ce journal.
              </Typography>
            ) : (
              journal.map((entree, index) => (
                <Box
                  key={index}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1, borderBottom: index < journal.length - 1 ? 1 : 0, borderColor: 'divider' }}
                >
                  <Chip size='small' color={entree.ok ? 'success' : 'warning'} label={entree.ok ? 'OK' : 'Partielle'} />
                  <Typography variant='body2' sx={{ minWidth: 100 }}>
                    {entree.wilaya ? `Wilaya ${entree.wilaya}` : 'Globale'}
                  </Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ flex: 1 }}>
                    {libellePortee(entree.portee)} — {entree.communes ?? 0} communes, {entree.bureaux ?? 0} bureaux
                    {entree.wilayas_erreur?.length ? ` — ${entree.wilayas_erreur.length} wilaya(s) en erreur` : ''}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {new Date(entree.date).toLocaleString('fr-FR')}
                  </Typography>
                </Box>
              ))
            )}
          </CardContent>
        </Card>
      </Grid>

      <Dialog open={Boolean(dialogWilaya)} onClose={() => setDialogWilaya(null)} fullScreen>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant='h6'>
              Wilaya {dialogWilaya} — {communesWilaya?.communes?.[0]?.nom_wilaya_commune || ''}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              Supplément surpoids : {Number(communesWilaya?.communes?.[0]?.oversize_fee ?? 0)} DZD par kg au-delà
              de 5 kg · frais de retour : {Number(communesWilaya?.communes?.[0]?.retour_fee ?? 0)} DZD
            </Typography>
          </Box>
          <IconButton onClick={() => setDialogWilaya(null)}>
            <Icon icon='tabler:x' />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <FormControlLabel
            sx={{ mb: 3 }}
            control={<Switch checked={filtreBureau} onChange={e => setFiltreBureau(e.target.checked)} />}
            label='Seulement les communes avec bureau'
          />
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
                  <TableCell sx={{ color: 'white' }}>Commune</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Livrable</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Délai (j)</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Bureau</TableCell>
                  <TableCell sx={{ color: 'white' }} align='right'>Domicile express</TableCell>
                  <TableCell sx={{ color: 'white' }} align='right'>Bureau express</TableCell>
                  <TableCell sx={{ color: 'white' }} align='right'>Écon. domicile</TableCell>
                  <TableCell sx={{ color: 'white' }} align='right'>Écon. bureau</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {communesAffichees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align='center'>
                      <Typography sx={{ py: 3 }}>
                        {communesWilaya
                          ? 'Aucune commune dans ce filtre.'
                          : 'Chargement des communes…'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  communesAffichees.map(commune => (
                    <TableRow key={commune.id_commune}>
                      <TableCell>{commune.nom_commune}</TableCell>
                      <TableCell align='center'>
                        <Chip
                          label={commune.livrable ? 'Oui' : 'Non'}
                          color={commune.livrable ? 'success' : 'default'}
                          size='small'
                        />
                      </TableCell>
                      <TableCell align='center'>{commune.delai_livraison_jours ?? '—'}</TableCell>
                      <TableCell align='center'>
                        {commune.a_bureau
                          ? `Oui (${commune._count?.bureaux ?? 0} bureau${(commune._count?.bureaux ?? 0) > 1 ? 'x' : ''})`
                          : 'Non'}
                      </TableCell>
                      <TableCell align='right'>{Number(commune.express_home)} DZD</TableCell>
                      <TableCell align='right'>{Number(commune.express_desk)} DZD</TableCell>
                      <TableCell align='right'>
                        {commune.economic_home === null ? '—' : `${Number(commune.economic_home)} DZD`}
                      </TableCell>
                      <TableCell align='right'>
                        {commune.economic_desk === null ? '—' : `${Number(commune.economic_desk)} DZD`}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogWilaya(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmationSynchro}
        onClose={() => !synchroEnCours && setConfirmationSynchro(false)}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>Synchroniser tous les tarifs ?</DialogTitle>
        <DialogContent>
          <Typography>
            La synchronisation globale interroge l&apos;API Yalidine pour les 58 wilayas (environ 62 appels,
            ~2 minutes) : wilayas, communes, bureaux et tarifs sont écrasés en base avec les valeurs
            officielles du jour.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmationSynchro(false)} disabled={synchroEnCours}>
            Annuler
          </Button>
          <Button variant='contained' onClick={lancerSynchronisation} disabled={synchroEnCours}>
            Synchroniser
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default TarifsLivraisonView
