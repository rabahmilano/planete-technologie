import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableContainer from '@mui/material/TableContainer'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'

import { alpha } from '@mui/material/styles'

import Icon from 'src/@core/components/icon'
import { useDevises } from 'src/context/DeviseContext'

const ListeDevises = () => {
  const { devises } = useDevises()

  return (
    <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Icon icon='tabler:coins' fontSize='1.75rem' color='primary' />
            <Typography variant='h6'>Liste des devises</Typography>
          </Box>
        }
      />
      <CardContent>
        <TableContainer>
          <Table sx={{ minWidth: 500 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    position: 'sticky',
                    left: 0,
                    background: theme => theme.palette.background.paper,
                    zIndex: 2,
                    borderRight: theme => `1px solid ${theme.palette.divider}`
                  }}
                >
                  Code Devise
                </TableCell>
                <TableCell>Nom Devise</TableCell>
                <TableCell align='center'>Symbole</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {devises?.map(devise => (
                <TableRow key={devise.code_dev} hover>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      position: 'sticky',
                      left: 0,
                      background: theme => theme.palette.background.paper,
                      zIndex: 1,
                      borderRight: theme => `1px solid ${theme.palette.divider}`
                    }}
                  >
                    {devise.code_dev}
                  </TableCell>
                  <TableCell>{devise.nom_dev}</TableCell>
                  <TableCell align='center'>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Avatar
                        variant='rounded'
                        sx={{
                          width: 34,
                          height: 34,
                          bgcolor: theme => alpha(theme.palette.primary.main, 0.12),
                          color: 'primary.main',
                          fontSize: '1rem'
                        }}
                      >
                        {devise.symbole_dev}
                      </Avatar>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {(!devises || devises.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} align='center'>
                    Aucune devise trouvée.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  )
}

export default ListeDevises
