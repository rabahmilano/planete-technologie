import { useState, useContext, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardHeader, Button, Box, Typography } from '@mui/material'
import Icon from 'src/@core/components/icon'
import { VoyageContext } from 'src/context/VoyageContext'

import VoyagesTable from './VoyagesTable'
import ModalDemarrerVoyage from './ModalDemarrerVoyage'
import ModalReouvrirVoyage from './ModalReouvrirVoyage'
import ConfirmDialog from 'src/components/dialogs/ConfirmDialog'

const VoyagesList = () => {
  const { voyages, loading, changerStatutVoyage, fetchVoyages, deleteVoyage } = useContext(VoyageContext)

  const [activeVoyage, setActiveVoyage] = useState(null)
  const [openDemarrerModal, setOpenDemarrerModal] = useState(false)
  const [openReouvrirModal, setOpenReouvrirModal] = useState(false)
  const [openDeleteModal, setOpenDeleteModal] = useState(false)

  useEffect(() => {
    fetchVoyages()
  }, [fetchVoyages])

  const handleTableAction = async (actionType, voyage) => {
    setActiveVoyage(voyage)

    if (actionType === 'DEMARRER') {
      setOpenDemarrerModal(true)
    } else if (actionType === 'REOUVRIR') {
      setOpenReouvrirModal(true)
    } else if (actionType === 'SUPPRIMER') {
      setOpenDeleteModal(true)
    } else if (actionType === 'CLOTURER') {
      await changerStatutVoyage(voyage.id_voyage, 'CLOTURE')
      setActiveVoyage(null)
    }
  }

  const validerDemarrage = async taux => {
    await changerStatutVoyage(activeVoyage.id_voyage, 'EN_COURS', taux)
    setOpenDemarrerModal(false)
    setActiveVoyage(null)
  }

  const validerReouverture = async () => {
    await changerStatutVoyage(activeVoyage.id_voyage, 'EN_COURS')
    setOpenReouvrirModal(false)
    setActiveVoyage(null)
  }

  const validerSuppression = async () => {
    await deleteVoyage(activeVoyage.id_voyage)
    setOpenDeleteModal(false)
    setActiveVoyage(null)
  }

  return (
    <>
      <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 5 }}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Icon icon='tabler:plane' fontSize='1.75rem' color='#primary.main' />
                <Typography variant='h5'>Dossiers d'importation (Voyages)</Typography>
              </Box>
            }
          />
          <Button
            variant='contained'
            color='primary'
            component={Link}
            href='/voyages/ajouter'
            startIcon={<Icon icon='tabler:plus' />}
          >
            Nouveau Voyage
          </Button>
        </Box>

        <VoyagesTable voyages={voyages} loading={loading} onAction={handleTableAction} />
      </Card>

      {openDemarrerModal && (
        <ModalDemarrerVoyage
          open={openDemarrerModal}
          onClose={() => setOpenDemarrerModal(false)}
          onValidate={validerDemarrage}
          deviseDest={activeVoyage?.dev_dest}
        />
      )}

      {openReouvrirModal && (
        <ModalReouvrirVoyage
          open={openReouvrirModal}
          onClose={() => setOpenReouvrirModal(false)}
          onValidate={validerReouverture}
        />
      )}

      <ConfirmDialog
        open={openDeleteModal}
        handleClose={() => setOpenDeleteModal(false)}
        handleConfirm={validerSuppression}
        actionType='delete'
        title='Supprimer le voyage'
        content={`Êtes-vous sûr de vouloir supprimer le dossier "${activeVoyage?.des_voyage}" ? Cette action est irréversible.`}
      />
    </>
  )
}

export default VoyagesList
