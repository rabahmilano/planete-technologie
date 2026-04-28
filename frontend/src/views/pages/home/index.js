import { useState, useEffect } from 'react'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Box from '@mui/material/Box'
import { useHomeDashboard } from 'src/context/HomeDashboardContext'

import WelcomeCard from './WelcomeCard'
import KpiCards from './KpiCards'
import TransactionsChart from './TransactionsChart'
import ArticlesChart from './ArticlesChart'
import WeeklyState from './WeeklyState'
import MonthlyState from './MonthlyState'
import TopProduits from './TopProduits'
import DernieresCommandes from './DernieresCommandes'
import KpiCardsSkeleton from './KpiCardsSkeleton'

const HomeView = () => {
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [chartData, setChartData] = useState([])
  const [rollingKpis, setRollingKpis] = useState(null)
  const [listsData, setListsData] = useState({ topProduits: [], dernieresCommandes: [] })
  const [isLoading, setIsLoading] = useState(true)

  const {
    fetchAllStats,
    fetchPeriodicPerformance,
    fetchTransactionsChartData,
    fetchVentesRecentesEtTopProduits,
    fetchRollingKpis
  } = useHomeDashboard()

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      const [global, periodic, transactions, lists, rolling] = await Promise.all([
        fetchAllStats(),
        fetchPeriodicPerformance(),
        fetchTransactionsChartData(),
        fetchVentesRecentesEtTopProduits(),
        fetchRollingKpis()
      ])

      setStats(global)
      setAnalytics(periodic)
      setChartData(transactions)
      setListsData(lists)
      setRollingKpis(rolling)
      setIsLoading(false)
    }
    loadData()
  }, [
    fetchAllStats,
    fetchPeriodicPerformance,
    fetchTransactionsChartData,
    fetchVentesRecentesEtTopProduits,
    fetchRollingKpis
  ])

  return (
    <Grid container spacing={6} alignItems='stretch'>
      <Grid item xs={12} md={4} sx={{ display: 'flex' }}>
        <Box sx={{ width: '100%' }}>
          {/* Correction ici : ajout animation='wave' et height={180} */}
          {isLoading ? <Skeleton variant='rounded' animation='wave' width='100%' height={180} /> : <WelcomeCard />}
        </Box>
      </Grid>

      <Grid item xs={12} md={8} sx={{ display: 'flex' }}>
        <Box sx={{ width: '100%' }}>
          {isLoading ? <KpiCardsSkeleton /> : <KpiCards rollingData={rollingKpis} globalStats={stats} />}
        </Box>
      </Grid>

      <Grid item xs={12} md={8}>
        {isLoading ? (
          <Skeleton variant='rounded' animation='wave' width='100%' height={400} />
        ) : (
          <TransactionsChart data={chartData} />
        )}
      </Grid>

      <Grid item xs={12} md={4}>
        {isLoading ? (
          <Skeleton variant='rounded' animation='wave' width='100%' height={400} />
        ) : (
          <WeeklyState data={analytics?.weeklyStats} />
        )}
      </Grid>

      <Grid item xs={12} md={4}>
        {isLoading ? (
          <Skeleton variant='rounded' animation='wave' width='100%' height={400} />
        ) : (
          <MonthlyState data={analytics?.monthlyStats} />
        )}
      </Grid>

      <Grid item xs={12} md={8}>
        {isLoading ? <Skeleton variant='rounded' animation='wave' width='100%' height={400} /> : <ArticlesChart />}
      </Grid>

      <Grid item xs={12} md={6}>
        {isLoading ? (
          <Skeleton variant='rounded' animation='wave' width='100%' height={400} />
        ) : (
          <TopProduits data={listsData?.topProduits} />
        )}
      </Grid>

      <Grid item xs={12} md={6}>
        {isLoading ? (
          <Skeleton variant='rounded' animation='wave' width='100%' height={400} />
        ) : (
          <DernieresCommandes data={listsData?.dernieresCommandes} />
        )}
      </Grid>
    </Grid>
  )
}

export default HomeView
