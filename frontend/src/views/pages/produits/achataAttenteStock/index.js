import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Switch,
  FormControlLabel,
  Typography,
  Box,
  Card,
  CardContent
} from '@mui/material'
import CustomTextField from 'src/@core/components/mui/text-field'
import { useForm, Controller } from 'react-hook-form'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import utc from 'dayjs/plugin/utc'
import axios from 'axios'
import toast from 'react-hot-toast'
import Icon from 'src/@core/components/icon'

dayjs.extend(utc)
dayjs.locale('fr')

const defaultValues = {
  dateStock: dayjs().utc(true).startOf('day')
}

// ====================================================================
// SOUS-COMPOSANT: Cartes de KPIs (mise à jour avec 3 cartes)
// ====================================================================

const KpiCards = ({ stats }) => (
  <Grid container spacing={6}>
    <Grid item xs={12} md={4}>
      <Card>
        <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
          <Icon icon='tabler:truck-delivery' fontSize='2.5rem' color='var(--mui-palette-primary-main)' />
          <Box sx={{ ml: 4 }}>
            <Typography variant='h5'>{stats.totalCount}</Typography>
            <Typography variant='body2'>Colis en Route</Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} md={4}>
      <Card>
        <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
          <Icon icon='tabler:packages' fontSize='2.5rem' color='var(--mui-palette-info-main)' />
          <Box sx={{ ml: 4 }}>
            <Typography variant='h5'>{stats.totalProduits}</Typography>
            <Typography variant='body2'>Produits en Attente</Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} md={4}>
      <Card>
        <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
          <Icon icon='tabler:cash' fontSize='2.5rem' color='var(--mui-palette-success-main)' />
          <Box sx={{ ml: 4 }}>
            <Typography variant='h5'>
              {parseFloat(stats.totalValueDZD || 0).toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD' })}
            </Typography>
            <Typography variant='body2'>Valeur Totale en Route</Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
)

