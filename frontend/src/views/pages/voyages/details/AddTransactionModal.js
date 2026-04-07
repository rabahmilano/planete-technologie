import { useState, useEffect, useContext } from 'react'
import { Drawer, Box, Typography, IconButton, Button, Grid } from '@mui/material'
import { useForm } from 'react-hook-form'
import dayjs from 'dayjs'

import Icon from 'src/@core/components/icon'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import { formatMontant } from 'src/@core/utils/format'

import { VoyageContext } from 'src/context/VoyageContext'
import { useCompte } from 'src/context/CompteContext'
import { useProduit } from 'src/context/ProduitContext'

import InfosGlobalesForm from './InfosGlobalesForm'
import ArticlesPanier from './ArticlesPanier'
import RecapitulatifFinancier from './RecapitulatifFinancier'

const defaultValues = {
  fournisseur: '',
  dateAchat: null,
  cptPaiementId: '',
  deviseFacture: '',
  tauxChange: '',
  fraisIntermediaire: '',
  articles: [{ desPrd: '', catId: '', qte: '', puDevise: '' }]
}

const AddTransactionModal = ({ open, handleClose, voyageId, onSuccess }) => {
  const { comptes } = useCompte()
  const { addTransactionVoyage, getVoyageById } = useContext(VoyageContext)
  const { listCategorie } = useProduit()

  const [minDate, setMinDate] = useState(null)
  const [maxDate, setMaxDate] = useState(null)

  const [openConfirm, setOpenConfirm] = useState(false)
  const [formDataToSubmit, setFormDataToSubmit] = useState(null)

  const { control, handleSubmit, reset, watch, setValue } = useForm({ defaultValues })

  useEffect(() => {
    if (open && voyageId) {
      const initDonneesVoyage = async () => {
        const v = await getVoyageById(voyageId)
        if (v) {
          setValue('deviseFacture', v.dev_dest || '')
          setValue('tauxChange', v.taux_change || '')
          setValue('cptPaiementId', v.cpt_defaut_id || '')

          if (v.date_dep) setMinDate(dayjs(v.date_dep))
          if (v.date_ret) setMaxDate(dayjs(v.date_ret))
          setValue('dateAchat', v.date_dep ? dayjs(v.date_dep) : dayjs())
        }
      }
      initDonneesVoyage()
    }
  }, [open, voyageId, setValue, getVoyageById])

  const watchArticles = watch('articles')
  const watchFraisInt = watch('fraisIntermediaire')
  const watchCptId = watch('cptPaiementId')
  const watchDevise = watch('deviseFacture')

  const totalFacture =
    watchArticles?.reduce((acc, item) => {
      const qte = parseFloat(item.qte) || 0
      const pu = parseFloat(item.puDevise) || 0
      return acc + qte * pu
    }, 0) || 0

  const fraisIntermediaire = parseFloat(watchFraisInt) || 0
  const sousTotal = totalFacture + fraisIntermediaire

  const selectedCpt = comptes.find(c => c.id_cpt === watchCptId)
  const commissionPct = selectedCpt ? parseFloat(selectedCpt.commission_pct || 0) : 0
  const fraisCarte = sousTotal * (commissionPct / 100)

  const montantPreleve = sousTotal + fraisCarte

  const onClose = () => {
    reset()
    handleClose()
  }

  const onPreSubmit = data => {
    setFormDataToSubmit(data)
    setOpenConfirm(true)
  }

  const executeApiCall = async () => {
    setOpenConfirm(false)
    const data = formDataToSubmit

    const payload = {
      idVoyage: parseInt(voyageId, 10),
      cptPaiementId: parseInt(data.cptPaiementId, 10),
      fournisseur: data.fournisseur,
      dateAchat: dayjs(data.dateAchat).toISOString(),
      deviseFacture: data.deviseFacture,
      tauxDzd: parseFloat(data.tauxChange),
      montantFacture: totalFacture,
      montantDebite: montantPreleve,
      commPaiement: fraisIntermediaire,
      commBanque: fraisCarte,
      articles: data.articles.map(a => ({
        desPrd: a.desPrd,
        catId: parseInt(a.catId, 10),
        qte: parseInt(a.qte, 10),
        puDevise: parseFloat(a.puDevise)
      }))
    }

    try {
      await addTransactionVoyage(payload)
      reset()
      onClose()
      if (onSuccess) onSuccess()
    } catch (error) {}
  }

  return (
    <>
      <Drawer
        open={open}
        anchor='right'
        variant='temporary'
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{ '& .MuiDrawer-paper': { width: '100%' } }}
      >
        <form onSubmit={handleSubmit(onPreSubmit)} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 5,
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              backgroundColor: '#ffffff'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(40, 199, 111, 0.1)',
                  borderRadius: 1,
                  p: 2
                }}
              >
                <Icon icon='tabler:shopping-cart-plus' fontSize='1.75rem' color='#28c76f' />
              </Box>
              <Typography variant='h5'>Nouvel Achat (Facture)</Typography>
            </Box>
            <IconButton size='small' onClick={onClose} sx={{ color: 'text.secondary' }}>
              <Icon icon='tabler:x' fontSize='1.5rem' />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', p: 6, backgroundColor: '#f5f5f9' }}>
            <Grid container spacing={6}>
              <Grid item xs={12} md={8} lg={9}>
                <InfosGlobalesForm control={control} minDate={minDate} maxDate={maxDate} comptes={comptes} />
                <Box sx={{ my: 6 }} />
                <ArticlesPanier control={control} watch={watch} categories={listCategorie} />
              </Grid>

              <Grid item xs={12} md={4} lg={3}>
                <RecapitulatifFinancier
                  control={control}
                  watchDevise={watchDevise}
                  totalFacture={totalFacture}
                  commissionPct={commissionPct}
                  fraisCarte={fraisCarte}
                  montantPreleve={montantPreleve}
                />
              </Grid>
            </Grid>
          </Box>

          <Box
            sx={{
              p: 5,
              borderTop: '1px solid rgba(0,0,0,0.08)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 2,
              backgroundColor: '#ffffff'
            }}
          >
            <Button variant='tonal' color='secondary' onClick={onClose}>
              Annuler
            </Button>
            <Button type='submit' variant='contained' color='primary'>
              Enregistrer l'achat
            </Button>
          </Box>
        </form>
      </Drawer>

      <ConfirmDialog
        open={openConfirm}
        handleClose={() => setOpenConfirm(false)}
        handleConfirm={executeApiCall}
        actionType='create'
        title='Confirmer la transaction'
        content={
          <Typography variant='body1'>
            Vous êtes sur le point de valider une facture contenant{' '}
            <strong>{watchArticles?.length || 0} article(s)</strong>. <br />
            <br />
            Un montant total de{' '}
            <strong>
              {formatMontant(montantPreleve)} {watchDevise}
            </strong>{' '}
            sera prélevé sur votre compte bancaire. Confirmez-vous cette opération ?
          </Typography>
        }
      />
    </>
  )
}

export default AddTransactionModal
