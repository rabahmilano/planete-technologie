import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import CardHeader from '@mui/material/CardHeader'

import PageHeader from 'src/@core/components/page-header'
import { SortieExceptionnelleProvider } from 'src/context/SortieExceptionnelleContext'
import ListeSortiesExceptionnelles from 'src/views/pages/produits/sortiesExceptionnelles'

const SortiesExceptionnelles = () => {
  return (
    <SortieExceptionnelleProvider>
      <Grid container spacing={5}>
        <Grid item xs={12}>
          <PageHeader title={<Typography variant='h4'>Sorties Exceptionnelles</Typography>} />
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title='Liste et suivi des sorties exceptionnelles' />
            <Divider sx={{ m: '0 !important' }} />
            <ListeSortiesExceptionnelles />
          </Card>
        </Grid>
      </Grid>
    </SortieExceptionnelleProvider>
  )
}

export default SortiesExceptionnelles
