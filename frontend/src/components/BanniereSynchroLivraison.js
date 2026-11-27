import { useEffect, useState } from 'react'
import { Alert, Box, Typography } from '@mui/material'
import axios from 'src/configs/axiosConfig'

// D7 : bannière « Dernière synchronisation » affichée en haut de la page
// tarifs de livraison ET de la page commandes web. La date vient de la BASE
// (endpoint derniere-synchro) : robuste au redémarrage du serveur, contrairement
// au journal de synchro qui vit en mémoire. Composant autonome (pas besoin du
// TarifLivraisonProvider) : la page commandes web n'a pas ce provider.
// Seuil d'alerte : 14 jours (proposé — à confirmer par le propriétaire) ;
// la valeur est renvoyée par l'API pour que les deux côtés restent d'accord.
const BanniereSynchroLivraison = () => {
  const [synchro, setSynchro] = useState(null)

  useEffect(() => {
    let monte = true
    axios
      .get(`${process.env.NEXT_PUBLIC_BASE_URL}tarifs-livraison/synchronisation/derniere-synchro`)
      .then(({ data }) => {
        if (monte) setSynchro(data)
      })
      .catch(() => {
        // Bannière informative : en cas d'erreur API, elle reste simplement
        // absente (le reste de la page n'est pas impacté).
      })
    return () => {
      monte = false
    }
  }, [])

  if (!synchro) return null

  const { date_derniere_synchro, jours_ecoules, seuil_alerte_jours, alerte } = synchro

  if (!date_derniere_synchro) {
    return (
      <Alert severity='warning' sx={{ mb: 4 }}>
        Les tarifs de livraison n&apos;ont jamais été synchronisés avec Yalidine.
      </Alert>
    )
  }

  const jours = jours_ecoules ?? 0
  const libelleJours = jours === 0 ? "moins d'un jour" : `${jours} jour${jours > 1 ? 's' : ''}`

  return (
    <Alert severity={alerte ? 'warning' : 'info'} sx={{ mb: 4 }}>
      <Box>
        <Typography component='span' variant='body2'>
          Dernière synchronisation des tarifs de livraison : le{' '}
          <strong>{new Date(date_derniere_synchro).toLocaleString('fr-FR')}</strong> (il y a {libelleJours})
        </Typography>
        {alerte && (
          <Typography component='span' variant='body2' sx={{ display: 'block' }}>
            Seuil d&apos;alerte de {seuil_alerte_jours} jours dépassé — pensez à lancer une synchronisation
            pour refléter les tarifs Yalidine du jour.
          </Typography>
        )}
      </Box>
    </Alert>
  )
}

export default BanniereSynchroLivraison
