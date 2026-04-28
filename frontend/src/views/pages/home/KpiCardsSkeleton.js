import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'

const KpiCardsSkeleton = () => {
  return (
    <Grid container spacing={6} sx={{ height: '100%', m: 0, width: '100%' }}>
      {[1, 2, 3, 4].map((item, index) => (
        <Grid
          item
          xs={12}
          sm={6}
          md={3}
          key={index}
          sx={{ pt: '0 !important', pb: '0 !important', pl: index === 0 ? '0 !important' : undefined }}
        >
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent
              sx={{
                display: 'flex',
                flexDirection: 'column',
                p: theme => `${theme.spacing(4)} !important`,
                height: '100%'
              }}
            >
              <Skeleton variant='rounded' width={44} height={44} sx={{ mb: 3 }} animation='wave' />

              <Skeleton variant='text' width='60%' height={32} sx={{ mb: 0.5 }} animation='wave' />
              <Skeleton variant='text' width='80%' height={20} sx={{ mb: 1.5 }} animation='wave' />

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  pt: 2,
                  mt: 'auto',
                  borderTop: theme => `1px dashed ${theme.palette.divider}`
                }}
              >
                <Skeleton variant='text' width='50%' height={20} animation='wave' />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default KpiCardsSkeleton
