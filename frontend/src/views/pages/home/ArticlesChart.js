import React, { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useHomeDashboard } from 'src/context/HomeDashboardContext'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

const ArticlesChart = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const theme = useTheme()
  const { fetchArticlesChartData } = useHomeDashboard()

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      setLoading(true)
      const result = await fetchArticlesChartData()
      if (isMounted) {
        if (result && result.length > 0) {
          const formattedData = result.map(item => ({
            ...item,
            month: dayjs(item.month).locale('fr').format('MMM YY')
          }))
          setData(formattedData)
          setError(false)
        } else {
          setError(true)
        }
        setLoading(false)
      }
    }
    fetchData()

    return () => {
      isMounted = false
    }
  }, [fetchArticlesChartData])

  const renderContent = () => {
    if (loading) {
      return <CircularProgress />
    }
    if (error && data.length === 0) {
      return <Typography color='error'>Impossible de charger les données.</Typography>
    }
    return (
      <ResponsiveContainer width='100%' height='100%'>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -35, bottom: 0 }}>
          <defs>
            <linearGradient id='colorAchetes' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='5%' stopColor={theme.palette.primary.main} stopOpacity={0.3} />
              <stop offset='95%' stopColor={theme.palette.primary.main} stopOpacity={0} />
            </linearGradient>
            <linearGradient id='colorVendus' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='5%' stopColor={theme.palette.success.main} stopOpacity={0.3} />
              <stop offset='95%' stopColor={theme.palette.success.main} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray='3 3' vertical={false} stroke={theme.palette.divider} />
          <XAxis
            dataKey='month'
            axisLine={false}
            tickLine={false}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            dy={10}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: theme.shadows[3],
              backgroundColor: theme.palette.background.paper
            }}
            itemStyle={{ fontWeight: 'bold' }}
          />
          <Legend wrapperStyle={{ paddingTop: 20 }} iconType='circle' />
          <Area
            type='monotone'
            dataKey='articlesAchetes'
            name='Articles Achetés'
            stroke={theme.palette.primary.main}
            strokeWidth={3}
            fillOpacity={1}
            fill='url(#colorAchetes)'
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
          <Area
            type='monotone'
            dataKey='articlesVendus'
            name='Articles Vendus'
            stroke={theme.palette.success.main}
            strokeWidth={3}
            fillOpacity={1}
            fill='url(#colorVendus)'
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader title='Flux des Articles' subheader='Entrées (achats) vs Sorties (ventes) sur 12 mois' />
      <CardContent sx={{ pb: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            height: 400,
            width: '100%',
            display: 'flex',
            justifyContent: loading || error ? 'center' : 'flex-start',
            alignItems: loading || error ? 'center' : 'stretch'
          }}
        >
          {renderContent()}
        </Box>
      </CardContent>
    </Card>
  )
}

export default ArticlesChart
