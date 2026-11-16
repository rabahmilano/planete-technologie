import { useEffect, useState, useRef } from 'react'
import { Grid, Card, CardHeader, TextField, MenuItem, InputAdornment } from '@mui/material'
import Icon from 'src/@core/components/icon'
import { useProduitEcommerce } from 'src/context/ProduitEcommerceContext'
import { useFamille } from 'src/context/FamilleContext'
import ProduitsTable from './ProduitsTable'
import ProduitInfoDialog from './dialogs/ProduitInfoDialog'
import PrixPromoDialog from './dialogs/PrixPromoDialog'
import ImagesDialog from './dialogs/ImagesDialog'
import PaliersDialog from './dialogs/PaliersDialog'
import HistoriquePrixDialog from './dialogs/HistoriquePrixDialog'

const statutsPublication = ['BROUILLON', 'PUBLIE', 'ARCHIVE']

const ProduitsEcommerceView = () => {
  const { fetchProduits } = useProduitEcommerce()
  const { familles, fetchFamilles } = useFamille()

  const [rechercheSaisie, setRechercheSaisie] = useState('')
  const [search, setSearch] = useState('')
  const [statut, setStatut] = useState('')
  const [familleId, setFamilleId] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(25)

  const [produitSelectionne, setProduitSelectionne] = useState(null)
  const [dialogActif, setDialogActif] = useState(null)

  const isInitialMount = useRef(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(rechercheSaisie)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [rechercheSaisie])

  useEffect(() => {
    fetchFamilles()
  }, [fetchFamilles])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
    }
    fetchProduits(page, limit, { search, statut, familleId })
  }, [fetchProduits, page, limit, search, statut, familleId])

  const rafraichir = () => fetchProduits(page, limit, { search, statut, familleId })

  const ouvrirDialog = (produit, type) => {
    setProduitSelectionne(produit)
    setDialogActif(type)
  }

  const fermerDialog = () => {
    setDialogActif(null)
    setProduitSelectionne(null)
    rafraichir()
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3 }}>
          <CardHeader
            title='Boutique — Produits'
            subheader='Fiche e-commerce des produits : famille, publication, prix, promo, images et paliers'
            action={
              <TextField
                size='small'
                sx={{ width: 260 }}
                placeholder='Rechercher un produit...'
                value={rechercheSaisie}
                onChange={e => setRechercheSaisie(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Icon icon='tabler:search' fontSize='1.15rem' />
                    </InputAdornment>
                  )
                }}
              />
            }
          />
          <Grid container spacing={4} sx={{ px: 4, pt: 1 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                size='small'
                label='Statut de publication'
                value={statut}
                onChange={e => {
                  setStatut(e.target.value)
                  setPage(1)
                }}
              >
                <MenuItem value=''>Tous les statuts</MenuItem>
                {statutsPublication.map(statutOption => (
                  <MenuItem key={statutOption} value={statutOption}>
                    {statutOption}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                size='small'
                label='Famille'
                value={familleId}
                onChange={e => {
                  setFamilleId(e.target.value)
                  setPage(1)
                }}
              >
                <MenuItem value=''>Toutes les familles</MenuItem>
                {familles.map(famille => (
                  <MenuItem key={famille.id_famille} value={famille.id_famille}>
                    {famille.nom_famille}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
          <ProduitsTable
            page={page}
            setPage={setPage}
            limit={limit}
            onOuvrirDialog={ouvrirDialog}
            refreshData={rafraichir}
          />
        </Card>
      </Grid>

      <ProduitInfoDialog
        open={dialogActif === 'info'}
        produit={produitSelectionne}
        onClose={fermerDialog}
      />
      <PrixPromoDialog
        open={dialogActif === 'prix'}
        produit={produitSelectionne}
        onClose={fermerDialog}
      />
      <ImagesDialog
        open={dialogActif === 'images'}
        produit={produitSelectionne}
        onClose={fermerDialog}
        refreshData={rafraichir}
      />
      <PaliersDialog
        open={dialogActif === 'paliers'}
        produit={produitSelectionne}
        onClose={fermerDialog}
      />
      <HistoriquePrixDialog
        open={dialogActif === 'historique'}
        produit={produitSelectionne}
        onClose={fermerDialog}
      />
    </Grid>
  )
}

export default ProduitsEcommerceView
