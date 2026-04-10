import { useState, useEffect, useContext } from 'react'
import { Drawer, Box, Typography, IconButton, Button, Divider } from '@mui/material'
import { useForm, useFieldArray } from 'react-hook-form'
import dayjs from 'dayjs'

import Icon from 'src/@core/components/icon'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import { formatMontant } from 'src/@core/utils/format'

import { VoyageContext } from 'src/context/VoyageContext'
import { useCompte } from 'src/context/CompteContext'
import { useProduit } from 'src/context/ProduitContext'

import InfosGlobalesForm from './InfosGlobalesForm'
import AjoutRapideLigne from './AjoutRapideLigne'
import PanierTable from './PanierTable'
import RecapitulatifFinancier from './RecapitulatifFinancier'

const defaultValues = {
  fournisseur: '',
  dateAchat: null,
  cptPaiementId: '',
  deviseFacture: '',
  tauxChange: '',
  fraisIntermediaire: '',
  articles: []
}

const AddTransactionModal = ({ open, handleClose, voyage, onSuccess }) => {
  const { comptes } = useCompte()
  const { addTransactionVoyage } = useContext(VoyageContext)
  const { listCategorie, rechercherProduits } = useProduit()

  const [minDate, setMinDate] = useState(null)
  const [maxDate, setMaxDate] = useState(null)
  const [openConfirm, setOpenConfirm] = useState(false)
  const [formDataToSubmit, setFormDataToSubmit] = useState(null)

  const { control, handleSubmit, reset, watch, setValue } = useForm({ defaultValues })
  const { fields, append, remove } = useFieldArray({ control, name: 'articles' })

  useEffect(() => {
    if (open && voyage) {
      setValue('cptPaiementId', voyage.cpt_defaut_id || '')
      setValue('deviseFacture', voyage.dev_dest || '')
      setValue('tauxChange', voyage.taux_change || '')

      if (voyage.date_dep) setMinDate(dayjs(voyage.date_dep))
      if (voyage.date_ret) setMaxDate(dayjs(voyage.date_ret))
      setValue('dateAchat', voyage.date_dep ? dayjs(voyage.date_dep) : dayjs())
    }
  }, [open, voyage, setValue])

  const watchArticles = watch('articles')
  const watchCptId = watch('cptPaiementId')
  const watchDevise = watch('deviseFacture')
  const watchTauxChange = watch('tauxChange')
  const watchFraisInt = watch('fraisIntermediaire')

  const isLocked = watchArticles && watchArticles.length > 0
  const selectedCpt = comptes.find(c => c.id_cpt === watchCptId)

  const handleCompteChange = newCptId => {
    setValue('cptPaiementId', newCptId)
    const cpt = comptes.find(c => c.id_cpt === newCptId)
    if (cpt) {
      setValue('deviseFacture', cpt.dev_code)
      setValue('tauxChange', cpt.taux_change_actuel || '')
    }
  }

  const handleDeviseChange = newDevise => {
    setValue('deviseFacture', newDevise)
    const cpt = comptes.find(c => c.id_cpt === watchCptId)

    if (voyage && newDevise === voyage.dev_dest) {
      setValue('tauxChange', voyage.taux_change || '')
    } else if (cpt && newDevise === cpt.dev_code) {
      setValue('tauxChange', cpt.taux_change_actuel || '')
    }
  }

  const tauxTrans = parseFloat(watchTauxChange) || 1
  const tauxCompte = selectedCpt ? parseFloat(selectedCpt.taux_change_actuel) || 1 : 1
  const deviseCompte = selectedCpt ? selectedCpt.dev_code : ''

  const totalFacture =
    watchArticles?.reduce((acc, item) => {
      const qte = parseFloat(item.qte) || 0
      const pu = parseFloat(item.puDevise) || 0
      return acc + qte * pu
    }, 0) || 0

  const fraisIntermediaire = parseFloat(watchFraisInt) || 0
  const sousTotal = totalFacture + fraisIntermediaire

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
            width: '100vw',
            maxWidth: '100vw',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f5f5f9'
          }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 4,
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
          <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, overflow: 'hidden' }}>
            <Box
              sx={{
                width: { xs: '100%', lg: '40%' },
                display: 'flex',
                flexDirection: 'column',
                borderRight: { lg: '1px solid #e0e0e0' },
                backgroundColor: '#ffffff',
                overflowY: 'auto'
              }}
            >
              <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <InfosGlobalesForm
                  control={control}
                  minDate={minDate}
                  maxDate={maxDate}
                  comptes={comptes}
                  voyage={voyage}
                  isLocked={isLocked}
                  handleCompteChange={handleCompteChange}
                  handleDeviseChange={handleDeviseChange}
                  selectedCpt={selectedCpt}
                />
                <Divider />
                <AjoutRapideLigne
                  append={append}
                  categories={listCategorie}
                  rechercherProduits={rechercherProduits}
                  deviseTrans={watchDevise}
                />
              </Box>

              <Box sx={{ p: 4, borderTop: '1px solid #e0e0e0', backgroundColor: '#fafafa', mt: 'auto' }}>
                <RecapitulatifFinancier
                  control={control}
                  watchDevise={watchDevise}
                  deviseCompte={deviseCompte}
                  totalFacture={totalFacture}
                  tauxTrans={tauxTrans}
                  tauxCompte={tauxCompte}
                  commissionPct={commissionPct}
                  fraisCarte={fraisCarte}
                  montantPreleve={montantPreleve}
                  articlesCount={watchArticles?.length || 0}
                />
              </Box>
            </Box>

            <Box
              sx={{
                width: { xs: '100%', lg: '60%' },
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#f8f9fa'
              }}
            >
              <Box sx={{ flex: 1, overflowY: 'auto', p: 4 }}>
                <PanierTable
                  fields={fields}
                  remove={remove}
                  articles={watchArticles}
                  deviseTrans={watchDevise}
                  deviseCompte={deviseCompte}
                  tauxTrans={tauxTrans}
                  tauxCompte={tauxCompte}
                  listCategorie={listCategorie}
                />
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              p: 4,
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
            <Button type='submit' variant='contained' color='primary' size='large' disabled={!isLocked}>
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
            Validation d'une facture contenant <strong>{watchArticles?.length || 0} article(s)</strong>. <br />
            <br />
            Total à payer :{' '}
            <strong>
              {formatMontant(montantPreleve)} {watchDevise}
            </strong>
            {watchDevise !== deviseCompte && (
              <>
                {' '}
                (soit environ{' '}
                <strong>
                  {formatMontant((montantPreleve * tauxTrans) / tauxCompte)} {deviseCompte}
                </strong>
                )
              </>
            )}
            .
          </Typography>
        }
      />
    </>
  )
}

export default AddTransactionModal
