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
  Avatar,
  IconButton,
  Tooltip,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText
} from '@mui/material'
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { useProduitEcommerce } from 'src/context/ProduitEcommerceContext'

const ImagesDialog = ({ open, produit, onClose, refreshData }) => {
  const { fetchImagesProduit, ajouterImage, supprimerImage, definirImagePrincipale } = useProduitEcommerce()

  const [images, setImages] = useState([])
  const [chargement, setChargement] = useState(false)
  const [urlImage, setUrlImage] = useState('')
  const [enPrincipale, setEnPrincipale] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const chargerImages = useCallback(async () => {
    if (!produit) return
    setChargement(true)
    const donnees = await fetchImagesProduit(produit.id_prd)
    setImages(donnees)
    setChargement(false)
  }, [produit, fetchImagesProduit])

  useEffect(() => {
    if (open) {
      setUrlImage('')
      setEnPrincipale(false)
      chargerImages()
    }
  }, [open, chargerImages])

  const handleAjouter = async () => {
    setIsLoading(true)
    const success = await ajouterImage({
      prd_id: produit.id_prd,
      url_image: urlImage.trim(),
      est_principale: enPrincipale
    })
    setIsLoading(false)
    if (success) {
      setUrlImage('')
      setEnPrincipale(false)
      await chargerImages()
      refreshData()
    }
  }

  const handlePrincipale = async idImg => {
    const success = await definirImagePrincipale(idImg)
    if (success) {
      await chargerImages()
      refreshData()
    }
  }

  const handleSupprimer = async idImg => {
    const success = await supprimerImage(idImg)
    if (success) {
      await chargerImages()
      refreshData()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Icon icon='tabler:photo' />
        Images — {produit?.designation_prd}
      </DialogTitle>

      <DialogContent dividers>
        {chargement && <LinearProgress sx={{ mb: 3 }} />}

        <Grid container spacing={4}>
          <Grid item xs={12} sm={8}>
            <CustomTextField
              fullWidth
              label="URL de l'image"
              value={urlImage}
              onChange={e => setUrlImage(e.target.value)}
              placeholder='https://...'
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <Box sx={{ pt: 1.5 }}>
              <Button variant={enPrincipale ? 'contained' : 'outlined'} size='small' onClick={() => setEnPrincipale(!enPrincipale)}>
                {enPrincipale ? 'Principale' : 'Secondaire'}
              </Button>
            </Box>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Button
              variant='contained'
              fullWidth
              onClick={handleAjouter}
              disabled={!urlImage.trim() || isLoading}
              sx={{ mt: 1 }}
            >
              Ajouter
            </Button>
          </Grid>

          <Grid item xs={12}>
            {images.length === 0 && !chargement ? (
              <Typography sx={{ py: 3, textAlign: 'center' }} color='textSecondary'>
                Aucune image pour ce produit. La première image ajoutée devient automatiquement l'image principale.
              </Typography>
            ) : (
              <List sx={{ py: 0 }}>
                {images.map(image => (
                  <ListItem
                    key={image.id_img}
                    sx={{ borderBottom: theme => `1px solid ${theme.palette.divider}` }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {!image.est_principale && (
                          <Tooltip title="Définir comme image principale">
                            <IconButton size='small' color='primary' onClick={() => handlePrincipale(image.id_img)}>
                              <Icon icon='tabler:star' fontSize='1.1rem' />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title='Supprimer'>
                          <IconButton size='small' color='error' onClick={() => handleSupprimer(image.id_img)}>
                            <Icon icon='tabler:trash' fontSize='1.1rem' />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar src={image.url_image} variant='rounded' sx={{ width: 56, height: 56 }} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant='body2' sx={{ wordBreak: 'break-all' }}>
                            {image.url_image}
                          </Typography>
                          {image.est_principale && <Chip size='small' color='primary' label='Principale' />}
                        </Box>
                      }
                      secondary={`Ordre : ${image.ordre_image}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
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

export default ImagesDialog
