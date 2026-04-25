import React, { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import ButtonBase from '@mui/material/ButtonBase'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useHomeDashboard } from 'src/context/HomeDashboardContext'
import { formatMontant } from 'src/@core/utils/format'
import Icon from 'src/@core/components/icon'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

const TransactionsChart = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [view, setView] = useState('volume')

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { fetchTransactionsChartData } = useHomeDashboard()

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      setLoading(true)
      const result = await fetchTransactionsChartData()
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
  }, [fetchTransactionsChartData])

  const viewConfigs = {
    volume: {
      title: 'Activité Commerciale',
      subheader: 'Volume des transactions : Achats vs Ventes sur 12 mois',
      areas: [
        { key: 'colis', name: 'Achats (Colis)', color: theme.palette.primary.main, id: 'colorColis' },
        { key: 'commandes', name: 'Ventes (Commandes)', color: theme.palette.success.main, id: 'colorCommandes' }
      ]
    },
    profit: {
      title: 'Rentabilité (Marge Brute)',
      subheader: 'Évolution du bénéfice net sur produits (Ventes - Coût de revient TTC)',
      areas: [{ key: 'marge', name: 'Marge Brute', color: theme.palette.info.main, id: 'colorMarge' }]
    },
    income: {
      title: 'Trésorerie Globale',
      subheader: 'Toutes les entrées (Ventes) VS Toutes les sorties (Stock + Frais)',
      areas: [
        { key: 'revenus', name: 'Entrées de Cash', color: theme.palette.success.main, id: 'colorRevenus' },
        { key: 'sorties_globales', name: 'Sorties de Cash', color: theme.palette.error.main, id: 'colorSorties' }
      ]
    },
    expenses: {
      title: "Frais d'Exploitation",
      subheader: 'Évolution des dépenses fixes et courantes (Hors achat de stock)',
      areas: [{ key: 'frais_exploitation', name: 'Dépenses', color: theme.palette.warning.main, id: 'colorFrais' }]
    }
  }

  const config = viewConfigs[view]

  const NavButton = ({ targetView, icon, label, activeColor }) => {
    const isActive = view === targetView

    return (
      <ButtonBase
        onClick={() => setView(targetView)}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: isMobile ? 1 : 1.5,
          width: isMobile ? 45 : 85,
          borderRadius: 1,
          border: theme => `1px ${isActive ? 'solid' : 'dashed'} ${isActive ? activeColor : theme.palette.divider}`,
          backgroundColor: isActive ? `${activeColor}10` : 'transparent',
          transition: 'all 0.2s ease-in-out',
          '&:hover': { backgroundColor: theme => (isActive ? `${activeColor}20` : theme.palette.action.hover) }
        }}
      >
        <Box
          sx={{
            color: isActive ? activeColor : theme.palette.text.secondary,
            mb: isMobile ? 0 : 0.5,
            display: 'flex'
          }}
        >
          <Icon icon={icon} fontSize={isMobile ? '1.5rem' : '1.75rem'} />
        </Box>
        {!isMobile && (
          <Typography
            variant='caption'
            sx={{
              fontWeight: 600,
              color: isActive ? activeColor : 'text.secondary',
              lineHeight: 1,
              textAlign: 'center'
            }}
          >
            {label}
          </Typography>
        )}
      </ButtonBase>
    )
  }

  const renderContent = () => {
    if (loading) return <CircularProgress />
    if (error) return <Typography color='error'>Erreur de chargement</Typography>

    return (
      <ResponsiveContainer width='100%' height='100%'>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            {config.areas.map(area => (
              <linearGradient key={area.id} id={area.id} x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor={area.color} stopOpacity={0.3} />
                <stop offset='95%' stopColor={area.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray='3 3' vertical={false} stroke={theme.palette.divider} />
          <XAxis dataKey='month' axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12 }}
            tickFormatter={value =>
              view !== 'volume'
                ? new Intl.NumberFormat('fr-DZ', { notation: 'compact', compactDisplay: 'short' }).format(value)
                : value
            }
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: theme.shadows[3],
              backgroundColor: theme.palette.background.paper
            }}
            formatter={val => (view !== 'volume' ? `${formatMontant(val)} DA` : val)}
          />
          <Legend wrapperStyle={{ paddingTop: 20 }} iconType='circle' />
          {config.areas.map(area => (
            <Area
              key={area.key}
              type='monotone'
              dataKey={area.key}
              name={area.name}
              stroke={area.color}
              strokeWidth={3}
              fillOpacity={1}
              fill={`url(#${area.id})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={config.title}
        subheader={config.subheader}
        action={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <NavButton
              targetView='volume'
              icon='tabler:box'
              label='Activité'
              activeColor={theme.palette.primary.main}
            />
            <NavButton
              targetView='income'
              icon='tabler:scale'
              label='Trésorerie'
              activeColor={theme.palette.error.main}
            />
            <NavButton
              targetView='profit'
              icon='tabler:chart-line'
              label='Marge'
              activeColor={theme.palette.info.main}
            />
            <NavButton
              targetView='expenses'
              icon='tabler:receipt'
              label='Frais'
              activeColor={theme.palette.warning.main}
            />
          </Box>
        }
      />
      <CardContent sx={{ pb: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ height: 400, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {renderContent()}
        </Box>
      </CardContent>
    </Card>
  )
}

export default TransactionsChart
