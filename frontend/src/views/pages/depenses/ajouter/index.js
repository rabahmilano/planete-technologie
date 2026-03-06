import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, Drawer, Grid } from '@mui/material'
import toast from 'react-hot-toast'
import axios from 'axios'
import dayjs from 'dayjs'
import { useDepense } from 'src/context/DepenseContext'

// Import de nos composants enfants
import DepenseForm from './DepenseForm'
import DerniersDepenses from './DerniersDepenses' // <-- Le nouveau composant
import AjouterTypeDepense from '../ajouterTypeDepense'

const AjouterDepense = () => {
  const { listNature } = useDepense()
  const [listCompte, setListCompte] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  
  // État pour déclencher le rafraîchissement du tableau historique
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    const fetchComptes = async () => {
      try {
        const reponse = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}comptes/allComptes`)
        setListCompte(reponse.data)
      } catch (error) {
        toast.error('Erreur lors de la récupération des comptes')
      }
    }
    fetchComptes()
  }, [])

  const handleSubmitDepense = async (data, resetForm, setSymboleDev) => {
    const formattedData = {
      ...data,
      montant: parseFloat(data.montant),
      dateDepense: dayjs(data.dateDepense).format('YYYY-MM-DDT12:00:00.000Z')
    }

    try {
      const url = `${process.env.NEXT_PUBLIC_BASE_URL}depenses/addDepense`
      const reponse = await axios.post(url, formattedData)

      if (reponse.status === 201) {
        toast.success('Dépense enregistrée avec succès')
        resetForm() 
        setSymboleDev('') 
        
        // On incrémente le trigger, ce qui dit à <DerniersDepenses> de recharger ses données !
        setRefreshTrigger(prev => prev + 1)
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 400) {
          toast.error('Erreur de validation: ' + error.response.data.errors.map(err => err.msg).join(', '))
        } else if (error.response.status === 403) {
          toast.error(error.response.data.message)
        } else {
          toast.error('Erreur du serveur: ' + error.response.data.message)
        }
      } else if (error.request) {
        toast.error('Pas de réponse du serveur')
      } else {
        toast.error('Erreur: ' + error.message)
      }
    }
  }

  return (
    <Grid container spacing={6}>
      {/* PARTIE HAUTE : LE FORMULAIRE */}
      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3 }}>
          <CardHeader 
            title='Déclaration d"une nouvelle dépense' 
            titleTypographyProps={{ variant: 'h5', color: 'primary' }}
            sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.12)', mb: 4 }}
          />
          <CardContent>
            <DepenseForm 
              listNature={listNature}
              listCompte={listCompte}
              onSubmit={handleSubmitDepense}
              onOpenDrawer={() => setDrawerOpen(true)}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* PARTIE BASSE : L'HISTORIQUE */}
      <Grid item xs={12}>
        <DerniersDepenses refreshTrigger={refreshTrigger} />
      </Grid>

      <Drawer
        anchor='right'
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{
          disablePortal: true,
          disableAutoFocus: true,
          disableScrollLock: true,
          keepMounted: true
        }}
      >
        <AjouterTypeDepense onClose={() => setDrawerOpen(false)} />
      </Drawer>
    </Grid>
  )
}

export default AjouterDepense