const AchataAttenteStock = () => {
  const [colis, setColis] = useState([])
  const [selectedColis, setSelectedColis] = useState(null)
  const [droitsTimbre, setDroitsTimbre] = useState(false)
  const [isUpdateModalOpen, setUpdateModalOpen] = useState(false)
  const [isCancelModalOpen, setCancelModalOpen] = useState(false)
  const [stats, setStats] = useState({ totalCount: 0, totalValueDZD: 0, totalProduits: 0 }) // État pour les KPIs

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({ defaultValues })

  // Fonction pour récupérer les statistiques
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/colisEnRoute/stats`)
      setStats(response.data)
    } catch (error) {
      toast.error('Erreur lors de la récupération des statistiques.')
    }
  }

  const fetchColis = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/colisEnRoute`)
      setColis(response.data)
    } catch (error) {
      toast.error('Erreur lors de la récupération des colis.')
    }
  }

  useEffect(() => {
    fetchColis()
    fetchStats() // On charge les KPIs au chargement de la page
  }, [])

  const handleRowClick = item => {
    setSelectedColis(item)
    setUpdateModalOpen(true)
  }

  const handleCloseModals = () => {
    setUpdateModalOpen(false)
    setCancelModalOpen(false)
    setSelectedColis(null)
    reset()
    setDroitsTimbre(false)
  }

  const handleSuccess = () => {
    fetchColis()
    fetchStats() // On met à jour les KPIs après une opération réussie
    handleCloseModals()
  }

  const handleSubmitUpdate = async data => {
    const updateData = {
      prd_id: selectedColis.prd_id,
      date_stock: dayjs(data.dateStock).toISOString(),
      droits_timbre: droitsTimbre
    }
    try {
      const reponse = await axios.patch(
        `${process.env.NEXT_PUBLIC_BASE_URL}produits/colis/${selectedColis.id_colis}`,
        updateData
      )
      if (reponse.status === 200) {
        toast.success('Mise à jour réussie')
        handleSuccess()
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour.')
    }
  }

  const handleInitiateCancel = () => {
    setUpdateModalOpen(false)
    setCancelModalOpen(true)
  }

  const handleConfirmCancel = async () => {
    if (!selectedColis) return
    try {
      const response = await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}produits/colis/${selectedColis.id_colis}`)
      if (response.status === 200) {
        toast.success('Colis annulé avec succès !')
        handleSuccess()
      }
    } catch (error) {
      toast.error("Erreur lors de l'annulation du colis.")
      handleCloseModals()
    }
  }

  return (
    // On utilise un Grid container pour organiser la page
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <KpiCards stats={stats} />
      </Grid>
      <Grid item xs={12}>
        {/* MODIFICATION 1: Ajout de 'overflowX: auto' pour permettre le défilement horizontal */}
        <TableContainer component={Paper} sx={{ boxShadow: 5, borderRadius: 4, overflowX: 'auto' }}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
                {/* MODIFICATION 2: Figer la cellule d'en-tête "Désignation" */}
                <TableCell
                  sx={{
                    color: 'white',
                    position: 'sticky',
                    left: 0,
                    zIndex: 10,
                    backgroundColor: '#0d1b2a'
                  }}
                >
                  Désignation
                </TableCell>
                <TableCell sx={{ color: 'white' }}>Date d'Achat</TableCell>
                <TableCell sx={{ color: 'white', textAlign: 'center' }}>Temps d'attente</TableCell>
                <TableCell align='center' sx={{ color: 'white' }}>
                  Quantité
                </TableCell>
                <TableCell align='right' sx={{ color: 'white' }}>
                  Prix d'Achat
                </TableCell>
                <TableCell align='right' sx={{ color: 'white' }}>
                  Catégorie
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {colis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant='h5' align='center' sx={{ p: 4 }}>
                      Aucun colis n'est en route
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                colis.map(item => {
                  const waitingDays = dayjs().diff(dayjs(item.date_achat), 'day')
                  return (
                    <TableRow key={item.id_colis} onClick={() => handleRowClick(item)} hover sx={{ cursor: 'pointer' }}>
                      {/* MODIFICATION 3: Figer les cellules de la colonne "Désignation" */}
                      <TableCell
                        sx={{
                          position: 'sticky',
                          left: 0,
                          backgroundColor: 'background.paper',
                          borderRight: '1px solid rgba(224, 224, 224, 1)'
                        }}
                      >
                        {item.produit.designation_prd}
                      </TableCell>
                      <TableCell>{dayjs(item.date_achat).format('DD MMMM YYYY')}</TableCell>
                      <TableCell align='center'>
                        <Typography color={waitingDays > 20 ? 'error' : 'textPrimary'}>{waitingDays} jours</Typography>
                      </TableCell>
                      <TableCell align='center'>{item.qte_achat}</TableCell>
                      <TableCell align='right'>
                        {item.mnt_tot_dev} {item.compte.devise.symbole_dev}
                      </TableCell>
                      <TableCell align='right'>{item.categorie.designation_cat}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {/* <TableContainer component={Paper} sx={{ boxShadow: 5, borderRadius: 4 }}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
                <TableCell sx={{ color: 'white' }}>Désignation</TableCell>
                <TableCell sx={{ color: 'white' }}>Date d'Achat</TableCell>
                <TableCell sx={{ color: 'white', textAlign: 'center' }}>Temps d'attente</TableCell>
                <TableCell align='center' sx={{ color: 'white' }}>
                  Quantité
                </TableCell>
                <TableCell align='right' sx={{ color: 'white' }}>
                  Prix d'Achat
                </TableCell>
                <TableCell align='right' sx={{ color: 'white' }}>
                  Catégorie
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {colis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant='h5' align='center' sx={{ p: 4 }}>
                      Aucun colis n'est en route
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                colis.map(item => {
                  // Calcul du temps d'attente en jours
                  const waitingDays = dayjs().diff(dayjs(item.date_achat), 'day')
                  return (
                    <TableRow key={item.id_colis} onClick={() => onRowClick(item)} hover sx={{ cursor: 'pointer' }}>
                      <TableCell>{item.produit.designation_prd}</TableCell>
                      <TableCell>{dayjs(item.date_achat).format('DD MMMM YYYY')}</TableCell>
                      <TableCell align='center'>
                        <Typography color={waitingDays > 60 ? 'error' : 'textPrimary'}>{waitingDays} jours</Typography>
                      </TableCell>
                      <TableCell align='center'>{item.qte_achat}</TableCell>
                      <TableCell align='right'>
                        {item.mnt_tot_dev} {item.compte.devise.symbole_dev}
                      </TableCell>
                      <TableCell align='right'>{item.categorie.designation_cat}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer> */}
      </Grid>

      {/* Modale de Mise à Jour */}
      <Dialog open={isUpdateModalOpen} onClose={handleCloseModals}>
        <DialogTitle variant='h5'>Mettre à jour l'état du colis</DialogTitle>
        <form onSubmit={handleSubmit(handleSubmitUpdate)}>
          <DialogContent>
            <Grid container spacing={5}>
              <Grid item xs={12}>
                <CustomTextField fullWidth value={selectedColis?.produit?.designation_prd || ''} disabled />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name='dateStock'
                  control={control}
                  rules={{ required: 'Ce champ est obligatoire' }}
                  render={({ field }) => (
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                      <DatePicker {...field} maxDate={dayjs()} label='Date de Stock' sx={{ width: '100%' }} />
                    </LocalizationProvider>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch checked={droitsTimbre} onChange={e => setDroitsTimbre(e.target.checked)} />}
                  label='Droits de Timbre Payés'
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
            <Button variant='contained' color='error' onClick={handleInitiateCancel}>
              Annuler l'Achat
            </Button>
            <Box>
              <Button onClick={handleCloseModals} sx={{ mr: 2 }}>
                Fermer
              </Button>
              <Button type='submit' variant='contained' color='success'>
                Mettre à Jour
              </Button>
            </Box>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modale de Confirmation d'Annulation */}
      <Dialog open={isCancelModalOpen} onClose={handleCloseModals}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Icon
              icon='tabler:alert-circle'
              style={{ color: 'var(--mui-palette-warning-main)', marginRight: 8, fontSize: '1.5rem' }}
            />
            Confirmation d'Annulation
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir annuler le colis pour <strong>{selectedColis?.produit?.designation_prd}</strong> ?
          </Typography>
          <Typography variant='body2' sx={{ mt: 2 }}>
            Le montant de l'achat sera remboursé. <strong>Cette action est irréversible.</strong>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseModals}>Non, retour</Button>
          <Button variant='contained' color='error' onClick={handleConfirmCancel}>
            Oui, Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default AchataAttenteStock
