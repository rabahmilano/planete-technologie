import React, { useState } from 'react'
import { Paper, TableContainer, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { formatMontant } from 'src/@core/utils/format'

const ToutColis = () => {
  const [colis, setColis] = useState([])

  const handleRowClick = item => {}

  return (
    <TableContainer
      sx={{
        boxShadow: 5,
        borderRadius: 4
      }}
      component={Paper}
    >
      <Table sx={{ minWidth: 900 }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#0d1b2a' }}>
            <TableCell sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
              Désignation
            </TableCell>
            <TableCell sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
              Date d'Achat
            </TableCell>
            <TableCell align='right' sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
              Prix d'Achat
            </TableCell>
            <TableCell align='right' sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 2 }}>
              Catégorie
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {colis.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align='center'>
                <Typography variant='body2' sx={{ py: 3, opacity: 0.6 }}>
                  Aucun colis n'est en route
                </Typography>
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
                <TableCell>{item.produit?.designation_prd}</TableCell>
                <TableCell>{new Date(item.date_achat).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell align='right'>
                  {formatMontant(item.mnt_tot_dev)} {item.compte?.devise?.symbole_dev}
                </TableCell>
                <TableCell align='right'>{item.categorie?.designation_cat}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default ToutColis
