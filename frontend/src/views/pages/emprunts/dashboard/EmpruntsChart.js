import { Card, CardHeader, CardContent, Typography, useTheme } from '@mui/material'
import ReactApexcharts from 'src/@core/components/react-apexcharts'
import { useEmprunt } from 'src/context/EmpruntContext'

const EmpruntsChart = () => {
  const theme = useTheme()
  const { emprunts } = useEmprunt()

  let totalRembourse = 0
  let resteAPayerGlobal = 0

  emprunts.forEach(emp => {
    const montantInitial = parseFloat(emp.montant_emprunt || 0)
    const remb = emp.remboursements?.reduce((acc, curr) => acc + parseFloat(curr.montant_remb), 0) || 0
    totalRembourse += remb
    resteAPayerGlobal += (montantInitial - remb)
  })

  // Configuration du Graphe ApexCharts
  const options = {
    chart: { sparkline: { enabled: true } },
    colors: [theme.palette.success.main, theme.palette.error.main],
    labels: ['Remboursé', 'Reste à payer'],
    stroke: { width: 0 },
    dataLabels: { enabled: false },
    legend: { show: true, position: 'bottom' },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true,
            name: { offsetY: -10 },
            value: {
              offsetY: 10,
              formatter: val => `${parseInt(val).toLocaleString('fr-DZ')} DZD`
            },
            total: {
              show: true,
              label: 'Dette Globale',
              formatter: (w) => {
                // On demande à ApexCharts d'additionner ses propres séries (Remboursé + Reste à payer)
                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0)
                return `${total.toLocaleString('fr-DZ')} DA`
              }
            }
          }
        }
      }
    }
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title='Répartition de la dette' titleTypographyProps={{ variant: 'h6' }} />
      <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ReactApexcharts type='donut' height={260} options={options} series={[totalRembourse, resteAPayerGlobal]} />
      </CardContent>
    </Card>
  )
}

export default EmpruntsChart