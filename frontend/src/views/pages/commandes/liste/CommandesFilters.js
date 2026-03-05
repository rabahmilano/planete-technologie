import { useState, useEffect } from 'react'
import { Card, CardContent, Grid, MenuItem, TextField, Button, Box } from '@mui/material'
import Icon from 'src/@core/components/icon'
import axios from 'axios'
import dayjs from 'dayjs'

const CommandesFilters = ({ periodeFiltre, setPeriodeFiltre, produitFiltre, setProduitFiltre, onReset }) => {
  const [produits, setProduits] = useState([])
  const [optionsAnnee, setOptionsAnnee] = useState([])

  // Générer les années depuis 2023
  useEffect(() => {
    const anneePremierAchat = 2023
    const anneeActuelle = dayjs().year()
    const options = Array.from({ length: anneeActuelle - anneePremierAchat + 1 }, (_, i) => (anneeActuelle - i).toString())
    setOptionsAnnee(options)
  }, [])

  // Charger la liste des produits pour le filtre
  useEffect(() => {
    const fetchProduits = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/allProduits`) // Ajuste l'URL si besoin selon ton produitRouter.js
        setProduits(Array.isArray(response.data) ? response.data : response.data.data || [])
      } catch (error) {
        console.error("Erreur chargement produits", error)
      }
    }
    fetchProduits()
  }, [])

  return (
    <Card sx={{ mb: 6, boxShadow: 3 }}>
      <CardContent>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              select
              label='Période'
              value={periodeFiltre}
              onChange={e => setPeriodeFiltre(e.target.value)}
            >
              <MenuItem value='all'>Toutes les périodes</MenuItem>
              <MenuItem value='1m'>1 Dernier Mois</MenuItem>
              <MenuItem value='3m'>3 Derniers Mois</MenuItem>
              <MenuItem value='6m'>6 Derniers Mois</MenuItem>
              {optionsAnnee.map(annee => (
                <MenuItem key={annee} value={annee}>Année {annee}</MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label='Filtrer par Produit'
              value={produitFiltre}
              onChange={e => setProduitFiltre(e.target.value)}
            >
              <MenuItem value='all'>Tous les produits</MenuItem>
              {produits.map(p => (
                <MenuItem key={p.id_prd} value={p.id_prd}>
                  {p.designation_prd}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={2}>
            <Box sx={{ display: 'flex', height: '100%', alignItems: 'center' }}>
              <Button 
                fullWidth 
                variant='outlined' 
                color='secondary' 
                onClick={onReset}
                startIcon={<Icon icon='tabler:reload' />}
              >
                Réinitialiser
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default CommandesFilters