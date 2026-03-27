import { useEffect, useState } from 'react'
import { Grid } from '@mui/material'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import 'dayjs/locale/fr'

import { useProduitDashboard } from 'src/context/ProduitDashboardContext'
import KpiCards from './KpiCards'
import TableauColis from './TableauColis'
import ModalesAction from './ModalesAction'

dayjs.extend(utc)
dayjs.locale('fr')

const AchataAttenteStock = () => {
  const { fetchColisStats, fetchColisEnRoute, modifierColis, annulerColis } = useProduitDashboard()

  const [colis, setColis] = useState([])
  const [stats, setStats] = useState({ totalCount: 0, totalValueDZD: 0, totalProduits: 0 })
  const [selectedColis, setSelectedColis] = useState(null)
  const [isUpdateModalOpen, setUpdateModalOpen] = useState(false)
  const [isCancelModalOpen, setCancelModalOpen] = useState(false)

  const loadData = async () => {
    const [colisData, statsData] = await Promise.all([fetchColisEnRoute(), fetchColisStats()])
    setColis(colisData)
    setStats(statsData)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRowClick = item => {
    setSelectedColis(item)
    setUpdateModalOpen(true)
  }

  const handleCloseModals = () => {
    setUpdateModalOpen(false)
    setCancelModalOpen(false)
    setSelectedColis(null)
  }

  const handleSubmitUpdate = async formData => {
    const updateData = {
      prd_id: selectedColis.prd_id,
      date_stock: dayjs(formData.dateStock).toISOString(),
      droits_timbre: formData.droitsTimbre
    }

    if (await modifierColis(selectedColis.id_colis, updateData)) {
      loadData()
      handleCloseModals()
    }
  }

  const handleInitiateCancel = () => {
    setUpdateModalOpen(false)
    setCancelModalOpen(true)
  }

  const handleConfirmCancel = async () => {
    if (selectedColis && (await annulerColis(selectedColis.id_colis))) {
      loadData()
      handleCloseModals()
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <KpiCards stats={stats} />
      </Grid>
      <Grid item xs={12}>
        <TableauColis colis={colis} onRowClick={handleRowClick} />
      </Grid>

      <ModalesAction
        isUpdateOpen={isUpdateModalOpen}
        isCancelOpen={isCancelModalOpen}
        selectedColis={selectedColis}
        onClose={handleCloseModals}
        onSubmitUpdate={handleSubmitUpdate}
        onInitiateCancel={handleInitiateCancel}
        onConfirmCancel={handleConfirmCancel}
      />
    </Grid>
  )
}

export default AchataAttenteStock
