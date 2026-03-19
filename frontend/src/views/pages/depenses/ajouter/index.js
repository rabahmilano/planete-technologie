import React, { useState } from 'react'
import { Card, CardHeader, CardContent, Drawer, Grid } from '@mui/material'
import dayjs from 'dayjs'

import { useDepense } from 'src/context/DepenseContext'
import { useCompte } from 'src/context/CompteContext'

import DepenseForm from './DepenseForm'
import DerniersDepenses from './DerniersDepenses'
import AjouterTypeDepense from '../ajouterTypeDepense'

const AjouterDepense = () => {
  const { listNature, ajouterDepense } = useDepense()
  const { comptes } = useCompte()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleSubmitDepense = async (data, resetForm, setSymboleDev) => {
    const formattedData = {
      ...data,
      montant: parseFloat(data.montant),
      dateDepense: dayjs(data.dateDepense).format('YYYY-MM-DDT12:00:00.000Z')
    }

    const isSuccess = await ajouterDepense(formattedData)

    if (isSuccess) {
      resetForm()
      setSymboleDev('')
      setRefreshTrigger(prev => prev + 1)
    }
  }

  return (
    <Grid container spacing={6}>
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
              listCompte={comptes || []}
              onSubmit={handleSubmitDepense}
              onOpenDrawer={() => setDrawerOpen(true)}
            />
          </CardContent>
        </Card>
      </Grid>

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
