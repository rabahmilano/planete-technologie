import React, { useState, useMemo, useEffect } from 'react'
import { Grid, CircularProgress, Box } from '@mui/material'
import { useDepense } from 'src/context/DepenseContext'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

import GlobalStats from './GlobalStats'
import FinancialDashboard from './FinancialDashboard'
import ExpensesChart from './ExpensesChart'
import ExpensesTable from './ExpensesTable'

dayjs.locale('fr')

const ListeDepensesView = () => {
  const { depenses, listNature, loading, totalDepenses, fetchData, globalStats, fetchGlobalStats } = useDepense()
  const { globalChartData } = globalStats

  const [natureFiltre, setNatureFiltre] = useState('')
  const [periodeFiltre, setPeriodeFiltre] = useState('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [optionsAnnee, setOptionsAnnee] = useState([])

  const isInitialMount = React.useRef(true)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
    } else {
      if (page !== 0) {
        setPage(0)
      }
    }
  }, [natureFiltre, periodeFiltre])

  useEffect(() => {
    fetchData(page, rowsPerPage, { nature: natureFiltre, periode: periodeFiltre })
  }, [fetchData, page, rowsPerPage, natureFiltre, periodeFiltre])

  useEffect(() => {
    const anneePremierAchat = 2023
    const anneeActuelle = dayjs().year()
    const options = Array.from({ length: anneeActuelle - anneePremierAchat + 1 }, (_, i) =>
      (anneeActuelle - i).toString()
    )
    setOptionsAnnee(options)
  }, [])

  const naturesForFilter = useMemo(() => {
    const operationalNatures = listNature.filter(n => n.designation_nat_dep !== 'COFFRE FORT')
    const hasColisTimbre = operationalNatures.some(n => n.id_nat_dep === 99)
    if (!hasColisTimbre) {
      return [...operationalNatures, { id_nat_dep: 99, designation_nat_dep: 'DROITS DE TIMBRE (COLIS)' }]
    }
    return operationalNatures
  }, [listNature])

  const { totalDepensesFiltrees, totalCoffreFortFiltre, chartData } = useMemo(() => {
    const depensesValides = depenses.filter(d => d.isAnnule === false)

    const depensesOperationnelles = depensesValides.filter(d => d.nature !== 'COFFRE FORT')
    const epargneCoffreFort = depensesValides.filter(d => d.nature === 'COFFRE FORT')

    const totalDep = depensesOperationnelles.reduce((acc, curr) => acc + parseFloat(curr.montant || 0), 0)
    const totalCf = epargneCoffreFort.reduce((acc, curr) => acc + parseFloat(curr.montant || 0), 0)

    const dataForChart = Object.values(
      depensesOperationnelles.reduce((acc, { nature, montant }) => {
        acc[nature] = { name: nature, value: (acc[nature]?.value || 0) + parseFloat(montant || 0) }
        return acc
      }, {})
    ).sort((a, b) => b.value - a.value)

    return {
      totalDepensesFiltrees: totalDep,
      totalCoffreFortFiltre: totalCf,
      chartData: dataForChart
    }
  }, [depenses])

  const handleResetFilters = () => {
    setNatureFiltre('')
    setPeriodeFiltre('all')
    setPage(0)
  }

  const handleRefreshData = async () => {
    await fetchData(page, rowsPerPage, { nature: natureFiltre, periode: periodeFiltre })

    if (fetchGlobalStats) {
      await fetchGlobalStats()
    }
  }

  if (loading && depenses.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <GlobalStats stats={globalStats} />
      </Grid>
      <Grid item xs={12}>
        <FinancialDashboard
          natureFiltre={natureFiltre}
          setNatureFiltre={setNatureFiltre}
          periodeFiltre={periodeFiltre}
          setPeriodeFiltre={setPeriodeFiltre}
          listNature={naturesForFilter}
          optionsAnnee={optionsAnnee}
          handleResetFilters={handleResetFilters}
          totalDepensesFiltrees={totalDepensesFiltrees}
          totalCoffreFortFiltre={totalCoffreFortFiltre}
        />
      </Grid>
      <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <ExpensesChart title='Répartition des Dépenses (Période)' data={chartData} />
        <ExpensesChart title='Répartition des Dépenses (Global)' data={globalChartData} />
      </Grid>
      <Grid item xs={12} lg={8}>
        <ExpensesTable
          loading={loading}
          depenses={depenses}
          total={totalDepenses}
          page={page}
          setPage={setPage}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          refreshData={handleRefreshData}
          listNature={listNature}
        />
      </Grid>
    </Grid>
  )
}

export default ListeDepensesView
