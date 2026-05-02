import { forwardRef, useState, useEffect } from 'react'
import { Dialog, AppBar, Toolbar, IconButton, Typography, Slide, Box, Switch, FormControlLabel } from '@mui/material'
import Icon from 'src/@core/components/icon'
import ArticlesVoyageModalKpis from './ArticlesVoyageModalKpis'
import ArticlesVoyageModalTable from './ArticlesVoyageModalTable'

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction='up' ref={ref} {...props} />
})

const ArticlesVoyageModal = ({ open, onClose, transactions, coeffApproche, coeffEstime = 1.3 }) => {
  const [showTTC, setShowTTC] = useState(false)

  useEffect(() => {
    if (open) {
      setShowTTC(coeffApproche !== null && coeffApproche !== undefined)
    }
  }, [open, coeffApproche])

  const factures = transactions?.filter(t => t.colis_voyage?.length > 0) || []

  let totalProduits = 0
  let totalPieces = 0
  let totalCommBanqueDA = 0
  let totalCommPaieDA = 0
  let totalAchatsDA = 0
  const totalsParDevise = {}

  factures.forEach(t => {
    const taux = parseFloat(t.taux_trans || 1)
    const commBanque = parseFloat(t.mnt_comm_banque || 0)
    const commPaie = parseFloat(t.mnt_comm_paie || 0)

    totalProduits += t.colis_voyage.length

    let totalFactureDevise = 0
    t.colis_voyage.forEach(article => {
      totalPieces += article.colis.qte_achat || 0
      totalFactureDevise += parseFloat(article.mnt_tot_dest || 0)
    })

    totalCommBanqueDA += commBanque * taux
    totalCommPaieDA += commPaie * taux
    totalAchatsDA += totalFactureDevise * taux

    if (!totalsParDevise[t.dev_trans]) totalsParDevise[t.dev_trans] = 0
    totalsParDevise[t.dev_trans] += totalFactureDevise
  })

  return (
    <Dialog fullScreen open={open} onClose={onClose} TransitionComponent={Transition}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <AppBar sx={{ position: 'relative', backgroundColor: '#0d1b2a', boxShadow: 3, flexShrink: 0 }}>
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ display: 'flex', alignItems: 'center', gap: 2 }} variant='h6' color='white'>
              <Icon icon='tabler:packages' color='white' />
              Rapport Détaillé des Achats
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <FormControlLabel
                control={<Switch checked={showTTC} onChange={e => setShowTTC(e.target.checked)} color='success' />}
                label={
                  <Typography color='white' variant='body2' fontWeight={600}>
                    Afficher PU TTC
                  </Typography>
                }
              />
              <IconButton edge='end' color='inherit' onClick={onClose} aria-label='close'>
                <Icon icon='tabler:x' color='white' />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        <Box sx={{ flexGrow: 1, p: 5, backgroundColor: '#f8f9fa', overflowY: 'auto' }}>
          <ArticlesVoyageModalKpis
            totalProduits={totalProduits}
            totalPieces={totalPieces}
            totalAchatsDA={totalAchatsDA}
            totalsParDevise={totalsParDevise}
            totalCommBanqueDA={totalCommBanqueDA}
            totalCommPaieDA={totalCommPaieDA}
            transactions={transactions}
          />
          <ArticlesVoyageModalTable
            factures={factures}
            showTTC={showTTC}
            coeffApproche={coeffApproche}
            coeffEstime={coeffEstime}
          />
        </Box>
      </Box>
    </Dialog>
  )
}

export default ArticlesVoyageModal
