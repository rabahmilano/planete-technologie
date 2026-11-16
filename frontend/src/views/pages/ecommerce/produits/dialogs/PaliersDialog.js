import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Box,
  Typography,
  IconButton,
  Tooltip,
  LinearProgress,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material'
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { useProduitEcommerce } from 'src/context/ProduitEcommerceContext'

const PaliersDialog = ({ open, produit, onClose }) => {
  const { fetchPaliersProduit, ajouterPalier, modifierPalier, supprimerPalier } = useProduitEcommerce()

  const [paliers, setPaliers] = useState([])
  const [chargement, setChargement] = useState(false)
  const [quantiteMin, setQuantiteMin] = useState('')
  const [prixUnitaire, setPrixUnitaire] = useState('')
  const [palierEdition, setPalierEdition] = useState(null)
  const [editionQuantiteMin, setEditionQuantiteMin] = useState('')
  const [editionPrixUnitaire, setEditionPrixUnitaire] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const chargerPaliers = useCallback(async () => {
    if (!produit) return
    setChargement(true)
    const donnees = await fetchPaliersProduit(produit.id_prd)
    setPaliers(donnees)
    setChargement(false)
  }, [produit, fetchPaliersProduit])

  useEffect(() => {
    if (open) {
      setQuantiteMin('')
      setPrixUnitaire('')
      setPalierEdition(null)
      chargerPaliers()
    }
  }, [open, chargerPaliers])

  const handleAjouter = async () => {
    setIsLoading(true)
    const success = await ajouterPalier({
      prd_id: produit.id_prd,
      quantite_min: parseInt(quantiteMin, 10),
      prix_unitaire: parseFloat(prixUnitaire)
    })
    setIsLoading(false)
    if (success) {
      setQuantiteMin('')
      setPrixUnitaire('')
      await chargerPaliers()
    }
  }

  const commencerEdition = palier => {
    setPalierEdition(palier.id_palier)
    setEditionQuantiteMin(String(palier.quantite_min))
    setEditionPrixUnitaire(String(palier.prix_unitaire))
  }

  const handleModifier = async () => {
    setIsLoading(true)
    const success = await modifierPalier(palierEdition, {
      quantite_min: parseInt(editionQuantiteMin, 10),
      prix_unitaire: parseFloat(editionPrixUnitaire)
    })
    setIsLoading(false)
    if (success) {
      setPalierEdition(null)
      await chargerPaliers()
    }
  }

  const handleSupprimer = async idPalier => {
    const success = await supprimerPalier(idPalier)
    if (success) await chargerPaliers()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Icon icon='tabler:stairs' />
        Paliers de prix — {produit?.designation_prd}
      </DialogTitle>

      <DialogContent dividers>
        {chargement && <LinearProgress sx={{ mb: 3 }} />}

        <Grid container spacing={4}>
          <Grid item xs={5}>
            <CustomTextField
              fullWidth
              type='number'
              label='Quantité minimum'
              value={quantiteMin}
              onChange={e => setQuantiteMin(e.target.value)}
              InputProps={{ inputProps: { min: 2 } }}
              helperText='Ex : 3 = dès 3 pièces'
            />
          </Grid>
          <Grid item xs={5}>
            <CustomTextField
              fullWidth
              type='number'
              label='Prix unitaire (DA)'
              value={prixUnitaire}
              onChange={e => setPrixUnitaire(e.target.value)}
              InputProps={{ inputProps: { min: 0, step: '0.01' } }}
            />
          </Grid>
          <Grid item xs={2}>
            <Button
              variant='contained'
              fullWidth
              onClick={handleAjouter}
              disabled={!quantiteMin || parseInt(quantiteMin, 10) <= 1 || !prixUnitaire || parseFloat(prixUnitaire) <= 0 || isLoading}
              sx={{ mt: 1.5 }}
            >
              <Icon icon='tabler:plus' />
            </Button>
          </Grid>

          <Grid item xs={12}>
            {paliers.length === 0 && !chargement ? (
              <Typography sx={{ py: 3, textAlign: 'center' }} color='textSecondary'>
                Aucun palier. La boutique appliquera le prix de vente (ou le prix promo) quel que soit la quantité.
              </Typography>
            ) : (
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Quantité minimum</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align='right'>
                        Prix unitaire
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align='center'>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paliers.map(palier =>
                      palierEdition === palier.id_palier ? (
                        <TableRow key={palier.id_palier}>
                          <TableCell>
                            <CustomTextField
                              size='small'
                              type='number'
                              value={editionQuantiteMin}
                              onChange={e => setEditionQuantiteMin(e.target.value)}
                              InputProps={{ inputProps: { min: 2 } }}
                            />
                          </TableCell>
                          <TableCell align='right'>
                            <CustomTextField
                              size='small'
                              type='number'
                              value={editionPrixUnitaire}
                              onChange={e => setEditionPrixUnitaire(e.target.value)}
                              InputProps={{ inputProps: { min: 0, step: '0.01' } }}
                            />
                          </TableCell>
                          <TableCell align='center'>
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                              <IconButton size='small' color='primary' onClick={handleModifier} disabled={isLoading}>
                                <Icon icon='tabler:check' fontSize='1.1rem' />
                              </IconButton>
                              <IconButton size='small' onClick={() => setPalierEdition(null)}>
                                <Icon icon='tabler:x' fontSize='1.1rem' />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={palier.id_palier} hover>
                          <TableCell>À partir de {palier.quantite_min} pièces</TableCell>
                          <TableCell align='right'>{palier.prix_unitaire} DA</TableCell>
                          <TableCell align='center'>
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                              <Tooltip title='Modifier'>
                                <IconButton size='small' onClick={() => commencerEdition(palier)}>
                                  <Icon icon='tabler:edit' fontSize='1.1rem' />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title='Supprimer'>
                                <IconButton size='small' color='error' onClick={() => handleSupprimer(palier.id_palier)}>
                                  <Icon icon='tabler:trash' fontSize='1.1rem' />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Grid>

          <Grid item xs={12}>
            <Typography variant='caption' color='textSecondary'>
              Si la quantité commandée atteint un palier, c'est son prix unitaire qui s'applique à la commande (sinon
              prix promo si active, sinon prix de vente).
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={onClose}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default PaliersDialog
