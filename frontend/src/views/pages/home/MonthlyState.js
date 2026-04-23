import { useState } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import { useTheme } from '@mui/material/styles'
import { BarChart, Bar, ResponsiveContainer, Tooltip, YAxis, XAxis } from 'recharts'
import { formatMontant } from 'src/@core/utils/format'
import Icon from 'src/@core/components/icon'

const MonthlyState = ({ data }) => {
  const theme = useTheme()
  const [isSales, setIsSales] = useState(true)

  const chartData = Array.isArray(isSales ? data?.ventes : data?.achats) ? (isSales ? data.ventes : data.achats) : []

  const totalOrders = chartData.reduce((sum, week) => sum + (week.orders || 0), 0)
  const totalIncome = chartData.reduce((sum, week) => sum + (week.income || 0), 0)
  const maxVal = Math.max(...chartData.map(d => Math.max(d.orders || 0, Math.abs(d.articles || 0))), 1)

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={isSales ? 'Bilan Mensuel Ventes' : 'Bilan Mensuel Achats'}
        titleTypographyProps={{ variant: 'h6' }}
        action={
          <IconButton
            size='small'
            onClick={() => setIsSales(!isSales)}
            sx={{ color: isSales ? 'primary.main' : 'warning.main' }}
          >
            <Icon icon={isSales ? 'tabler:shopping-cart' : 'tabler:package'} />
          </IconButton>
        }
      />
      <CardContent sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant='h3' sx={{ fontWeight: 700, mr: 2 }}>
            {totalOrders}
          </Typography>
          <Typography variant='body2' color={isSales ? 'success.main' : 'warning.main'} sx={{ fontWeight: 600 }}>
            {isSales ? 'Commandes' : 'Colis'}
          </Typography>
        </Box>
        <Typography variant='body2' sx={{ mb: 6, color: 'text.secondary' }}>
          {isSales ? 'Revenu' : 'Dépense'} : {formatMontant(totalIncome)} DZD
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, height: 260 }}>
          <Box sx={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey='week' hide />
                <YAxis domain={[0, maxVal]} hide />
                <Tooltip
                  cursor={{ fill: theme.palette.action.hover }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: theme.shadows[3] }}
                  labelFormatter={label => (label ? label.replace('S', 'Semaine ') : label)}
                  formatter={value => [value, isSales ? 'Commandes' : 'Colis']}
                />
                <Bar
                  dataKey='orders'
                  fill={isSales ? theme.palette.primary.main : theme.palette.info.main}
                  radius={[10, 10, 10, 10]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Box sx={{ display: 'flex', width: '100%', py: 1 }}>
            {chartData.map((d, index) => (
              <Box key={index} sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <Typography variant='caption' sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.65rem' }}>
                  {d.week}
                </Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 10 }}>
                <XAxis dataKey='week' hide />
                <YAxis domain={[-maxVal, 0]} hide />
                <Tooltip
                  cursor={{ fill: theme.palette.action.hover }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: theme.shadows[3] }}
                  labelFormatter={label => (label ? label.replace('S', 'Semaine ') : label)}
                  formatter={value => [Math.abs(value), 'Articles']}
                />
                <Bar
                  dataKey='articles'
                  fill={isSales ? theme.palette.success.main : theme.palette.warning.main}
                  radius={[10, 10, 10, 10]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default MonthlyState
