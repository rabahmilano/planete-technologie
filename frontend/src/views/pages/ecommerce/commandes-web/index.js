import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import {
  Box,
  Card,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import { useCommandeWeb } from 'src/context/CommandeWebContext'
import BanniereSynchroLivraison from 'src/components/BanniereSynchroLivraison'

export const STATUTS_COMMANDE = ['NOUVELLE', 'CONFIRMEE', 'EXPEDIEE', 'LIVREE', 'ANNULEE']

const couleurStatut = statut => {
  switch (statut) {
    case 'NOUVELLE':
      return 'info'
    case 'CONFIRMEE':
      return 'primary'
    case 'EXPEDIEE':
      return 'warning'
    case 'LIVREE':
      return 'success'
    case 'ANNULEE':
      return 'error'
    default:
      return 'default'
  }
}

const formaterDate = valeur => {
  if (!valeur) return '—'
  
return new Date(valeur).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const CommandesWebView = () => {
  const router = useRouter()
  const { commandes, total, loading, fetchCommandes } = useCommandeWeb()
  const [statut, setStatut] = useState('')
  const [recherche, setRecherche] = useState('')
  const [page, setPage] = useState(0)
  const [lignesParPage, setLignesParPage] = useState(25)

  useEffect(() => {
    fetchCommandes({ page: page + 1, limit: lignesParPage, statut: statut || undefined, search: recherche || undefined })
  }, [fetchCommandes, page, lignesParPage, statut, recherche])

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <BanniereSynchroLivraison />
      </Grid>
      <Grid item xs={12}>
        <Typography variant='h5'>Commandes web</Typography>
      </Grid>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Statut</InputLabel>
            <Select
              label='Statut'
              value={statut}
              onChange={e => {
                setStatut(e.target.value)
                setPage(0)
              }}
            >
              <MenuItem value=''>Tous les statuts</MenuItem>
              {STATUTS_COMMANDE.map(s => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label='Rechercher (client, téléphone)'
            value={recherche}
            onChange={e => {
              setRecherche(e.target.value)
              setPage(0)
            }}
            sx={{ minWidth: 280 }}
          />
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3, position: 'relative' }}>
          {loading && <LinearProgress sx={{ position: 'absolute', top: 0, width: '100%', zIndex: 1 }} />}
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
                  <TableCell sx={{ color: 'white' }}>N°</TableCell>
                  <TableCell sx={{ color: 'white' }}>Client</TableCell>
                  <TableCell sx={{ color: 'white' }}>Téléphone</TableCell>
                  <TableCell sx={{ color: 'white' }}>Wilaya</TableCell>
                  <TableCell sx={{ color: 'white' }}>Date</TableCell>
                  <TableCell sx={{ color: 'white' }} align='right'>Total</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Statut</TableCell>
                  <TableCell sx={{ color: 'white' }} align='center'>Commande interne</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {commandes.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align='center'>
                      <Typography sx={{ p: 4 }}>Aucune commande web.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  commandes.map(commande => (
                    <TableRow
                      key={commande.id_cmd_web}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/ecommerce/commandes-web/${commande.id_cmd_web}`)}
                    >
                      <TableCell>#{commande.id_cmd_web}</TableCell>
                      <TableCell>{commande.nom_client}</TableCell>
                      <TableCell>{commande.telephone}</TableCell>
                      <TableCell>{commande.wilaya}</TableCell>
                      <TableCell>{formaterDate(commande.date_creation)}</TableCell>
                      <TableCell align='right'>
                        {Number(commande.montant_total_final).toLocaleString('fr-FR')} DZD
                      </TableCell>
                      <TableCell align='center'>
                        <Chip label={commande.statut_commande} color={couleurStatut(commande.statut_commande)} size='small' />
                      </TableCell>
                      <TableCell align='center'>
                        {commande.commande_interne ? (
                          `#${commande.commande_interne.id_cde}`
                        ) : commande.statut_commande === 'LIVREE' ? (
                          <Chip label='À convertir' color='warning' size='small' />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component='div'
            count={total}
            page={page}
            rowsPerPage={lignesParPage}
            rowsPerPageOptions={[10, 25, 50]}
            onPageChange={(event, nouvellePage) => setPage(nouvellePage)}
            onRowsPerPageChange={event => {
              setLignesParPage(parseInt(event.target.value, 10))
              setPage(0)
            }}
            labelRowsPerPage='Lignes par page'
          />
        </Card>
      </Grid>
    </Grid>
  )
}

export default CommandesWebView
