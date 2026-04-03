import Grid from '@mui/material/Grid'
import { useTheme } from '@mui/material/styles'
import StatCard from 'src/views/pages/produits/historiquesDesPrix/components/StatCard'

const KpiCards = ({ data }) => {
  const theme = useTheme()

  // Extraction des données avec sécurité (fallback à 0)
  const ca = data?.commandes?.globalCA || 0
  const invest = data?.depenses?.totalDepenses || 0
  const marge = ca - invest
  const colisCount = data?.colis?.totalCount || 0
  const articlesCount = data?.colis?.totalProduits || 0

  const stats = [
    {
      title: "Chiffre d'Affaires",
      value: `${ca.toLocaleString()} DZD`,
      icon: 'mdi:currency-usd',
      color: theme.palette.primary.main // On passe la valeur réelle, pas le string
    },
    {
      title: 'Investissement',
      value: `${invest.toLocaleString()} DZD`,
      icon: 'mdi:wallet-outline',
      color: theme.palette.error.main
    },
    {
      title: 'Marge Brute',
      value: `${marge.toLocaleString()} DZD`,
      icon: 'mdi:trending-up',
      color: marge >= 0 ? theme.palette.success.main : theme.palette.error.main
    },
    {
      title: 'Colis en Route',
      value: colisCount,
      subValue: `${articlesCount} articles`,
      icon: 'mdi:truck-delivery-outline',
      color: theme.palette.warning.main
    }
  ]

  return (
    <Grid container spacing={6}>
      {stats.map((item, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <StatCard
            title={item.title}
            value={item.value}
            subValue={item.subValue}
            color={item.color}
            icon={item.icon}
          />
        </Grid>
      ))}
    </Grid>
  )
}

export default KpiCards
