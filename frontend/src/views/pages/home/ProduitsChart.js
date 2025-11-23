import { useState, useEffect } from 'react'
import axios from 'axios'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

const ProduitsChart = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const theme = useTheme()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/dashboard/chart-produits`)
        setData(response.data)
      } catch (err) {
        toast.error('Erreur de chargement du graphique des produits.')
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const renderContent = () => {
    if (loading) {
      return <CircularProgress />
    }
    if (error) {
      return <Typography color='error'>Impossible de charger les données.</Typography>
    }
    return (
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray='3 3' />
          <XAxis dataKey='month' />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line
            type='monotone'
            dataKey='produitsAchetes'
            name='Produits Achetés'
            stroke={theme.palette.primary.main}
            strokeWidth={2}
          />
          <Line
            type='monotone'
            dataKey='produitsVendus'
            name='Produits Vendus'
            stroke={theme.palette.success.main}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <Card>
      <CardHeader title='Évolution des Stocks' subheader='Quantité de produits achetés vs vendus sur 12 mois' />
      <CardContent>
        <Box sx={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {renderContent()}
        </Box>
      </CardContent>
    </Card>
  )
}

export default ProduitsChart
