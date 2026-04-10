import React from 'react'
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Box
} from '@mui/material'
import Icon from 'src/@core/components/icon'
import { formatMontant } from 'src/@core/utils/format'

const PanierTable = ({ fields, remove, articles, deviseTrans, deviseCompte, tauxTrans, tauxCompte, listCategorie }) => {
  return (
    <Box>
      <Typography variant='h6' sx={{ mb: 4, fontWeight: 700 }}>
        Contenu de la facture
      </Typography>
      <TableContainer sx={{ backgroundColor: '#ffffff', borderRadius: 1, boxShadow: 1 }}>
        <Table size='small'>
          <TableHead sx={{ backgroundColor: '#0d1b2a' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 3 }}>
                Produit
              </TableCell>
              <TableCell align='center' sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 3 }}>
                Qté
              </TableCell>
              <TableCell align='right' sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 3 }}>
                PU
              </TableCell>
              <TableCell align='right' sx={{ color: 'white', fontSize: '0.72rem', textTransform: 'uppercase', py: 3 }}>
                Total
              </TableCell>
              <TableCell align='center' sx={{ color: 'white', py: 3 }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fields.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Box sx={{ p: 8, textAlign: 'center' }}>
                    <Icon icon='tabler:shopping-cart-x' fontSize='3rem' color='#ccc' />
                    <Typography variant='body1' color='textSecondary' sx={{ mt: 2 }}>
                      Le panier est vide.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              fields.map((item, index) => {
                const article = articles[index]
                const catName = listCategorie.find(c => c.id_cat === parseInt(article.catId))?.designation_cat || ''

                const qte = parseFloat(article.qte) || 0
                const puTrans = parseFloat(article.puDevise) || 0

                const puDzd = puTrans * tauxTrans
                const puCompte = puDzd / tauxCompte

                const totalTrans = qte * puTrans
                const totalDzd = totalTrans * tauxTrans
                const totalCompte = totalDzd / tauxCompte

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Typography variant='body2' fontWeight={600}>
                        {article.desPrd}
                      </Typography>
                      <Typography variant='caption' color='textSecondary'>
                        {catName}
                      </Typography>
                    </TableCell>
                    <TableCell align='center'>
                      <Typography variant='body2' fontWeight={600}>
                        {qte}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Box display='flex' flexDirection='column' gap={0.5}>
                        <Typography variant='body2' fontWeight='bold' color='primary.main'>
                          {formatMontant(puTrans)} {deviseTrans}
                        </Typography>
                        {deviseTrans !== deviseCompte && (
                          <Typography variant='caption' color='textSecondary' sx={{ fontStyle: 'italic' }}>
                            {formatMontant(puCompte)} {deviseCompte}
                          </Typography>
                        )}
                        <Typography variant='caption' color='success.main' fontWeight='bold'>
                          {formatMontant(puDzd)} DZD
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align='right'>
                      <Box display='flex' flexDirection='column' gap={0.5}>
                        <Typography variant='body2' fontWeight='bold' color='primary.main'>
                          {formatMontant(totalTrans)} {deviseTrans}
                        </Typography>
                        {deviseTrans !== deviseCompte && (
                          <Typography variant='caption' color='textSecondary' sx={{ fontStyle: 'italic' }}>
                            {formatMontant(totalCompte)} {deviseCompte}
                          </Typography>
                        )}
                        <Typography variant='caption' color='success.main' fontWeight='bold'>
                          {formatMontant(totalDzd)} DZD
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align='center'>
                      <IconButton color='error' onClick={() => remove(index)} size='small'>
                        <Icon icon='tabler:trash' fontSize='1.2rem' />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default PanierTable
