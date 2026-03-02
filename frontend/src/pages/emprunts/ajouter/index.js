import Grid from '@mui/material/Grid'
import AjouterEmprunt from 'src/views/pages/emprunts/ajouter'

const AjouterEmpruntPage = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <AjouterEmprunt />
      </Grid>
    </Grid>
  )
}

export default AjouterEmpruntPage