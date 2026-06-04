import { forwardRef } from 'react'
import { Dialog, AppBar, Toolbar, IconButton, Typography, Slide, Box } from '@mui/material'
import Icon from 'src/@core/components/icon'
import DepensesVoyageModalKpis from './DepensesVoyageModalKpis'
import DepensesVoyageModalTable from './DepensesVoyageModalTable'

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction='up' ref={ref} {...props} />
})

const DepensesVoyageModal = ({ open, onClose, depenses, onRefresh }) => {
  const depensesList = depenses || []

  const depensesActives = depensesList.filter(d => !d.isAnnule)

  let totalDepensesDA = 0
  const totalsParDevise = {}
  const naturesSet = new Set()
  const coutParNature = {}

  depensesActives.forEach(d => {
    const montantDA = parseFloat(d.mnt_dep_dzd || 0)
    const montantDevise = parseFloat(d.mnt_dep || 0)
    const devise = d.compte?.dev_code || 'DZD'
    const natureName = d.nature_dep?.designation_nat_dep || 'Non spécifié'

    totalDepensesDA += montantDA

    if (!totalsParDevise[devise]) totalsParDevise[devise] = 0
    totalsParDevise[devise] += montantDevise

    naturesSet.add(natureName)

    if (!coutParNature[natureName]) coutParNature[natureName] = 0
    coutParNature[natureName] += montantDA
  })

  let topNatureName = '-'
  let topNatureMontant = 0
  Object.entries(coutParNature).forEach(([nature, montant]) => {
    if (montant > topNatureMontant) {
      topNatureMontant = montant
      topNatureName = nature
    }
  })

  return (
    <Dialog fullScreen open={open} onClose={onClose} TransitionComponent={Transition}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: '#f8f9fa'
        }}
      >
        <AppBar sx={{ position: 'relative', backgroundColor: '#0d1b2a', boxShadow: 3, flexShrink: 0 }}>
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ display: 'flex', alignItems: 'center', gap: 2 }} variant='h6' color='white'>
              <Icon icon='tabler:list-details' color='white' />
              Gestion des Frais Annexes du Voyage
            </Typography>
            <IconButton edge='end' color='inherit' onClick={onClose} aria-label='close'>
              <Icon icon='tabler:x' color='white' />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box sx={{ flexGrow: 1, p: 5, overflowY: 'auto' }}>
          <DepensesVoyageModalKpis
            totalEntries={depensesActives.length}
            totalNatures={naturesSet.size}
            topNatureName={topNatureName}
            topNatureMontant={topNatureMontant}
            totalsParDevise={totalsParDevise}
            totalDepensesDA={totalDepensesDA}
          />

          <DepensesVoyageModalTable depenses={depensesList} refreshData={onRefresh} />
        </Box>
      </Box>
    </Dialog>
  )
}

export default DepensesVoyageModal
