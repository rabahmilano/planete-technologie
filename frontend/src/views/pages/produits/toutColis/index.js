import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Switch,
  FormControlLabel,
  Typography
} from '@mui/material'

import CustomTextField from 'src/@core/components/mui/text-field'

import { useForm, Controller } from 'react-hook-form'
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)

dayjs.locale('fr')

import axios from 'axios'
import toast from 'react-hot-toast'

const defaultValues = {
  dateStock: dayjs().utc(true).startOf('day')
}

const ToutColis = () => {
  // const [colis, setColis] = useState([])
  // const [selectedColis, setSelectedColis] = useState(null)
  // const [droitsTimbre, setDroitsTimbre] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
    reset
  } = useForm({ defaultValues })

  // useEffect(() => {
  //   const fetchColis = async () => {
  //     const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/colisEnRoute`)
  //     setColis(response.data)
  //   }

  //   fetchColis()
  // }, [])

  // const handleRowClick = item => {
  //   setSelectedColis(item)
  //   setModalOpen(true)
  // }

  // const handleModalClose = () => {
  //   setModalOpen(false)
  //   setSelectedColis(null)
  // }

  // const handleSubmitUpdate = async data => {
  //   const colisId = selectedColis.id_colis
  //   const updateData = {
  //     prd_id: selectedColis.prd_id,
  //     date_stock: dayjs(data.dateStock).toISOString(),
  //     droits_timbre: droitsTimbre
  //   }

  //   try {
  //     // console.log(updateData)

  //     const reponse = await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}produits/colis/${colisId}`, updateData)
  //     if (reponse.status === 200) {
  //       toast.success('Mise à jour réussit')
  //       reset()
  //       setDroitsTimbre(false)
  //       setColis(prevColis => prevColis.filter(a => a.id_colis !== selectedColis.id_colis))
  //       handleModalClose()
  //     }
  //   } catch (error) {
  //     if (error.response) {
  //       if (error.response.status === 400) {
  //         toast.error('Erreur de validation: ' + error.response.data.errors.map(err => err.msg).join(', '))
  //       } else if (error.response.status === 403) {
  //         toast.error(error.response.data.message)
  //       } else {
  //         toast.error('Erreur du serveur: ' + error.response.data.message)
  //       }
  //     } else if (error.request) {
  //       // La requête a été faite mais aucune réponse n'a été reçue
  //       toast.error('Pas de réponse du serveur')
  //     } else {
  //       // Une erreur s'est produite lors de la configuration de la requête
  //       toast.error('Erreur: ' + error.message)
  //     }
  //   }
  // }

  return (
    <>
      <TableContainer
        sx={{
          boxShadow: 5,
          borderRadius: 4
          // overflow: 'hidden'
        }}
        component={Paper}
      >
        <Table sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
              <TableCell sx={{ color: 'white' }}>Désignation</TableCell>
              <TableCell sx={{ color: 'white' }}>Date d'Achat</TableCell>
              <TableCell align='right' sx={{ color: 'white' }}>
                Prix d'Achat
              </TableCell>
              <TableCell align='right' sx={{ color: 'white' }}>
                Catégorie
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {colis.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant='h3'>Aucun colis n'est en route</Typography>
                </TableCell>
              </TableRow>
            ) : (
              colis.map(item => (
                <TableRow
                  key={item.id_colis}
                  onClick={() => handleRowClick(item)}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#778da9',
                      cursor: 'pointer'
                    }
                  }}
                >
                  <TableCell>{item.produit.designation_prd}</TableCell>
                  <TableCell>{new Date(item.date_achat).toLocaleDateString()}</TableCell>
                  <TableCell align='right'>
                    {item.mnt_tot_dev} {item.compte.devise.symbole_dev}
                  </TableCell>
                  <TableCell align='right'>{item.categorie.designation_cat}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}

export default ToutColis
