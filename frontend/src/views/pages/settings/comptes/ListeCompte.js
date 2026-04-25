import { useState } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableContainer from '@mui/material/TableContainer'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

import Icon from 'src/@core/components/icon'
import { useCompte } from 'src/context/CompteContext'
import { formatMontant } from 'src/@core/utils/format'
import HistoriqueCrediterDialog from './HistoriqueCrediterDialog'

const ListeComptes = () => {
  const { tousLesComptes } = useCompte()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [compteSelectionne, setCompteSelectionne] = useState(null)

  const handleOpenHistorique = compte => {
    setCompteSelectionne(compte)
    setDialogOpen(true)
  }

  const handleCloseHistorique = () => {
    setDialogOpen(false)
    setCompteSelectionne(null)
  }

  const getChipColor = type => {
    if (!type) return 'default'
    const lowerType = type.toLowerCase()
    if (lowerType === 'commun') return 'success'
    if (lowerType === 'personnel') return 'info'
    if (lowerType === 'coffre') return 'warning'
    return 'primary'
  }

  return (
    <>
      <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Icon icon='tabler:list-details' fontSize='1.75rem' color='primary' />
              <Typography variant='h6'>Liste des comptes</Typography>
            </Box>
          }
        />
        <CardContent>
          <TableContainer>
            <Table sx={{ minWidth: 900 }}>
              <TableHead sx={{ backgroundColor: '#0d1b2a' }}>
                <TableRow>
                  <TableCell
                    sx={{
                      position: 'sticky',
                      left: 0,
                      backgroundColor: '#0d1b2a',
                      color: 'white',
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      py: 2,
                      zIndex: 2,
                      borderRight: '1px solid rgba(255, 255, 255, 0.12)'
                    }}
                  >
                    Compte
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
                    Type
                  </TableCell>
                  <TableCell
                    align='right'
                    sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}
                  >
                    Solde
                  </TableCell>
                  <TableCell
                    align='right'
                    sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}
                  >
                    Commission
                  </TableCell>
                  <TableCell
                    align='center'
                    sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}
                  >
                    Devise
                  </TableCell>
                  <TableCell
                    align='right'
                    sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}
                  >
                    Taux de change actuel
                  </TableCell>
                  <TableCell
                    align='center'
                    sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}
                  >
                    Historique
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tousLesComptes?.map(compte => {
                  const soldeTotal = parseFloat(compte.solde_actuel) || 0
                  const soldeBloque = parseFloat(compte.solde_bloque) || 0
                  const soldeDispo = soldeTotal - soldeBloque

                  return (
                    <TableRow key={compte.id_cpt} hover>
                      <TableCell
                        sx={{
                          fontWeight: 500,
                          position: 'sticky',
                          left: 0,
                          background: theme => theme.palette.background.paper,
                          zIndex: 1,
                          borderRight: '1px solid rgba(0, 0, 0, 0.12)'
                        }}
                      >
                        {compte.designation_cpt}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={compte.type_cpt}
                          color={getChipColor(compte.type_cpt)}
                          size='small'
                          sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' fontWeight={600}>
                          {formatMontant(soldeTotal)} {compte.devise?.symbole_dev || ''}
                        </Typography>
                        {soldeBloque > 0 && (
                          <Typography variant='caption' color='textSecondary' display='block'>
                            Dispo: {formatMontant(soldeDispo)} {compte.devise?.symbole_dev || ''}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align='right'>{formatMontant(compte.commission_pct)} %</TableCell>
                      <TableCell align='center'>{compte.dev_code}</TableCell>
                      <TableCell align='right'>{formatMontant(compte.taux_change_actuel)} DZD</TableCell>
                      <TableCell align='center'>
                        <Tooltip title="Voir l'historique d'approvisionnement">
                          <IconButton size='small' color='primary' onClick={() => handleOpenHistorique(compte)}>
                            <Icon icon='tabler:eye' />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {(!tousLesComptes || tousLesComptes.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} align='center'>
                      Aucun compte trouvé.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <HistoriqueCrediterDialog open={dialogOpen} handleClose={handleCloseHistorique} compte={compteSelectionne} />
    </>
  )
}

export default ListeComptes
