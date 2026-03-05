import React, { useEffect, useState, useRef } from 'react'
import { Grid } from '@mui/material'
import { useCommande } from 'src/context/CommandeContext'
import CommandesTable from './CommandesTable' 
import CommandesKpis from './CommandesKpis'
import CommandesFilters from './CommandesFilters'

const ListeCommandesView = () => {
  const { globalStats, fetchCommandes, fetchGlobalStats } = useCommande()
  
  // États des filtres et pagination
  const [periodeFiltre, setPeriodeFiltre] = useState('all')
  const [produitFiltre, setProduitFiltre] = useState('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // 1. Charger les KPIs globaux au montage
  useEffect(() => {
    fetchGlobalStats()
  }, [fetchGlobalStats])

  // 2. Revenir à la page 1 si on change un filtre
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
    } else {
      if (page !== 0) setPage(0) 
    }
  }, [periodeFiltre, produitFiltre])

  // 3. Recharger la table à chaque modification
  useEffect(() => {
    fetchCommandes(page, rowsPerPage, { periode: periodeFiltre, produit: produitFiltre })
  }, [fetchCommandes, page, rowsPerPage, periodeFiltre, produitFiltre])

  // Fonction pour réinitialiser les filtres
  const handleResetFilters = () => {
    setPeriodeFiltre('all')
    setProduitFiltre('all')
    setPage(0)
  }

  // Fonction pour rafraîchir après une annulation
  const handleRefreshData = () => {
    fetchCommandes(page, rowsPerPage, { periode: periodeFiltre, produit: produitFiltre })
    fetchGlobalStats()
  }

  return (
    <Grid container spacing={6}>
      {/* Ligne des KPIs */}
      <Grid item xs={12}>
        <CommandesKpis stats={globalStats} />
      </Grid>

      {/* Ligne des Filtres */}
      <Grid item xs={12}>
        <CommandesFilters 
          periodeFiltre={periodeFiltre} 
          setPeriodeFiltre={setPeriodeFiltre}
          produitFiltre={produitFiltre}
          setProduitFiltre={setProduitFiltre}
          onReset={handleResetFilters}
        />
      </Grid>

      {/* Ligne de la Table principale */}
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