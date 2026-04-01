import React, { useEffect, useState, useRef } from 'react'
import { Grid } from '@mui/material'
import { useCommande } from 'src/context/CommandeContext'
import CommandesTable from './CommandesTable'
import CommandesKpis from './CommandesKpis'
import CommandesFilters from './CommandesFilters'

const ListeCommandesView = () => {
  const { globalStats, fetchCommandes, fetchGlobalStats } = useCommande()

  const [periodeFiltre, setPeriodeFiltre] = useState('all')
  const [produitFiltre, setProduitFiltre] = useState('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
    } else {
      if (page !== 0) setPage(0)
    }
  }, [periodeFiltre, produitFiltre])

  useEffect(() => {
    fetchCommandes(page, rowsPerPage, { periode: periodeFiltre, produit: produitFiltre })
    fetchGlobalStats({ periode: periodeFiltre, produit: produitFiltre })
  }, [fetchCommandes, fetchGlobalStats, page, rowsPerPage, periodeFiltre, produitFiltre])

  const handleResetFilters = () => {
    setPeriodeFiltre('all')
    setProduitFiltre('all')
    setPage(0)
  }

  const handleRefreshData = () => {
    fetchCommandes(page, rowsPerPage, { periode: periodeFiltre, produit: produitFiltre })
    fetchGlobalStats({ periode: periodeFiltre, produit: produitFiltre })
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <CommandesKpis stats={globalStats} />
      </Grid>

      <Grid item xs={12}>
        <CommandesFilters
          periodeFiltre={periodeFiltre}
          setPeriodeFiltre={setPeriodeFiltre}
          produitFiltre={produitFiltre}
          setProduitFiltre={setProduitFiltre}
          onReset={handleResetFilters}
        />
      </Grid>

      <Grid item xs={12}>
        <CommandesTable
          page={page}
          setPage={setPage}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          refreshData={handleRefreshData}
        />
      </Grid>
    </Grid>
  )
}

export default ListeCommandesView
