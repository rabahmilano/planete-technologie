import { useState } from 'react'
import { Grid, Card, CardHeader, CardContent, Tabs, Typography, Box } from '@mui/material'

import TabContext from '@mui/lab/TabContext'
import MuiTabList from '@mui/lab/TabList'
import MuiTab from '@mui/material/Tab'
import { styled } from '@mui/material/styles'
// ** Icon Imports
import Icon from 'src/@core/components/icon'

import PageHeader from 'src/@core/components/page-header'

import ProduitsEnStock from 'src/views/pages/produits/produitsEnStock'
import AchataAttenteStock from 'src/views/pages/produits/achataAttenteStock'
import HistoriqueAchats from 'src/views/pages/produits/historiqueAchats'
import HistoriqueDesPrix from 'src/views/pages/produits/historiquesDesPrix'

// Components for each tab content
// const ProduitsEnStock = () => <Typography>Contenu pour Produits en Stock</Typography>

const ProduitsVendus = () => <Typography>Contenu pour Produits Vendus</Typography>

const StatistiquesDesVentes = () => <Typography>Contenu pour Statistiques des Ventes</Typography>

const ProduitsEnRupture = () => <Typography>Contenu pour Produits en Rupture de Stock</Typography>

const Tab = styled(MuiTab)(({ theme }) => ({
  flexDirection: 'row',
  '& svg': {
    marginBottom: '0 !important',
    marginRight: theme.spacing(1.5)
  }
}))

const TabList = styled(MuiTabList)(({ theme }) => ({
  borderBottom: '0 !important',
  '&, & .MuiTabs-scroller': {
    boxSizing: 'content-box',
    padding: theme.spacing(1.25, 1.25, 2),
    margin: `${theme.spacing(-1.25, -1.25, -2)} !important`
  },
  '& .MuiTabs-indicator': {
    display: 'none'
  },
  '& .Mui-selected': {
    boxShadow: theme.shadows[2],
    backgroundColor: theme.palette.primary.main,
    color: `${theme.palette.common.white} !important`
  },
  '& .MuiTab-root': {
    lineHeight: 1,
    borderRadius: theme.shape.borderRadius,
    '&:hover': {
      color: theme.palette.primary.main
    }
  }
}))

// TabPanel Component
const TabPanel = ({ children, value, index }) => {
  return value === index && <Box sx={{ p: 3 }}>{children}</Box>
}

// Main Component
const ProductPage = () => {
  const [tabIndex, setTabIndex] = useState(0)

  const handleTabChange = (event, newIndex) => {
    setTabIndex(newIndex)
  }

  return (
    <Grid container spacing={6}>
      {/* <PageHeader title={<Typography variant='h4'>Produit/statistiques</Typography>} /> */}
      <Grid item xs={12}>
        <Tabs value={tabIndex} variant='scrollable' scrollButtons='auto' onChange={handleTabChange}>
          <Tab label='Produits en Stock' />
          <Tab label='Produits Vendus' />
          <Tab label='Statistiques des Ventes' />
          <Tab label='Historique des achats' />
          <Tab label='À Recevoir' />
          <Tab label='Historique des Prix' />
        </Tabs>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <TabPanel value={tabIndex} index={0}>
              <ProduitsEnStock />
            </TabPanel>
            <TabPanel value={tabIndex} index={1}>
              <ProduitsVendus />
            </TabPanel>
            <TabPanel value={tabIndex} index={2}>
              <StatistiquesDesVentes />
            </TabPanel>
            <TabPanel value={tabIndex} index={3}>
              <HistoriqueAchats />
            </TabPanel>
            <TabPanel value={tabIndex} index={4}>
              <AchataAttenteStock />
            </TabPanel>
            <TabPanel value={tabIndex} index={5}>
              <HistoriqueDesPrix />
            </TabPanel>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default ProductPage
