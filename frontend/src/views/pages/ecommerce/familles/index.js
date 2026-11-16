import { useEffect, useState } from 'react'
import {
  Grid,
  Card,
  CardHeader,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Button,
  LinearProgress
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'
import { useFamille } from 'src/context/FamilleContext'
import FamilleDialog from './FamilleDialog'

const FamilleNoeud = ({ famille, niveau, onModifier, onSupprimer }) => (
  <>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1.5,
        pr: 2,
        pl: 4 + niveau * 4,
        borderBottom: theme => `1px solid ${theme.palette.divider}`
      }}
    >
      <Icon icon={niveau === 0 ? 'tabler:category' : 'tabler:category-2'} fontSize='1.25rem' color='primary.main' />
      <Typography sx={{ flex: 1, fontWeight: niveau === 0 ? 600 : 400 }}>{famille.nom_famille}</Typography>
      <Chip size='small' variant='outlined' label={`${famille._count?.produits ?? 0} produit(s)`} />
      <Tooltip title='Modifier'>
        <IconButton size='small' onClick={() => onModifier(famille)}>
          <Icon icon='tabler:edit' fontSize='1.1rem' />
        </IconButton>
      </Tooltip>
      <Tooltip title='Supprimer'>
        <IconButton size='small' color='error' onClick={() => onSupprimer(famille)}>
          <Icon icon='tabler:trash' fontSize='1.1rem' />
        </IconButton>
      </Tooltip>
    </Box>
    {famille.sous_familles.map(sousFamille => (
      <FamilleNoeud
        key={sousFamille.id_famille}
        famille={sousFamille}
        niveau={niveau + 1}
        onModifier={onModifier}
        onSupprimer={onSupprimer}
      />
    ))}
  </>
)

const FamillesView = () => {
  const { familles, loading, fetchFamilles, supprimerFamille } = useFamille()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [familleEdition, setFamilleEdition] = useState(null)
  const [familleSuppression, setFamilleSuppression] = useState(null)

  useEffect(() => {
    fetchFamilles()
  }, [fetchFamilles])

  const ouvrirAjout = () => {
    setFamilleEdition(null)
    setDialogOpen(true)
  }

  const ouvrirEdition = famille => {
    setFamilleEdition(famille)
    setDialogOpen(true)
  }

  const confirmerSuppression = async () => {
    const success = await supprimerFamille(familleSuppression.id_famille)
    if (success) setFamilleSuppression(null)
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3 }}>
          <CardHeader
            title='Familles de produits'
            subheader='Hiérarchie des familles et sous-familles affichée dans la boutique'
            action={
              <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={ouvrirAjout}>
                Ajouter une famille
              </Button>
            }
          />
          {loading && <LinearProgress />}
          <Box sx={{ px: 4, pb: 4, pt: 2 }}>
            {familles.length === 0 && !loading ? (
              <Typography sx={{ py: 4, textAlign: 'center' }} color='textSecondary'>
                Aucune famille créée pour le moment.
              </Typography>
            ) : (
              familles.map(famille => (
                <FamilleNoeud
                  key={famille.id_famille}
                  famille={famille}
                  niveau={0}
                  onModifier={ouvrirEdition}
                  onSupprimer={setFamilleSuppression}
                />
              ))
            )}
          </Box>
        </Card>
      </Grid>

      <FamilleDialog open={dialogOpen} famille={familleEdition} onClose={() => setDialogOpen(false)} />

      <ConfirmDialog
        open={!!familleSuppression}
        handleClose={() => setFamilleSuppression(null)}
        handleConfirm={confirmerSuppression}
        actionType='delete'
        title='Supprimer cette famille ?'
        confirmText='Supprimer'
        content={
          <Typography variant='body1'>
            La famille <strong>{familleSuppression?.nom_famille}</strong> sera définitivement supprimée. Cette action
            est refusée si elle possède des sous-familles ou des produits rattachés.
          </Typography>
        }
      />
    </Grid>
  )
}

export default FamillesView
