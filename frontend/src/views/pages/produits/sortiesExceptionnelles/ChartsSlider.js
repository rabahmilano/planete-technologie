import { useState, useEffect } from 'react'
import { Card, CardContent, Typography, Box, IconButton, useTheme } from '@mui/material'
import {
  PieChart,
  Pie,
  Sector,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts'
import Icon from 'src/@core/components/icon'
import { formatMontant } from 'src/@core/utils/format'
import { stringToColor } from 'src/@core/utils/colorUtils' // <-- Import de ta fonction

const motifLabels = {
  UTILISATION_PERSONNELLE: 'Personnel',
  PERTE_LIVRAISON: 'Perte',
  CASSE_DEFECTUEUX: 'Casse',
  VENTE_A_CREDIT: 'Crédit',
  SAISIE_DOUANE: 'Douane'
}

const renderActiveShape = (props, theme) => {
  const RADIAN = Math.PI / 180
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props

  const sin = Math.sin(-RADIAN * midAngle)
  const cos = Math.cos(-RADIAN * midAngle)
  const sx = cx + (outerRadius + 6) * cos
  const sy = cy + (outerRadius + 6) * sin
  const mx = cx + (outerRadius + 15) * cos
  const my = cy + (outerRadius + 15) * sin
  const ex = mx + (cos >= 0 ? 1 : -1) * 12
  const ey = my
  const textAnchor = cos >= 0 ? 'start' : 'end'

  return (
    <g>
      <text x={cx} y={cy} dy={4} textAnchor='middle' fill={fill} style={{ fontWeight: 700, fontSize: '0.85rem' }}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 4}
        outerRadius={outerRadius + 8}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill='none' />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke='none' />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 8}
        y={ey}
        textAnchor={textAnchor}
        fill={theme.palette.text.primary}
        style={{ fontSize: '0.75rem', fontWeight: 600 }}
      >
        {`${value} Article${value > 1 ? 's' : ''}`}
      </text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 8}
        y={ey}
        dy={16}
        textAnchor={textAnchor}
        fill={theme.palette.text.secondary}
        style={{ fontSize: '0.7rem' }}
      >
        {`( ${(percent * 100).toFixed(1)}% )`}
      </text>
    </g>
  )
}

