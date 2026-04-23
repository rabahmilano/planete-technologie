import { useState, useEffect } from 'react'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import { useHomeDashboard } from 'src/context/HomeDashboardContext'

import KpiCards from './KpiCards'
import TransactionsChart from './TransactionsChart'
import ArticlesChart from './ArticlesChart'
import WeeklyState from './WeeklyState'
import MonthlyState from './MonthlyState'

const HomeView = () => {
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Utilisation du nouveau nom de fonction : fetchPeriodicPerformance
  const { fetchAllStats, fetchPeriodicPerformance } = useHomeDashboard()

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      const global = await fetchAllStats()
      const periodic = await fetchPeriodicPerformance()

      if (global) setStats(global)
      if (periodic) setAnalytics(periodic)

      setIsLoading(false)
    }

    loadData()
  }, [fetchAllStats, fetchPeriodicPerformance])

  return (
    <Grid container spacing={6} className='match-height'>
      <Grid item xs={12}>
        {isLoading ? (
          <Grid container spacing={6}>
            {[1, 2, 3, 4].map(item => (
              <Grid key={item} item xs={12} sm={6} md={3}>
                <Skeleton variant='rounded' animation='wave' width='100%' height={160} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <KpiCards data={stats} />
        )}
      </Grid>

      <Grid item xs={12} md={8}>
        {isLoading ? <Skeleton variant='rounded' animation='wave' width='100%' height={400} /> : <TransactionsChart />}
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
    </Grid>
  )
}

export default HomeView
