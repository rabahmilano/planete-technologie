import { useState } from 'react'
import { Grid, Typography } from '@mui/material'
import MuiTab from '@mui/material/Tab'
import { styled } from '@mui/material/styles'

import TabContext from '@mui/lab/TabContext'
import MuiTabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'

import Icon from 'src/@core/components/icon'
import { ProduitDashboardProvider } from 'src/context/ProduitDashboardContext'

import ProduitsEnStock from 'src/views/pages/produits/produitsEnStock'
import AchataAttenteStock from 'src/views/pages/produits/achataAttenteStock'
import HistoriqueAchats from 'src/views/pages/produits/historiqueAchats'
import HistoriqueDesPrix from 'src/views/pages/produits/historiquesDesPrix'

const ProduitsVendus = () => <Typography sx={{ p: 4 }}>Contenu pour Produits Vendus</Typography>
const StatistiquesDesVentes = () => <Typography sx={{ p: 4 }}>Contenu pour Statistiques des Ventes</Typography>

const Tab = styled(MuiTab)(({ theme }) => ({
  flexDirection: 'row',
  '& svg': {
    marginBottom: '0 !important',
    marginRight: theme.spacing(1.5)
  }
}))

const TabList = styled(MuiTabList)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
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

const ProductPageContent = () => {
  const [tabValue, setTabValue] = useState('1')

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  return (
    <TabContext value={tabValue}>
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <TabList onChange={handleTabChange} variant='scrollable' scrollButtons='auto'>
            <Tab value='1' label='Produits en Stock' icon={<Icon icon='tabler:box' />} />
            <Tab value='2' label='Produits Vendus' icon={<Icon icon='tabler:shopping-cart' />} />
            <Tab value='3' label='Statistiques des Ventes' icon={<Icon icon='tabler:chart-bar' />} />
            <Tab value='4' label='Historique des achats' icon={<Icon icon='tabler:history' />} />
            <Tab value='5' label='À Recevoir' icon={<Icon icon='tabler:truck-delivery' />} />
            <Tab value='6' label='Historique des Prix' icon={<Icon icon='tabler:currency-dollar' />} />
          </TabList>
        </Grid>

        <Grid item xs={12}>
          <TabPanel value='1' sx={{ p: 0 }}>
            <ProduitsEnStock />
          </TabPanel>
          <TabPanel value='2' sx={{ p: 0 }}>
            <ProduitsVendus />
          </TabPanel>
          <TabPanel value='3' sx={{ p: 0 }}>
            <StatistiquesDesVentes />
          </TabPanel>
          <TabPanel value='4' sx={{ p: 0 }}>
            <HistoriqueAchats />
          </TabPanel>
          <TabPanel value='5' sx={{ p: 0 }}>
            <AchataAttenteStock />
          </TabPanel>
          <TabPanel value='6' sx={{ p: 0 }}>
            <HistoriqueDesPrix />
          </TabPanel>
        </Grid>
      </Grid>
    </TabContext>
  )
}

const ProductPage = () => {
  return (
    <ProduitDashboardProvider>
      <ProductPageContent />
    </ProduitDashboardProvider>
  )
}

export default ProductPage
