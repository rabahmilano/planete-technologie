import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import { useCompte } from 'src/context/CompteContext'

const ListeComptes = () => {
  const { comptes } = useCompte()

  return (
    <Card>
      <CardHeader title='Liste des comptes' />
      <CardContent>
        <Table sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              <TableCell>Compte</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align='right'>Solde</TableCell>
              <TableCell align='center'>Devise</TableCell>
              <TableCell align='right'>Taux de change actuel</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {comptes.map(compte => (
              <TableRow key={compte.id_cpt}>
                <TableCell>{compte.designation_cpt}</TableCell>
                <TableCell>{compte.type_cpt}</TableCell>
                <TableCell align='right'>{Number(compte.solde_actuel).toFixed(2)}</TableCell>
                <TableCell align='center'>{compte.dev_code}</TableCell>
                <TableCell align='right'>{Number(compte.taux_change_actuel).toFixed(2)} DA</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default ListeComptes
