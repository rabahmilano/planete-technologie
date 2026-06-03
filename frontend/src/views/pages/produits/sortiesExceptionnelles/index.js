import { useEffect, useState, useCallback, useMemo } from 'react'
import { Grid, Menu, MenuItem, Typography } from '@mui/material'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

import Icon from 'src/@core/components/icon'
import { useSortieExceptionnelle } from 'src/context/SortieExceptionnelleContext'

import KpiCards from './KpiCards'
import FiltresSorties from './FiltresSorties'
import TableauSorties from './TableauSorties'
import RembourserModal from './RembourserModal'
import DetailsModal from './DetailsModal'
import ModifierModal from './ModifierModal'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import SortiesSkeleton from './SortiesSkeleton'
import ChartsSlider from './ChartsSlider'

dayjs.locale('fr')

const SortiesExceptionnellesView = () => {
  const { fetchSorties, refuserRemboursement, annulerDecision, supprimerSortie } = useSortieExceptionnelle()

  const [pageLoading, setPageLoading] = useState(true)
  const [sorties, setSorties] = useState([])
  const [allSortiesForCharts, setAllSortiesForCharts] = useState([])
  const [totalItems, setTotalItems] = useState(0)
  const [stats, setStats] = useState({ totalSorties: 0, perteFinanciere: 0, montantEnAttente: 0, montantRecupere: 0 })

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [motifFilter, setMotifFilter] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [dateRange, setDateRange] = useState([null, null])

  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedSortie, setSelectedSortie] = useState(null)

  const [isRembourserModalOpen, setRembourserModalOpen] = useState(false)
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false)
  const [isModifierModalOpen, setModifierModalOpen] = useState(false)

  const [isConfirmRefuserOpen, setConfirmRefuserOpen] = useState(false)
  const [isConfirmAnnulerOpen, setConfirmAnnulerOpen] = useState(false)
  const [isConfirmSupprimerOpen, setConfirmSupprimerOpen] = useState(false)

  const filters = useMemo(
    () => ({
      motif: motifFilter,
      statut: statutFilter,
      dateDebut: dateRange[0] ? dayjs(dateRange[0]).startOf('day').toISOString() : '',
      dateFin: dateRange[1] ? dayjs(dateRange[1]).endOf('day').toISOString() : ''
    }),
    [motifFilter, statutFilter, dateRange]
  )

  const loadTableData = useCallback(async () => {
    const params = { page: page + 1, limit: rowsPerPage, ...filters }
    const data = await fetchSorties(params)

    if (data) {
      setSorties(data.data)
      setTotalItems(data.meta?.total || data.total || 0)

      const allSorties = data.data || []
      setAllSortiesForCharts(allSorties)

      const perteFinanciereBrute = allSorties.reduce((acc, sortie) => {
        const coutLignes =
          sortie.lignes_colis?.reduce((sum, ligne) => {
            return sum + ligne.qte * parseFloat(ligne.colis?.pu_dzd || 0)
          }, 0) || 0
        return acc + coutLignes
      }, 0)

      setStats({
        totalSorties: allSorties.length,
        perteFinanciere: perteFinanciereBrute,
        montantEnAttente: allSorties
          .filter(s => s.statut_remb === 'EN_ATTENTE')
          .reduce((acc, curr) => acc + parseFloat(curr.mnt_attendu || 0), 0),
        montantRecupere: allSorties
          .filter(s => s.statut_remb === 'REMBOURSE')
          .reduce((acc, curr) => acc + parseFloat(curr.operation_credit?.montant_op || 0), 0)
      })
    }

    setPageLoading(false)
  }, [fetchSorties, page, rowsPerPage, filters])

  useEffect(() => {
    loadTableData()
  }, [loadTableData])

  const handleResetFilters = () => {
    setMotifFilter('')
    setStatutFilter('')
    setDateRange([null, null])
    setPage(0)
  }

  const handleMenuOpen = (event, sortieItem) => {
    setAnchorEl(event.currentTarget)
    setSelectedSortie(sortieItem)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleConfirmRefuser = async () => {
    if (selectedSortie) {
      const success = await refuserRemboursement(selectedSortie.id_sortie)
      if (success) loadTableData()
    }
    setConfirmRefuserOpen(false)
  }

  const handleConfirmAnnuler = async () => {
    if (selectedSortie) {
      const success = await annulerDecision(selectedSortie.id_sortie)
      if (success) loadTableData()
    }
    setConfirmAnnulerOpen(false)
  }

  const handleConfirmSupprimer = async () => {
    if (selectedSortie) {
      const success = await supprimerSortie(selectedSortie.id_sortie)
      if (success) loadTableData()
    }
    setConfirmSupprimerOpen(false)
  }

  const handleSuccess = () => {
    loadTableData()
    setRembourserModalOpen(false)
    setDetailsModalOpen(false)
    setModifierModalOpen(false)
    setSelectedSortie(null)
  }

  if (pageLoading) {
    return <SortiesSkeleton />
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} md={4} sx={{ height: 320 }}>
        <ChartsSlider sorties={allSortiesForCharts} stats={stats} />
      </Grid>

      <Grid item xs={12} md={4} sx={{ height: 320 }}>
        <FiltresSorties
          motifFilter={motifFilter}
          setMotifFilter={setMotifFilter}
          statutFilter={statutFilter}
          setStatutFilter={setStatutFilter}
          dateRange={dateRange}
          setDateRange={setDateRange}
          handleResetFilters={handleResetFilters}
        />
      </Grid>

      <Grid item xs={12} md={4} sx={{ height: 320 }}>
        <KpiCards stats={stats} />
      </Grid>

      <Grid item xs={12}>
        <TableauSorties
          sorties={sorties}
          totalItems={totalItems}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={e => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          onDetailsClick={row => {
            setSelectedSortie(row)
            setDetailsModalOpen(true)
          }}
          onMenuOpen={handleMenuOpen}
        />
      </Grid>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        {/* Actions pour les dossiers NON traités (Modifiables/Supprimables) */}
        {(selectedSortie?.statut_remb === 'EN_ATTENTE' || selectedSortie?.statut_remb === 'NON_APPLICABLE') && [
          <MenuItem
            key='modifier'
            onClick={() => {
              setModifierModalOpen(true)
              handleMenuClose()
            }}
          >
            <Icon icon='tabler:edit' style={{ marginRight: 8, color: '#ff9f43' }} /> Modifier
          </MenuItem>,
          <MenuItem
            key='supprimer'
            onClick={() => {
              setConfirmSupprimerOpen(true)
              handleMenuClose()
            }}
          >
            <Icon icon='tabler:trash' style={{ marginRight: 8, color: '#ea5455' }} /> Supprimer
          </MenuItem>
        ]}

        {/* Actions de décision pour les dossiers EN_ATTENTE */}
        {selectedSortie?.statut_remb === 'EN_ATTENTE' && [
          <MenuItem
            key='rembourser'
            onClick={() => {
              setRembourserModalOpen(true)
              handleMenuClose()
            }}
          >
            <Icon icon='tabler:cash' style={{ marginRight: 8, color: '#28c76f' }} /> Rembourser
          </MenuItem>,
          <MenuItem
            key='refuser'
            onClick={() => {
              setConfirmRefuserOpen(true)
              handleMenuClose()
            }}
          >
            <Icon icon='tabler:circle-x' style={{ marginRight: 8, color: '#ea5455' }} /> Refuser le remboursement
          </MenuItem>
        ]}

        {/* Action d'annulation pour les dossiers CLÔTURÉS */}
        {(selectedSortie?.statut_remb === 'REMBOURSE' || selectedSortie?.statut_remb === 'REFUSE') && (
          <MenuItem
            key='annuler'
            onClick={() => {
              setConfirmAnnulerOpen(true)
              handleMenuClose()
            }}
          >
            <Icon icon='tabler:arrow-back-up' style={{ marginRight: 8, color: '#7367f0' }} /> Annuler la décision
          </MenuItem>
        )}
      </Menu>

      <RembourserModal
        open={isRembourserModalOpen}
        onClose={() => setRembourserModalOpen(false)}
        sortie={selectedSortie}
        onSuccess={handleSuccess}
      />

      <ModifierModal
        open={isModifierModalOpen}
        onClose={() => setModifierModalOpen(false)}
        sortie={selectedSortie}
        onSuccess={handleSuccess}
      />

      <DetailsModal open={isDetailsModalOpen} onClose={() => setDetailsModalOpen(false)} sortie={selectedSortie} />

      <ConfirmDialog
        open={isConfirmRefuserOpen}
        handleClose={() => setConfirmRefuserOpen(false)}
        handleConfirm={handleConfirmRefuser}
        title='Refus définitif du remboursement'
        content={
          <Typography variant='body1'>
            Êtes-vous sûr de vouloir <strong>refuser définitivement</strong> le remboursement pour la perte de{' '}
            <strong>
              {selectedSortie?.qte_totale} {selectedSortie?.produit?.designation_prd}
            </strong>{' '}
            ?<br />
            <br />
            Cette action est <strong>strictement irréversible</strong>. Le dossier sera clôturé et le montant de{' '}
            <strong>{selectedSortie?.mnt_attendu ? `${selectedSortie.mnt_attendu} DA` : '0 DA'}</strong> sera acté comme
            une perte financière définitive pour l'entreprise.
          </Typography>
        }
        confirmText='Oui, acter la perte'
        cancelText='Annuler'
        actionType='warning'
      />

      <ConfirmDialog
        open={isConfirmAnnulerOpen}
        handleClose={() => setConfirmAnnulerOpen(false)}
        handleConfirm={handleConfirmAnnuler}
        title='Annuler la décision'
        content={
          <Typography variant='body1'>
            Êtes-vous sûr de vouloir <strong>annuler cette décision</strong> ?<br />
            <br />
            Si cette déclaration avait été remboursée, l'opération financière sera supprimée de la caisse et le montant
            sera déduit. Le dossier repassera "En attente".
          </Typography>
        }
        confirmText='Oui, annuler la décision'
        cancelText='Retour'
        actionType='warning'
      />

      <ConfirmDialog
        open={isConfirmSupprimerOpen}
        handleClose={() => setConfirmSupprimerOpen(false)}
        handleConfirm={handleConfirmSupprimer}
        title='Supprimer la déclaration'
        content={
          <Typography variant='body1'>
            Êtes-vous sûr de vouloir <strong>supprimer définitivement</strong> cette déclaration ?<br />
            <br />
            Cette action annulera la sortie. Les <strong>{selectedSortie?.qte_totale} unités</strong> seront
            physiquement restituées dans le stock global et dans les lots concernés.
          </Typography>
        }
        confirmText='Oui, supprimer et restituer le stock'
        cancelText='Annuler'
        actionType='error'
      />
    </Grid>
  )
}

export default SortiesExceptionnellesView
