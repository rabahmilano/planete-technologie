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
  const { depenses, listNature, loading, totalDepenses, fetchData, globalStats } = useDepense()

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

  // ** LA CORRECTION EST DANS CE BLOC useMemo **
  const { totalDepensesFiltrees, totalCoffreFortFiltre, chartData } = useMemo(() => {
    const depensesOperationnelles = depenses.filter(d => d.nature !== 'COFFRE FORT')
    const epargneCoffreFort = depenses.filter(d => d.nature === 'COFFRE FORT')

    const totalDep = depensesOperationnelles.reduce((acc, curr) => acc + parseFloat(curr.montant || 0), 0)
    const totalCf = epargneCoffreFort.reduce((acc, curr) => acc + parseFloat(curr.montant || 0), 0)

    // 1. On calcule les données pour le graphique et on les stocke dans une variable `dataForChart`
    const dataForChart = Object.values(
      depensesOperationnelles.reduce((acc, { nature, montant }) => {
        acc[nature] = { name: nature, value: (acc[nature]?.value || 0) + parseFloat(montant || 0) }
        return acc
      }, {})
    ).sort((a, b) => b.value - a.value)

    // 2. On retourne l'objet en assignant correctement la variable
    // L'erreur était : `chartData` au lieu de `chartData: dataForChart`
    return {
      totalDepensesFiltrees: totalDep,
      totalCoffreFortFiltre: totalCf,
      chartData: dataForChart // <<< LIGNE CORRIGÉE
    }
  }, [depenses])

  const handleResetFilters = () => {
    setNatureFiltre('')
    setPeriodeFiltre('all')
    setPage(0)
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
      <Grid item xs={12} lg={5}>
        <ExpensesChart data={chartData} />
      </Grid>
      <Grid item xs={12} lg={7}>
        <ExpensesTable
          loading={loading}
          depenses={depenses}
          total={totalDepenses}
          page={page}
          setPage={setPage}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
        />
      </Grid>
    </Grid>
  )
}

export default ListeDepensesView