const ChartsSlider = ({ sorties, stats }) => {
  const theme = useTheme()
  const [activeSlide, setActiveSlide] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [activePieIndex, setActivePieIndex] = useState(0)

  useEffect(() => {
    if (isHovered) return
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev === 2 ? 0 : prev + 1))
    }, 7000)
    return () => clearInterval(timer)
  }, [isHovered, activeSlide])

  // Couleurs sémantiques liées au thème pour les statuts
  const statusColors = {
    EN_ATTENTE: theme.palette.warning.main,
    REMBOURSE: theme.palette.success.main,
    REFUSE: theme.palette.error.main,
    NON_APPLICABLE: theme.palette.secondary.main
  }

  // Calcul basé sur la quantité (Articles) et non plus les dossiers (+1)
  const statusData = [
    {
      name: 'En Attente',
      value: sorties.filter(s => s.statut_remb === 'EN_ATTENTE').reduce((acc, curr) => acc + curr.qte_totale, 0),
      color: statusColors.EN_ATTENTE
    },
    {
      name: 'Remboursé',
      value: sorties.filter(s => s.statut_remb === 'REMBOURSE').reduce((acc, curr) => acc + curr.qte_totale, 0),
      color: statusColors.REMBOURSE
    },
    {
      name: 'Refusé',
      value: sorties.filter(s => s.statut_remb === 'REFUSE').reduce((acc, curr) => acc + curr.qte_totale, 0),
      color: statusColors.REFUSE
    },
    {
      name: 'Non Applicable',
      value: sorties.filter(s => s.statut_remb === 'NON_APPLICABLE').reduce((acc, curr) => acc + curr.qte_totale, 0),
      color: statusColors.NON_APPLICABLE
    }
  ].filter(d => d.value > 0)

  // Calcul basé sur la quantité pour les motifs
  const motifCounts = sorties.reduce((acc, curr) => {
    acc[curr.motif] = (acc[curr.motif] || 0) + curr.qte_totale
    return acc
  }, {})

  const motifData = Object.entries(motifLabels).map(([key, label]) => ({
    name: label,
    value: motifCounts[key] || 0,
    color: stringToColor(key) // <-- Utilisation de ta fonction dynamique
  }))

  // Couleurs sémantiques pour les finances
  const montantsData = [
    { name: 'Valeur', montant: stats.perteFinanciere, fill: theme.palette.error.main },
    { name: 'Attendu', montant: stats.montantEnAttente, fill: theme.palette.warning.main },
    { name: 'Récupéré', montant: stats.montantRecupere, fill: theme.palette.success.main }
  ]

  const bilan = stats.montantRecupere - stats.perteFinanciere
  const isPositif = bilan >= 0

  const handleNext = () => setActiveSlide(prev => (prev === 2 ? 0 : prev + 1))
  const handlePrev = () => setActiveSlide(prev => (prev === 0 ? 2 : prev - 1))

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      // On récupère la couleur qu'elle vienne de fill, stroke, ou de notre attribut 'color' (stringToColor)
      const labelColor = data.color || data.payload.color || data.fill || theme.palette.primary.main

      return (
        <Box
          sx={{ bgcolor: 'background.paper', p: 2, border: 1, borderColor: 'divider', borderRadius: 1, boxShadow: 3 }}
        >
          <Typography variant='body2' sx={{ fontWeight: 600 }}>
            {data.payload.name}
          </Typography>
          <Typography variant='body2' sx={{ color: labelColor, fontWeight: 700 }}>
            {data.dataKey === 'montant' ? `${formatMontant(data.value)} DA` : `${data.value} Articles`}
          </Typography>
        </Box>
      )
    }
    return null
  }

  const slideStyle = index => ({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: activeSlide === index ? 1 : 0,
    transition: 'opacity 0.6s ease-in-out',
    pointerEvents: activeSlide === index ? 'auto' : 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  })

  return (
    <Card
      sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: '24px !important' }}>
        <Box sx={{ flexGrow: 1, position: 'relative', width: '100%', minHeight: 220 }}>
          <Box sx={slideStyle(0)}>
            <Typography variant='subtitle2' sx={{ mb: 2, fontWeight: 600 }}>
              Répartition par Statut
            </Typography>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie
                  data={statusData}
                  cx='50%'
                  cy='50%'
                  activeIndex={activePieIndex}
                  activeShape={props => renderActiveShape(props, theme)}
                  onMouseEnter={(_, index) => setActivePieIndex(index)}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={0}
                  dataKey='value'
                  stroke='none'
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </Box>

          <Box sx={slideStyle(1)}>
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                px: 2
              }}
            >
              <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                Bilan Financier
              </Typography>
              <Typography
                variant='caption'
                sx={{
                  fontWeight: 700,
                  color: '#ffffff',
                  bgcolor: isPositif ? 'success.main' : 'error.main',
                  px: 2,
                  py: 0.5,
                  borderRadius: 1
                }}
              >
                {isPositif ? '+' : ''}
                {formatMontant(bilan)} DA
              </Typography>
            </Box>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={montantsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray='3 3' vertical={false} stroke={theme.palette.divider} />
                <XAxis
                  dataKey='name'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                  tickFormatter={val => `${val / 1000}k`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: theme.palette.action.hover }} />
                <Bar dataKey='montant' radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {montantsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>

          <Box sx={slideStyle(2)}>
            <Typography variant='subtitle2' sx={{ mb: 1, fontWeight: 600 }}>
              Analyse des Motifs
            </Typography>
            <ResponsiveContainer width='100%' height='100%'>
              <RadarChart cx='50%' cy='50%' outerRadius='70%' data={motifData}>
                <PolarGrid stroke={theme.palette.divider} />
                <PolarAngleAxis dataKey='name' tick={{ fontSize: 10, fill: theme.palette.text.secondary }} />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                <Radar
                  name='Articles'
                  dataKey='value'
                  stroke={theme.palette.primary.main}
                  fill={theme.palette.primary.main}
                  fillOpacity={0.5}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 3, gap: 2 }}>
          <IconButton size='small' onClick={handlePrev}>
            <Icon icon='tabler:chevron-left' fontSize='1.25rem' />
          </IconButton>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {[0, 1, 2].map(dot => (
              <Box
                key={dot}
                onClick={() => setActiveSlide(dot)}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: activeSlide === dot ? 'primary.main' : 'action.disabled',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s'
                }}
              />
            ))}
          </Box>
          <IconButton size='small' onClick={handleNext}>
            <Icon icon='tabler:chevron-right' fontSize='1.25rem' />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  )
}

export default ChartsSlider
