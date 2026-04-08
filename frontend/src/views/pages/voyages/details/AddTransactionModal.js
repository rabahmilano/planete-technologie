import { useState, useEffect, useContext } from 'react'
import { Drawer, Box, Typography, IconButton, Button, Grid, Divider } from '@mui/material'
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

const AddTransactionModal = ({ open, handleClose, voyage, onSuccess }) => {
  const { comptes } = useCompte()
  const { addTransactionVoyage } = useContext(VoyageContext)
  const { listCategorie } = useProduit()

  const [minDate, setMinDate] = useState(null)
  const [maxDate, setMaxDate] = useState(null)
  const [openConfirm, setOpenConfirm] = useState(false)
  const [formDataToSubmit, setFormDataToSubmit] = useState(null)

  const { control, handleSubmit, reset, watch, setValue } = useForm({ defaultValues })

  useEffect(() => {
    if (open && voyage) {
      setValue('deviseFacture', voyage.dev_dest || '')
      setValue('tauxChange', voyage.taux_change || '')
      setValue('cptPaiementId', voyage.cpt_defaut_id || '')

      if (voyage.date_dep) setMinDate(dayjs(voyage.date_dep))
      if (voyage.date_ret) setMaxDate(dayjs(voyage.date_ret))
      setValue('dateAchat', voyage.date_dep ? dayjs(voyage.date_dep) : dayjs())
    }
  }, [open, voyage, setValue])

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
      idVoyage: parseInt(voyage.id_voyage, 10),
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
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', xl: '1300px' },
            maxWidth: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 5,
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e0e0e0'
          }}
        >
          <Typography variant='h5' fontWeight={700} color='primary.main'>
            Nouvel Achat (Facture)
          </Typography>
          <IconButton onClick={onClose}>
            <Icon icon='tabler:x' />
          </IconButton>
        </Box>

        <form
          onSubmit={handleSubmit(onPreSubmit)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <Box sx={{ flex: '1 1 70%', overflowY: 'auto', p: 8, backgroundColor: '#ffffff' }}>
              <InfosGlobalesForm control={control} minDate={minDate} maxDate={maxDate} comptes={comptes} />
              <Divider sx={{ my: 8 }} />
              <ArticlesPanier control={control} watch={watch} categories={listCategorie} />
            </Box>

            <Box
              sx={{
                flex: '0 0 30%',
                minWidth: '350px',
                backgroundColor: '#f8f9fa',
                borderLeft: '1px solid #e0e0e0',
                p: 8,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Box sx={{ position: 'sticky', top: 0 }}>
                <RecapitulatifFinancier
                  control={control}
                  watchDevise={watchDevise}
                  totalFacture={totalFacture}
                  commissionPct={commissionPct}
                  fraisCarte={fraisCarte}
                  montantPreleve={montantPreleve}
                />
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              p: 5,
              borderTop: '1px solid #e0e0e0',
              backgroundColor: '#ffffff',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 3
            }}
          >
            <Button variant='outlined' color='secondary' onClick={onClose}>
              Annuler
            </Button>
            <Button type='submit' variant='contained' color='primary' size='large'>
              Confirmer la transaction
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
            Montant total de{' '}
            <strong>
              {formatMontant(montantPreleve)} {watchDevise}
            </strong>{' '}
            sera prélevé.
          </Typography>
        }
      />
    </>
  )
}

export default AddTransactionModal
