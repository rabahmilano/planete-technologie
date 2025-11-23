import { Card, CardContent, CardHeader, Box, Typography } from '@mui/material'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { stringToColor } from 'src/@core/utils/colorUtils'

const ExpensesChart = ({ data }) => {
  return (
    <Card>
      <CardHeader title='Répartition des Dépenses (Période)' />
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width='100%' height={350}>
            <PieChart>
              <Pie
                data={data}
                dataKey='value'
                nameKey='name'
                cx='50%'
                cy='50%'
                outerRadius={120}
                fill='#8884d8'
                labelLine={false}
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {data.map(entry => (
                  <Cell key={`cell-${entry.name}`} fill={stringToColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value.toLocaleString('fr-DZ')} DZD`, name]} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <Box
            sx={{
              textAlign: 'center',
              p: 4,
              height: 350,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography>Pas de données pour le graphique.</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default ExpensesChart
