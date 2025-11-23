import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { useDevises } from 'src/context/DeviseContext'

const ListeDevises = () => {
  const { devises } = useDevises()

  return (
    <Card>
      <CardHeader title='Liste des devises' />
      <CardContent>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code Devise</TableCell>
              <TableCell>Nom Devise</TableCell>
              <TableCell align='center'>Symbole</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {devises.map(devise => (
              <TableRow key={devise.code_dev}>
                <TableCell>{devise.code_dev}</TableCell>
                <TableCell>{devise.nom_dev}</TableCell>
                <TableCell align='center'>{devise.symbole_dev}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default ListeDevises
