import { useState, useEffect } from 'react'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useHomeDashboard } from 'src/context/HomeDashboardContext'

import KpiCards from './KpiCards'
import TransactionsChart from './TransactionsChart'
import ArticlesChart from './ArticlesChart'

const HomeView = () => {
  const [data, setData] = useState(null)
  const { fetchAllStats } = useHomeDashboard()

  useEffect(() => {
    const loadData = async () => {
      const res = await fetchAllStats()
      setData(res)
    }
    loadData()
  }, [fetchAllStats])

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Box sx={{ mb: 2 }}>
          <Typography variant='h5' sx={{ fontWeight: 600 }}>
            Tableau de Bord 🚀
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            Aperçu immédiat de votre activité commerciale et financière.
          </Typography>
        </Box>
      </Grid>

      {/* Ligne des 4 StatCards (KPIs) */}
      <Grid item xs={12}>
        <KpiCards data={data} />
      </Grid>

      {/* Graphiques côte à côte avec hauteur réduite pour éviter l'effet carré */}
      <Grid item xs={12} lg={6}>
        <TransactionsChart />
      </Grid>

      <Grid item xs={12} lg={6}>
        <ArticlesChart />
      </Grid>
    </Grid>
  )
}

export default HomeView
