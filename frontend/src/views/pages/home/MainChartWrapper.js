import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import { useTheme } from '@mui/material/styles'
import Icon from 'src/@core/components/icon'
import ReactApexcharts from 'src/@core/components/react-apexcharts'
import { useHomeDashboard } from 'src/context/HomeDashboardContext'

const MainChartWrapper = () => {
  const theme = useTheme()
  const { fetchTransactionsChartData } = useHomeDashboard()
  const [chartType, setChartType] = useState('area')
  const [series, setSeries] = useState([])
  const [categories, setCategories] = useState([])

  useEffect(() => {
    const loadData = async () => {
      const res = await fetchTransactionsChartData()
      if (res && res.series) {
        setSeries(res.series)
        setCategories(res.categories || [])
      }
    }
    loadData()
  }, [fetchTransactionsChartData])

  const options = {
    chart: {
      toolbar: { show: false }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    colors: [theme.palette.primary.main, theme.palette.success.main],
    xaxis: {
      categories: categories
    },
    fill: {
      type: chartType === 'area' ? 'gradient' : 'solid',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 100]
      }
    }
  }

  return (
    <Card>
      <CardHeader
        title='Transactions & Commandes'
        action={
          <Box>
            <IconButton
              size='small'
              onClick={() => setChartType('line')}
              color={chartType === 'line' ? 'primary' : 'default'}
            >
              <Icon icon='tabler:chart-line' />
            </IconButton>
            <IconButton
              size='small'
              onClick={() => setChartType('bar')}
              color={chartType === 'bar' ? 'primary' : 'default'}
            >
              <Icon icon='tabler:chart-bar' />
            </IconButton>
            <IconButton
              size='small'
              onClick={() => setChartType('area')}
              color={chartType === 'area' ? 'primary' : 'default'}
            >
              <Icon icon='tabler:chart-area' />
            </IconButton>
          </Box>
        }
      />
      <CardContent>
        <ReactApexcharts type={chartType} height={320} options={options} series={series} />
      </CardContent>
    </Card>
  )
}

export default MainChartWrapper
