import { useState, useEffect, useContext } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Box,
  InputAdornment,
  MenuItem,
  IconButton,
  Divider
} from '@mui/material'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import axios from 'axios'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'

// Contexts
import { useCompte } from 'src/context/CompteContext'
import { VoyageContext } from 'src/context/VoyageContext'

const defaultValues = {
  fournisseur: '',
  cptPaiementId: '',
  deviseFacture: 'CNY',
  tauxDzd: '',
  montantFacture: '',
  montantDebite: '',
  articles: [{ desPrd: '', catId: '', qte: '', puDevise: '' }]
}

const AddTransactionModal = ({ open, handleClose, voyageId, deviseDest, onSuccess }) => {
  const { comptes } = useCompte()
  const { addTransactionVoyage } = useContext(VoyageContext)

  const [categories, setCategories] = useState([])
  const [openConfirm, setOpenConfirm] = useState(false)
  const [formDataToSubmit, setFormDataToSubmit] = useState(null)

  const { control, handleSubmit, reset, watch, setValue } = useForm({ defaultValues })

  // useFieldArray gère la liste dynamique des articles de manière très optimisée
  const { fields, append, remove } = useFieldArray({ control, name: 'articles' })

  // Initialisation de la devise par défaut selon le voyage
  useEffect(() => {
    if (open && deviseDest) setValue('deviseFacture', deviseDest)
  }, [open, deviseDest, setValue])

  // Récupération des catégories de produits pour le menu déroulant
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/categories`) // Ajuste l'URL si nécessaire
        setCategories(res.data)
      } catch (error) {
        console.error('Erreur chargement catégories', error)
      }
    }
    fetchCategories()
  }, [])

  const onClose = () => {
    reset()
    handleClose()
  }

  // Interception
  const onPreSubmit = data => {
    setFormDataToSubmit(data)
    setOpenConfirm(true)
  }

  // Exécution finale
  const executeApiCall = async () => {
    setOpenConfirm(false)
    const data = formDataToSubmit

    const payload = {
      idVoyage: parseInt(voyageId),
      cptPaiementId: parseInt(data.cptPaiementId),
      fournisseur: data.fournisseur,
      deviseFacture: data.deviseFacture,
      tauxDzd: parseFloat(data.tauxDzd),
      montantFacture: parseFloat(data.montantFacture),
      montantDebite: parseFloat(data.montantDebite),
      commBanque: 0,
      commPaiement: 0,
      articles: data.articles.map(a => ({
        desPrd: a.desPrd,
        catId: parseInt(a.catId),
        qte: parseInt(a.qte),
        puDevise: parseFloat(a.puDevise)
      }))
    }

    try {
      await addTransactionVoyage(payload)
      reset()
      onClose()
      if (onSuccess) onSuccess() // Rafraîchit la page de détails
    } catch (error) {
      // L'erreur est gérée par les Toasts du VoyageContext
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth='lg' scroll='body'>
        <DialogTitle sx={{ pb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Icon icon='tabler:receipt' fontSize='1.75rem' color='#primary.main' />
            <Typography variant='h5'>Ajouter une facture d'achat</Typography>
          </Box>
        </DialogTitle>

        <form onSubmit={handleSubmit(onPreSubmit)}>
          <DialogContent sx={{ pb: 6 }}>
            {/* --- BLOC 1 : INFOS DE LA FACTURE --- */}
            <Typography variant='subtitle2' sx={{ mb: 4, fontWeight: 600, color: 'primary.main' }}>
              1. Informations Générales
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={4}>
                <Controller
                  name='fournisseur'
                  control={control}
                  render={({ field }) => <CustomTextField {...field} fullWidth label='Fournisseur (Optionnel)' />}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name='cptPaiementId'
                  control={control}
                  rules={{ required: 'Obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextField
                      select
                      fullWidth
                      label='Compte de paiement (Carte)'
                      error={!!error}
                      helperText={error?.message}
                      {...field}
                    >
                      {comptes.map(c => (
                        <MenuItem key={c.id_cpt} value={c.id_cpt}>
                          {c.designation_cpt} ({c.dev_code})
                        </MenuItem>
                      ))}
                    </CustomTextField>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name='deviseFacture'
                  control={control}
                  rules={{ required: 'Obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      label='Devise de la facture'
                      error={!!error}
                      helperText={error?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name='montantFacture'
                  control={control}
                  rules={{ required: 'Obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      type='number'
                      label='Montant Total (Facture)'
                      error={!!error}
                      helperText={error?.message}
                      InputProps={{
                        endAdornment: <InputAdornment position='end'>{watch('deviseFacture')}</InputAdornment>
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name='montantDebite'
                  control={control}
                  rules={{ required: 'Obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      type='number'
                      label='Montant prélevé sur la carte'
                      error={!!error}
                      helperText={error?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name='tauxDzd'
                  control={control}
                  rules={{ required: 'Obligatoire' }}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      type='number'
                      label={`Taux douanier (1 ${watch('deviseFacture')} = ? DZD)`}
                      error={!!error}
                      helperText={error?.message}
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 6 }} />

            {/* --- BLOC 2 : LISTE DES ARTICLES --- */}
            <Typography variant='subtitle2' sx={{ mb: 4, fontWeight: 600, color: 'primary.main' }}>
              2. Détail des articles (Colis)
            </Typography>

            {fields.map((item, index) => (
              <Grid container spacing={4} key={item.id} alignItems='center' sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}>
                  <Controller
                    name={`articles.${index}.desPrd`}
                    control={control}
                    rules={{ required: 'Obligatoire' }}
                    render={({ field, fieldState: { error } }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        label='Désignation Produit'
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Controller
                    name={`articles.${index}.catId`}
                    control={control}
                    rules={{ required: 'Obligatoire' }}
                    render={({ field, fieldState: { error } }) => (
                      <CustomTextField
                        select
                        fullWidth
                        label='Catégorie'
                        error={!!error}
                        helperText={error?.message}
                        {...field}
                      >
                        {categories.map(cat => (
                          <MenuItem key={cat.id_cat} value={cat.id_cat}>
                            {cat.designation_cat}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Controller
                    name={`articles.${index}.qte`}
                    control={control}
                    rules={{ required: 'Obligatoire', min: 1 }}
                    render={({ field, fieldState: { error } }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        type='number'
                        label='Quantité'
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Controller
                    name={`articles.${index}.puDevise`}
                    control={control}
                    rules={{ required: 'Obligatoire', min: 0.01 }}
                    render={({ field, fieldState: { error } }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        type='number'
                        label={`PU (${watch('deviseFacture')})`}
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={1}>
                  <IconButton color='error' onClick={() => remove(index)} disabled={fields.length === 1}>
                    <Icon icon='tabler:trash' />
                  </IconButton>
                </Grid>
              </Grid>
            ))}

            <Button
              variant='outlined'
              color='primary'
              startIcon={<Icon icon='tabler:plus' />}
              onClick={() => append({ desPrd: '', catId: '', qte: '', puDevise: '' })}
            >
              Ajouter un article
            </Button>
          </DialogContent>
          <DialogActions sx={{ pb: 6, px: 6 }}>
            <Button variant='tonal' color='secondary' onClick={onClose}>
              Annuler
            </Button>
            <Button type='submit' variant='contained'>
              Enregistrer la facture
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={openConfirm}
        handleClose={() => setOpenConfirm(false)}
        handleConfirm={executeApiCall}
        actionType='create'
        title='Confirmer la facture'
        content={
          <Typography variant='body1'>
            Vous êtes sur le point d'imputer une facture de{' '}
            <strong>
              {formDataToSubmit?.montantFacture} {formDataToSubmit?.deviseFacture}
            </strong>{' '}
            (qui sera prélevée sur votre carte) contenant{' '}
            <strong>{formDataToSubmit?.articles?.length} article(s)</strong> à ce voyage. Confirmez-vous ?
          </Typography>
        }
      />
    </>
  )
}

export default AddTransactionModal
