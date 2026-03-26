import { Card, CardHeader, CardContent, useTheme } from '@mui/material'
import ReactApexcharts from 'src/@core/components/react-apexcharts'
import { useEmprunt } from 'src/context/EmpruntContext'
import { formatMontant } from 'src/@core/utils/format'

const EmpruntsChart = () => {
  const theme = useTheme()
  const { emprunts } = useEmprunt()

  let totalRembourse = 0
  let resteAPayerGlobal = 0

  emprunts.forEach(emp => {
    const montantInitial = parseFloat(emp.mnt_emprunt || 0)
    const remb = emp.remboursements?.reduce((acc, curr) => acc + parseFloat(curr.mnt_remb || 0), 0) || 0
    totalRembourse += remb
    resteAPayerGlobal += montantInitial - remb
  })

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
              formatter: val => `${formatMontant(val)} DA`
            },
            total: {
              show: true,
              label: 'Dette Globale',
              formatter: w => {
                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0)
                return `${formatMontant(total)} DA`
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
