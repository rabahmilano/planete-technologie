import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  Chip,
  Divider,
  Box,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material'
import dayjs from 'dayjs'
import Icon from 'src/@core/components/icon'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import { formatMontant } from 'src/@core/utils/format'
import { useCommandeWeb } from 'src/context/CommandeWebContext'
import StatutDialog from './StatutDialog'

const couleursStatuts = {
  NOUVELLE: 'primary',
  CONFIRMEE: 'warning',
  EXPEDIEE: 'info',
  LIVREE: 'success',
  ANNULEE: 'error'
}

const DetailCommandeWebView = () => {
  const router = useRouter()
  const { id } = router.query
  const { fetchCommandeWebDetail, annulerCommandeWeb } = useCommandeWeb()

  const [commande, setCommande] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [statutDialog, setStatutDialog] = useState(false)
  const [annulationConfirmee, setAnnulationConfirmee] = useState(false)

  const chargerCommande = useCallback(async () => {
    if (!id) return
    setChargement(true)
    const donnees = await fetchCommandeWebDetail(id)
    setCommande(donnees)
    setChargement(false)
  }, [id, fetchCommandeWebDetail])

  useEffect(() => {
    chargerCommande()
  }, [chargerCommande])

  const confirmerAnnulation = async () => {
    const success = await annulerCommandeWeb(commande.id_cmd_web)
    if (success) {
      setAnnulationConfirmee(false)
      chargerCommande()
    }
  }

  if (chargement) return <LinearProgress sx={{ mt: 8 }} />

  if (!commande) {
    return (
      <Card sx={{ mt: 6 }}>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <Typography>Commande introuvable.</Typography>
          <Button variant='outlined' sx={{ mt: 4 }} onClick={() => router.push('/ecommerce/commandes-web')}>
            Retour à la liste
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title='Retour à la liste'>
              <IconButton onClick={() => router.push('/ecommerce/commandes-web')}>
                <Icon icon='tabler:arrow-left' />
              </IconButton>
            </Tooltip>
            <Typography variant='h5'>
              Commande web #{commande.id_cmd_web}
            </Typography>
            <Chip label={commande.statut_commande} color={couleursStatuts[commande.statut_commande] || 'default'} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {commande.statut_commande !== 'ANNULEE' && (
              <>
                <Button variant='contained' startIcon={<Icon icon='tabler:refresh-dot' />} onClick={() => setStatutDialog(true)}>
                  Changer le statut
                </Button>
                <Button variant='outlined' color='error' startIcon={<Icon icon='tabler:ban' />} onClick={() => setAnnulationConfirmee(true)}>
                  Annuler la commande
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card sx={{ boxShadow: 3 }}>
          <CardHeader title='Client' avatar={<Icon icon='tabler:user' />} />
          <CardContent sx={{ pt: 0 }}>
            <Typography sx={{ fontWeight: 600 }}>{commande.nom_client}</Typography>
            <Typography variant='body2' color='textSecondary'>
              Téléphone : {commande.telephone}
            </Typography>
            <Divider sx={{ my: 3 }} />
            <Typography variant='subtitle2'>Livraison</Typography>
            <Typography variant='body2'>
              {commande.wilaya}
              {commande.code_wilaya ? ` (${commande.code_wilaya})` : ''} · {commande.commune}
            </Typography>
            {commande.adresse_exacte && (
              <Typography variant='body2' color='textSecondary'>
                {commande.adresse_exacte}
              </Typography>
            )}
            <Typography variant='body2' sx={{ mt: 2 }}>
              Type :{' '}
              <strong>
                {commande.type_livraison === 'BUREAU' ? `Bureau Yalidine — ${commande.bureau_livraison || 'non précisé'}` : 'À domicile'}
              </strong>
            </Typography>
            {commande.code_tracking && (
              <Typography variant='body2' sx={{ mt: 2 }}>
                Suivi : <strong>{commande.code_tracking}</strong>
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card sx={{ boxShadow: 3 }}>
          <CardHeader title='Récapitulatif' avatar={<Icon icon='tabler:receipt' />} />
          <CardContent sx={{ pt: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant='body2'>Produits</Typography>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {formatMontant(commande.montant_produits)} DA
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant='body2'>
                Réduction{commande.promo ? ` (${commande.promo.code})` : ''}
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 600, color: commande.montant_reduction > 0 ? 'error.main' : 'inherit' }}>
                -{formatMontant(commande.montant_reduction)} DA
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant='body2'>Livraison</Typography>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {formatMontant(commande.frais_livraison)} DA
              </Typography>
            </Box>
            <Divider sx={{ my: 3 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 700 }}>Total à encaisser</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '1.15rem', color: 'success.main' }}>
                {formatMontant(commande.montant_total_final)} DA
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Typography variant='body2'>Créée le</Typography>
              <Typography variant='body2'>{dayjs(commande.date_creation).format('DD/MM/YYYY HH:mm')}</Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3 }}>
          <CardHeader title='Produits commandés' avatar={<Icon icon='tabler:package' />} />
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
                  <TableCell sx={{ color: 'white' }}>Produit</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>
                    Quantité
                  </TableCell>
                  <TableCell sx={{ color: 'white' }} align='right'>
                    Prix unitaire facturé
                  </TableCell>
                  <TableCell sx={{ color: 'white' }} align='right'>
                    Total ligne
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {commande.lignes.map(ligne => (
                  <TableRow key={ligne.id_ligne} hover>
                    <TableCell>
                      {ligne.designation_facturee || ligne.produit?.designation_prd || `#${ligne.prd_id}`}
                      <Typography variant='caption' color='textSecondary' sx={{ display: 'block' }}>
                        Réf. interne : #{ligne.prd_id}
                      </Typography>
                    </TableCell>
                    <TableCell align='center'>{ligne.quantite}</TableCell>
                    <TableCell align='right'>{formatMontant(ligne.prix_unitaire_facture)} DA</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 600 }}>
                      {formatMontant(parseFloat(ligne.prix_unitaire_facture) * ligne.quantite)} DA
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>

      <StatutDialog
        open={statutDialog}
        commande={commande}
        onClose={() => {
          setStatutDialog(false)
          chargerCommande()
        }}
      />

      <ConfirmDialog
        open={annulationConfirmee}
        handleClose={() => setAnnulationConfirmee(false)}
        handleConfirm={confirmerAnnulation}
        actionType='delete'
        title='Annuler cette commande web ?'
        confirmText='Annuler la commande'
        content={
          <Typography variant='body1'>
            La commande <strong>#{commande.id_cmd_web}</strong> sera marquée ANNULEE et les quantités réservées seront
            libérées du stock.
          </Typography>
        }
      />
    </Grid>
  )
}

export default DetailCommandeWebView
