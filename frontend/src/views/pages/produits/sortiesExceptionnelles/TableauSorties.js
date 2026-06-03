import { Card, Typography, Box, IconButton } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import dayjs from 'dayjs'

import CustomChip from 'src/@core/components/mui/chip'
import Icon from 'src/@core/components/icon'
import { formatMontant } from 'src/@core/utils/format'

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

const TableauSorties = ({
  sorties,
  totalItems,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onMenuOpen,
  onDetailsClick
}) => {
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
        <Typography variant='body2' sx={{ fontWeight: 600 }}>
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
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: params => (
        <Typography variant='body2' sx={{ fontWeight: 700, color: 'primary.main' }}>
          {params.row.qte_totale} Unités
        </Typography>
      )
    },
    {
      field: 'mnt_attendu',
      headerName: 'Montant Attendu',
      flex: 0.15,
      minWidth: 150,
      renderCell: params => (
        <Typography variant='body2' sx={{ fontWeight: 600 }}>
          {params.row.mnt_attendu ? `${formatMontant(params.row.mnt_attendu)} DA` : '-'}
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
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.15,
      minWidth: 120,
      align: 'center',
      sortable: false,
      renderCell: params => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconButton size='small' onClick={() => onDetailsClick(params.row)} sx={{ mr: 1 }}>
            <Icon icon='tabler:eye' />
          </IconButton>
          <IconButton size='small' onClick={e => onMenuOpen(e, params.row)}>
            <Icon icon='tabler:dots-vertical' />
          </IconButton>
        </Box>
      )
    }
  ]

  return (
    <Card sx={{ boxShadow: 3 }}>
      <Box sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={sorties}
          columns={columns}
          getRowId={row => row.id_sortie}
          disableRowSelectionOnClick
          rowCount={totalItems}
          pageSizeOptions={[10, 25, 50]}
          paginationModel={{ page, pageSize: rowsPerPage }}
          onPaginationModelChange={newModel => {
            onPageChange(null, newModel.page)
            onRowsPerPageChange({ target: { value: newModel.pageSize } })
          }}
          paginationMode='server'
          slots={{ noRowsOverlay: CustomNoRowsOverlay }}
          sx={{
            border: 0,
            '& .MuiDataGrid-columnHeaders': { backgroundColor: '#0d1b2a', color: 'white', borderRadius: 0 },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold', color: 'white' },
            '& .MuiIconButton-root': { color: 'white' },
            '& .MuiDataGrid-cell .MuiIconButton-root': { color: 'text.secondary' },
            '& .MuiDataGrid-row:last-child .MuiDataGrid-cell': {
              borderBottom: '1px solid rgba(58, 53, 65, 0.12) !important'
            }
          }}
        />
      </Box>
    </Card>
  )
}

export default TableauSorties
