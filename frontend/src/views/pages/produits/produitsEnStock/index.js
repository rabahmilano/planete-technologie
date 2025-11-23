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
  // dateStock: dayjs('2025-02-04').utc(true).startOf('day')
}

const ProduitsEnStock = () => {
  const [produits, setProduits] = useState([])
  // const [selectedColis, setSelectedColis] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
    reset
  } = useForm({ defaultValues })

  useEffect(() => {
    const fetchProduits = async () => {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/allMarchandiseDisponible`)

      setProduits(response.data)
    }

    fetchProduits()
  }, [])

  const handleRowClick = item => {
    // setSelectedColis(item)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    // setSelectedColis(null)
  }

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
        <Table sx={{ minWidth: 700, maxWidth: 900 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
              <TableCell sx={{ color: 'white' }} width={10}>
                N°
              </TableCell>
              <TableCell sx={{ color: 'white' }}>Désignation</TableCell>
              <TableCell sx={{ color: 'white' }} align='right'>
                Quantité Disponible
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {produits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant='h3'>Aucun produit n'est en stock</Typography>
                </TableCell>
              </TableRow>
            ) : (
              produits.map((prd, i) => (
                <TableRow
                  key={prd.id_prd}
                  // onClick={() => handleRowClick(prd)}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#778da9',
                      cursor: 'pointer'
                    }
                  }}
                >
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{prd.designation_prd}</TableCell>
                  <TableCell align='right'>{prd.qte_dispo}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={modalOpen} onClose={handleModalClose}>
        <DialogTitle variant='h3'>Liste des colis</DialogTitle>
        <DialogContent>
          <Grid container spacing={5}>
            <Grid item xs={12}>
              <CustomTextField fullWidth value={'value 1'} disabled />
            </Grid>

            <Grid item>
              <Controller
                name='dateStock' // Changé de 'dateVente' à 'dateStock'
                control={control}
                rules={{ required: 'Ce champ est obligatoire' }}
                render={({ field }) => (
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='fr'>
                    <DatePicker
                      {...field}
                      maxDate={dayjs()}
                      label='Date de Stock'
                      slotProps={{
                        textField: {
                          variant: 'outlined',
                          error: !!errors.dateStock,
                          helperText: errors.dateStock?.message
                        }
                      }}
                      onChange={date => field.onChange(date)}
                    />
                  </LocalizationProvider>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel control={<Switch checked={false} />} label='Droits de Timbre Payés' />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button variant='contained' color='success'>
            Mettre à Jour
          </Button>
          <Button onClick={handleModalClose} color='warning'>
            Annuler
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ProduitsEnStock
