import { useEffect, useState } from 'react'
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
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Button,
  LinearProgress,
  Box
} from '@mui/material'
import dayjs from 'dayjs'
import Icon from 'src/@core/components/icon'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import { formatMontant } from 'src/@core/utils/format'
import { useCodePromo } from 'src/context/CodePromoContext'
import CodePromoDialog from './CodePromoDialog'

const CodePromoRow = ({ codePromo, onModifier, onSupprimer }) => {
  const estExpire = dayjs(codePromo.date_expiration).endOf('day').isBefore(dayjs())

  return (
    <TableRow hover>
      <TableCell sx={{ fontWeight: 700 }}>{codePromo.code}</TableCell>
      <TableCell>
        {codePromo.type_reduction === 'POURCENTAGE'
          ? `-${codePromo.valeur_reduction}%`
          : `-${formatMontant(codePromo.valeur_reduction)} DA`}
      </TableCell>
      <TableCell align='right'>{codePromo.montant_min_promo > 0 ? `${formatMontant(codePromo.montant_min_promo)} DA` : '—'}</TableCell>
      <TableCell>
        <Box>
          <Typography variant='body2'>{dayjs(codePromo.date_expiration).format('DD/MM/YYYY')}</Typography>
          {estExpire && (
            <Chip size='small' color='error' label='Expiré' sx={{ ml: 1 }} />
          )}
        </Box>
      </TableCell>
      <TableCell align='center'>
        <Chip
          size='small'
          color={codePromo.est_actif_promo ? 'success' : 'default'}
          label={codePromo.est_actif_promo ? 'Actif' : 'Désactivé'}
        />
      </TableCell>
      <TableCell align='center'>
        <Typography
          variant='body2'
          sx={{ fontWeight: 600, color: codePromo.utilisation_actuelle >= codePromo.utilisation_max ? 'error.main' : 'inherit' }}
        >
          {codePromo.utilisation_actuelle} / {codePromo.utilisation_max}
        </Typography>
      </TableCell>
      <TableCell align='center'>{codePromo._count?.commandes ?? 0}</TableCell>
      <TableCell align='center'>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
          <Tooltip title='Modifier'>
            <IconButton size='small' onClick={() => onModifier(codePromo)}>
              <Icon icon='tabler:edit' fontSize='1.1rem' />
            </IconButton>
          </Tooltip>
          <Tooltip title='Supprimer'>
            <IconButton size='small' color='error' onClick={() => onSupprimer(codePromo)}>
              <Icon icon='tabler:trash' fontSize='1.1rem' />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  )
}

const CodesPromoView = () => {
  const { codesPromo, loading, fetchCodesPromo, supprimerCodePromo } = useCodePromo()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [codeEdition, setCodeEdition] = useState(null)
  const [codeSuppression, setCodeSuppression] = useState(null)

  useEffect(() => {
    fetchCodesPromo()
  }, [fetchCodesPromo])

  const confirmerSuppression = async () => {
    const success = await supprimerCodePromo(codeSuppression.id_code)
    if (success) setCodeSuppression(null)
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3 }}>
          <CardHeader
            title='Codes promo'
            subheader='Réductions appliquées dans la boutique (pourcentage ou montant fixe)'
            action={
              <Button
                variant='contained'
                startIcon={<Icon icon='tabler:plus' />}
                onClick={() => {
                  setCodeEdition(null)
                  setDialogOpen(true)
                }}
              >
                Nouveau code promo
              </Button>
            }
          />
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {loading && <LinearProgress />}
            <TableContainer>
              <Table sx={{ minWidth: 750 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
                    <TableCell sx={{ color: 'white' }}>Code</TableCell>
                    <TableCell sx={{ color: 'white' }}>Réduction</TableCell>
                    <TableCell sx={{ color: 'white' }} align='right'>
                      Montant min
                    </TableCell>
                    <TableCell sx={{ color: 'white' }}>Expiration</TableCell>
                    <TableCell sx={{ color: 'white' }} align='center'>
                      État
                    </TableCell>
                    <TableCell sx={{ color: 'white' }} align='center'>
                      Utilisations
                    </TableCell>
                    <TableCell sx={{ color: 'white' }} align='center'>
                      Commandes
                    </TableCell>
                    <TableCell sx={{ color: 'white' }} align='center'>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {codesPromo.length === 0 && !loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align='center'>
                        <Typography sx={{ p: 4 }}>Aucun code promo créé.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    codesPromo.map(codePromo => (
                      <CodePromoRow
                        key={codePromo.id_code}
                        codePromo={codePromo}
                        onModifier={code => {
                          setCodeEdition(code)
                          setDialogOpen(true)
                        }}
                        onSupprimer={setCodeSuppression}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      <CodePromoDialog open={dialogOpen} codePromo={codeEdition} onClose={() => setDialogOpen(false)} />

      <ConfirmDialog
        open={!!codeSuppression}
        handleClose={() => setCodeSuppression(null)}
        handleConfirm={confirmerSuppression}
        actionType='delete'
        title='Supprimer ce code promo ?'
        confirmText='Supprimer'
        content={
          <Typography variant='body1'>
            Le code <strong>{codeSuppression?.code}</strong> sera définitivement supprimé. Cette action est refusée si
            des commandes utilisent déjà ce code.
          </Typography>
        }
      />
    </Grid>
  )
}

export default CodesPromoView
