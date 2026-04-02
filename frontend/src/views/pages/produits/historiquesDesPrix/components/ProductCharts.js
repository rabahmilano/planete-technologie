import React, { useState } from 'react'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Sector,
  CartesianGrid,
  Area,
  AreaChart
} from 'recharts'
import { useTheme } from '@mui/material'

const renderActiveShape = (props, theme) => {
  const RADIAN = Math.PI / 180
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props
  const sin = Math.sin(-RADIAN * midAngle)
  const cos = Math.cos(-RADIAN * midAngle)
  const sx = cx + (outerRadius + 10) * cos
  const sy = cy + (outerRadius + 10) * sin
  const mx = cx + (outerRadius + 30) * cos
  const my = cy + (outerRadius + 30) * sin
  const ex = mx + (cos >= 0 ? 1 : -1) * 22
  const ey = my
  const textAnchor = cos >= 0 ? 'start' : 'end'

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor='middle' fill={theme.palette.text.primary} style={{ fontWeight: 600 }}>
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
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill='none' strokeWidth={2} />
      <circle cx={ex} cy={ey} r={3} fill={fill} stroke='none' />

      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        textAnchor={textAnchor}
        fill={theme.palette.text.primary}
        style={{ fontWeight: 'bold' }}
      >
        {`${(value || 0).toLocaleString('fr-DZ')} DA`}
      </text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        dy={18}
        textAnchor={textAnchor}
        fill={theme.palette.text.secondary}
      >
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  )
}

const getBeneficeColor = (benefice, coutAchat, theme) => {
  if (benefice < 0) return theme.palette.error.main
  const marge = (benefice / coutAchat) * 100
  if (marge < 100) return theme.palette.warning.main
  return theme.palette.success.main
}

export const FinancialPieChart = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const theme = useTheme()

  const onPieEnter = (_, index) => setActiveIndex(index)

  const coutAchatItem = data.find(item => item.name.includes('Coût'))
  const coutAchatValeur = coutAchatItem ? coutAchatItem.value : 1

  return (
    <ResponsiveContainer width='100%' height={300}>
      <PieChart>
        <Pie
          activeIndex={activeIndex}
          activeShape={props => renderActiveShape(props, theme)}
          data={data}
          cx='50%'
          cy='50%'
          innerRadius={75}
          outerRadius={95}
          dataKey='value'
          onMouseEnter={onPieEnter}
          stroke='none'
        >
          {data.map((entry, index) => {
            if (entry.name.includes('Coût')) return <Cell key={`cell-${index}`} fill={theme.palette.info.main} />
            return <Cell key={`cell-${index}`} fill={getBeneficeColor(entry.value, coutAchatValeur, theme)} />
          })}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}

export const QuantityLineChart = ({ data }) => {
  const theme = useTheme()

  return (
    <ResponsiveContainer width='100%' height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id='colorQty' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='5%' stopColor={theme.palette.success.main} stopOpacity={0.3} />
            <stop offset='95%' stopColor={theme.palette.success.main} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray='3 3' vertical={false} stroke={theme.palette.divider} />
        <XAxis
          dataKey='year'
          axisLine={false}
          tickLine={false}
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
        />

        <Tooltip
          formatter={value => [value, 'Quantité']}
          contentStyle={{
            borderRadius: '8px',
            border: 'none',
            boxShadow: theme.shadows[3],
            backgroundColor: theme.palette.background.paper
          }}
          itemStyle={{ color: theme.palette.success.main, fontWeight: 'bold' }}
        />
        <Area
          type='monotone'
          dataKey='value'
          stroke={theme.palette.success.main}
          strokeWidth={3}
          fillOpacity={1}
          fill='url(#colorQty)'
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
