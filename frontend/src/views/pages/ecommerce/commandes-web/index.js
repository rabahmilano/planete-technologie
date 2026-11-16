import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Box,
  LinearProgress,
  InputAdornment
} from '@mui/material'
import dayjs from 'dayjs'
import Icon from 'src/@core/components/icon'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import { formatMontant } from 'src/@core/utils/format'
import { useCommandeWeb } from 'src/context/CommandeWebContext'
import StatutDialog from './StatutDialog'

const statutsCommande = ['NOUVELLE', 'CONFIRMEE', 'EXPEDIEE', 'LIVREE', 'ANNULEE']

const couleursStatuts = {
  NOUVELLE: 'primary',
  CONFIRMEE: 'warning',
  EXPEDIEE: 'info',
  LIVREE: 'success',
  ANNULEE: 'error'
}

const CommandeWebRow = ({ commande, onChangerStatut, onAnnuler }) => {
  const router = useRouter()

  return (
    <TableRow hover>
      <TableCell sx={{ fontWeight: 700 }}>#{commande.id_cmd_web}</TableCell>
      <TableCell>{dayjs(commande.date_creation).format('DD/MM/YYYY HH:mm')}</TableCell>
      <TableCell>
        <Box>
          <Typography variant='body2' sx={{ fontWeight: 600 }}>
            {commande.nom_client}
          </Typography>
          <Typography variant='caption' color='textSecondary'>
            {commande.telephone}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Box>
          <Typography variant='body2'>
            {commande.wilaya} · {commande.commune}
          </Typography>
          <Typography variant='caption' color='textSecondary'>
            {commande.type_livraison === 'BUREAU' ? `Bureau : ${commande.bureau_livraison || '—'}` : 'À domicile'}
          </Typography>
        </Box>
      </TableCell>
      <TableCell align='center'>
        <Typography variant='body2'>{commande.lignes?.length ?? 0} ligne(s)</Typography>
        {commande.promo && (
          <Chip size='small' variant='outlined' label={commande.promo.code} sx={{ mt: 1 }} />
        )}
      </TableCell>
      <TableCell align='right'>
        {commande.montant_reduction > 0 && (
          <Typography variant='caption' color='textSecondary' sx={{ display: 'block' }}>
            -{formatMontant(commande.montant_reduction)} DA
          </Typography>
        )}
        <Typography sx={{ fontWeight: 700, color: 'success.main' }}>
          {formatMontant(commande.montant_total_final)} DA
        </Typography>
      </TableCell>
      <TableCell align='center'>
        <Chip size='small' label={commande.statut_commande} color={couleursStatuts[commande.statut_commande] || 'default'} />
        {commande.code_tracking && (
          <Typography variant='caption' color='textSecondary' sx={{ display: 'block', mt: 1 }}>
            {commande.code_tracking}
          </Typography>
        )}
      </TableCell>
      <TableCell align='center'>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
          <Tooltip title='Voir le détail'>
            <IconButton size='small' onClick={() => router.push(`/ecommerce/commandes-web/${commande.id_cmd_web}`)}>
              <Icon icon='tabler:eye' fontSize='1.1rem' />
            </IconButton>
          </Tooltip>
          {commande.statut_commande !== 'ANNULEE' && (
            <>
              <Tooltip title='Changer le statut'>
                <IconButton size='small' color='primary' onClick={() => onChangerStatut(commande)}>
                  <Icon icon='tabler:refresh-dot' fontSize='1.1rem' />
                </IconButton>
              </Tooltip>
              <Tooltip title='Annuler la commande'>
                <IconButton size='small' color='error' onClick={() => onAnnuler(commande)}>
                  <Icon icon='tabler:ban' fontSize='1.1rem' />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </TableCell>
    </TableRow>
  )
}

const CommandesWebView = () => {
  const { commandesWeb, total, loading, fetchCommandesWeb, annulerCommandeWeb } = useCommandeWeb()

  const [rechercheSaisie, setRechercheSaisie] = useState('')
  const [search, setSearch] = useState('')
  const [statut, setStatut] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)

  const [commandeStatut, setCommandeStatut] = useState(null)
  const [commandeAnnulation, setCommandeAnnulation] = useState(null)

  const isInitialMount = useRef(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(rechercheSaisie)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [rechercheSaisie])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
    }
    fetchCommandesWeb(page, limit, { statut, search })
  }, [fetchCommandesWeb, page, limit, statut, search])

  const rafraichir = () => fetchCommandesWeb(page, limit, { statut, search })

  const confirmerAnnulation = async () => {
    const success = await annulerCommandeWeb(commandeAnnulation.id_cmd_web)
    if (success) {
      setCommandeAnnulation(null)
      rafraichir()
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3 }}>
          <CardHeader
            title='Commandes web'
            subheader='Commandes reçues de la boutique (sans compte client — confirmation par appel)'
            action={
              <TextField
                size='small'
                sx={{ width: 260 }}
                placeholder='Client ou téléphone...'
                value={rechercheSaisie}
                onChange={e => setRechercheSaisie(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Icon icon='tabler:search' fontSize='1.15rem' />
                    </InputAdornment>
                  )
                }}
              />
            }
          />
          <CardContent sx={{ pb: 0 }}>
            <Grid container spacing={4} sx={{ mb: 1 }}>
              <Grid item xs={12} sm={4} md={3}>
                <TextField
                  select
                  fullWidth
                  size='small'
                  label='Statut'
                  value={statut}
                  onChange={e => {
                    setStatut(e.target.value)
                    setPage(1)
                  }}
                >
                  <MenuItem value=''>Tous les statuts</MenuItem>
                  {statutsCommande.map(statutOption => (
                    <MenuItem key={statutOption} value={statutOption}>
                      {statutOption}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {loading && <LinearProgress sx={{ mb: -1 }} />}
            <TableContainer>
              <Table sx={{ minWidth: 950 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
                    <TableCell sx={{ color: 'white' }}>N°</TableCell>
                    <TableCell sx={{ color: 'white' }}>Date</TableCell>
                    <TableCell sx={{ color: 'white' }}>Client</TableCell>
                    <TableCell sx={{ color: 'white' }}>Destination</TableCell>
                    <TableCell sx={{ color: 'white' }} align='center'>
                      Contenu
                    </TableCell>
                    <TableCell sx={{ color: 'white' }} align='right'>
                      Total
                    </TableCell>
                    <TableCell sx={{ color: 'white' }} align='center'>
                      Statut
                    </TableCell>
                    <TableCell sx={{ color: 'white' }} align='center'>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {commandesWeb.length === 0 && !loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align='center'>
                        <Typography sx={{ p: 4 }}>Aucune commande web trouvée.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    commandesWeb.map(commande => (
                      <CommandeWebRow
                        key={commande.id_cmd_web}
                        commande={commande}
                        onChangerStatut={setCommandeStatut}
                        onAnnuler={setCommandeAnnulation}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component='div'
              count={total}
              rowsPerPage={limit}
              page={page - 1}
              onPageChange={(event, nouvellePage) => setPage(nouvellePage + 1)}
              onRowsPerPageChange={event => {
                setLimit(parseInt(event.target.value, 10))
                setPage(1)
              }}
              labelRowsPerPage='Lignes par page :'
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`}
            />
          </CardContent>
        </Card>
      </Grid>

      <StatutDialog
        open={!!commandeStatut}
        commande={commandeStatut}
        onClose={() => {
          setCommandeStatut(null)
          rafraichir()
        }}
      />

      <ConfirmDialog
        open={!!commandeAnnulation}
        handleClose={() => setCommandeAnnulation(null)}
        handleConfirm={confirmerAnnulation}
        actionType='delete'
        title='Annuler cette commande web ?'
        confirmText='Annuler la commande'
        content={
          <Typography variant='body1'>
            La commande <strong>#{commandeAnnulation?.id_cmd_web}</strong> de{' '}
            <strong>{commandeAnnulation?.nom_client}</strong> sera marquée ANNULEE et les quantités réservées seront
            libérées du stock.
          </Typography>
        }
      />
    </Grid>
  )
}

export default CommandesWebView
