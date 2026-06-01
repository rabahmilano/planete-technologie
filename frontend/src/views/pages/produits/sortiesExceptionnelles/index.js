import { useState, useEffect } from 'react'
import { Grid, Card, CardContent, CardHeader, MenuItem, Typography, Box, Divider, Avatar } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

import CustomTextField from 'src/@core/components/mui/text-field'
import CustomChip from 'src/@core/components/mui/chip'
import Icon from 'src/@core/components/icon'
import { useSortieExceptionnelle } from 'src/context/SortieExceptionnelleContext'
import { formatMontant } from 'src/@core/utils/format'

dayjs.locale('fr')

const statutColors = {
  NON_APPLICABLE: 'secondary',
  EN_ATTENTE: 'warning',
  REMBOURSE: 'success',
  REFUSE: 'error'
}

const statutLabels = {
  NON_APPLICABLE: 'Non Applicable',
  EN_ATTENTE: 'En Attente',
  REMBOURSE: 'Remboursé',
  REFUSE: 'Refusé'
}

const motifLabels = {
  UTILISATION_PERSONNELLE: 'Utilisation Personnelle',
  PERTE_LIVRAISON: 'Perte Livraison',
  CASSE_DEFECTUEUX: 'Casse / Défectueux',
  VENTE_A_CREDIT: 'Vente à Crédit',
  SAISIE_DOUANE: 'Saisie Douane'
}

// ==========================================
// COMPOSANT: TABLEAU VIDE PROFESSIONNEL
// ==========================================
const CustomNoRowsOverlay = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      p: 4
    }}
  >
    <Icon icon='tabler:clipboard-x' fontSize='4rem' color='#a8aaae' />
    <Typography variant='h6' sx={{ mt: 2, color: 'text.secondary' }}>
      Aucun résultat trouvé
    </Typography>
    <Typography variant='body2' sx={{ color: 'text.disabled' }}>
      Essayez de modifier vos filtres ou déclarez une nouvelle sortie.
    </Typography>
  </Box>
)

const ListeSortiesExceptionnelles = () => {
  const { sorties, loading, fetchSorties } = useSortieExceptionnelle()

  // States pour les filtres avancés
  const [motif, setMotif] = useState('')
  const [statut, setStatut] = useState('')
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)

  useEffect(() => {
    // Préparation des paramètres pour le backend
    const params = {}
    if (motif) params.motif = motif
    if (statut) params.statut = statut
    if (startDate) params.startDate = startDate.toISOString()
    if (endDate) params.endDate = endDate.toISOString()

    fetchSorties(params)
  }, [motif, statut, startDate, endDate, fetchSorties])

  // ==========================================
  // CALCUL DES KPIS
  // ==========================================
  const totalSorties = sorties?.length || 0
  const articlesImpactes = sorties?.reduce((acc, curr) => acc + curr.qte_totale, 0) || 0
  const montantEnAttente =
    sorties
      ?.filter(s => s.statut_remb === 'EN_ATTENTE')
      ?.reduce((acc, curr) => acc + parseFloat(curr.mnt_attendu || 0), 0) || 0
  const montantRecupere =
    sorties
      ?.filter(s => s.statut_remb === 'REMBOURSE')
      ?.reduce((acc, curr) => acc + parseFloat(curr.operation_credit?.montant_op || 0), 0) || 0

  const columns = [
    {
      field: 'date_sortie',
      headerName: 'Date',
      flex: 0.15,
      minWidth: 120,
      renderCell: params => (
        <Typography variant='body2'>{dayjs(params.row.date_sortie).format('DD/MM/YYYY')}</Typography>
      )
    },
    {
      field: 'produit',
      headerName: 'Produit',
      flex: 0.25,
      minWidth: 200,
      renderCell: params => (
        <Typography variant='body2' sx={{ fontWeight: 600, color: 'text.primary' }}>
          {params.row.produit?.designation_prd}
        </Typography>
      )
    },
    {
      field: 'motif',
      headerName: 'Motif',
      flex: 0.2,
      minWidth: 180,
      renderCell: params => <Typography variant='body2'>{motifLabels[params.row.motif] || params.row.motif}</Typography>
    },
    {
      field: 'qte_totale',
      headerName: 'Qté',
      flex: 0.1,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: params => (
        <CustomChip rounded size='small' skin='light' color='secondary' label={params.row.qte_totale} />
      )
    },
    {
      field: 'mnt_attendu',
      headerName: 'Montant Attendu',
      flex: 0.15,
      minWidth: 150,
      renderCell: params => (
        <Typography variant='body2' sx={{ fontWeight: 600 }}>
          {params.row.mnt_attendu ? `${formatMontant(params.row.mnt_attendu)} DZD` : '-'}
        </Typography>
      )
    },
    {
      field: 'statut_remb',
      headerName: 'Statut',
      flex: 0.15,
      minWidth: 140,
      renderCell: params => (
        <CustomChip
          rounded
          size='small'
          skin='light'
          color={statutColors[params.row.statut_remb]}
          label={statutLabels[params.row.statut_remb]}
        />
      )
    }
  ]

  return (
    <>
      {/* ========================================== */}
      {/* SECTION KPIS (VUE GLOBALE DU BUSINESS) */}
      {/* ========================================== */}
      <Grid container spacing={5} sx={{ mb: 6 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar variant='rounded' sx={{ mr: 3, width: 44, height: 44, bgcolor: 'primary.light' }}>
                <Icon icon='tabler:file-invoice' fontSize='1.5rem' color='white' />
              </Avatar>
              <div>
                <Typography variant='h6'>{totalSorties}</Typography>
                <Typography variant='body2' sx={{ color: 'text.disabled' }}>
                  Dossiers déclarés
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar variant='rounded' sx={{ mr: 3, width: 44, height: 44, bgcolor: 'error.light' }}>
                <Icon icon='tabler:box-off' fontSize='1.5rem' color='white' />
              </Avatar>
              <div>
                <Typography variant='h6'>{articlesImpactes}</Typography>
                <Typography variant='body2' sx={{ color: 'text.disabled' }}>
                  Articles impactés
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar variant='rounded' sx={{ mr: 3, width: 44, height: 44, bgcolor: 'warning.light' }}>
                <Icon icon='tabler:clock-dollar' fontSize='1.5rem' color='white' />
              </Avatar>
              <div>
                <Typography variant='h6'>{formatMontant(montantEnAttente)}</Typography>
                <Typography variant='body2' sx={{ color: 'text.disabled' }}>
                  DZD en attente
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar variant='rounded' sx={{ mr: 3, width: 44, height: 44, bgcolor: 'success.light' }}>
                <Icon icon='tabler:cash' fontSize='1.5rem' color='white' />
              </Avatar>
              <div>
                <Typography variant='h6'>{formatMontant(montantRecupere)}</Typography>
                <Typography variant='body2' sx={{ color: 'text.disabled' }}>
                  DZD récupérés
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ========================================== */}
      {/* SECTION FILTRES ET TABLEAU */}
      {/* ========================================== */}
      <Card>
        <CardHeader title='Filtres de recherche' />
        <Divider sx={{ m: '0 !important' }} />
        <CardContent>
          <Grid container spacing={5}>
            <Grid item xs={12} sm={6} md={3}>
              <CustomTextField
                select
                fullWidth
                label='Motif de sortie'
                value={motif}
                onChange={e => setMotif(e.target.value)}
              >
                <MenuItem value=''>Tous les motifs</MenuItem>
                {Object.entries(motifLabels).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <CustomTextField
                select
                fullWidth
                label='Statut du remboursement'
                value={statut}
                onChange={e => setStatut(e.target.value)}
              >
                <MenuItem value=''>Tous les statuts</MenuItem>
                {Object.entries(statutLabels).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                <DatePicker
                  label='Date de début'
                  value={startDate}
                  onChange={newValue => setStartDate(newValue)}
                  slotProps={{ textField: { fullWidth: true }, field: { clearable: true } }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                <DatePicker
                  label='Date de fin'
                  value={endDate}
                  onChange={newValue => setEndDate(newValue)}
                  slotProps={{ textField: { fullWidth: true }, field: { clearable: true } }}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        </CardContent>

        <Divider sx={{ m: '0 !important' }} />

        <Box sx={{ height: 500, width: '100%' }}>
          <DataGrid
            rows={sorties}
            columns={columns}
            loading={loading}
            getRowId={row => row.id_sortie}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } }
            }}
            slots={{
              noRowsOverlay: CustomNoRowsOverlay
            }}
            sx={{
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'customColors.tableHeaderBg'
              },
              border: 0
            }}
          />
        </Box>
      </Card>
    </>
  )
}

export default ListeSortiesExceptionnelles
