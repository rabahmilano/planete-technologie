import { Grid, Card, CardContent, Box, Skeleton } from '@mui/material'

const SortiesSkeleton = () => {
  return (
    <Grid container spacing={6}>
      {/* 1. KPIs Skeletons */}
      <Grid item xs={12}>
        <Grid container spacing={6}>
          {[1, 2, 3, 4].map(item => (
            <Grid item xs={12} sm={6} md={3} key={item}>
              <Card sx={{ boxShadow: 3 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                  <Skeleton variant='rounded' width={44} height={44} sx={{ mr: 3 }} />
                  <Box sx={{ width: '100%' }}>
                    <Skeleton variant='text' width='60%' height={32} />
                    <Skeleton variant='text' width='80%' height={20} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* 2. Filtres Skeleton */}
      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3 }}>
          <CardContent sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', py: 4 }}>
            <Skeleton variant='rounded' width={220} height={40} />
            <Skeleton variant='rounded' width={220} height={40} />
            <Skeleton variant='rounded' width={220} height={40} />
            <Skeleton variant='rounded' width={220} height={40} />
            <Skeleton variant='circular' width={40} height={40} sx={{ ml: 'auto' }} />
          </CardContent>
        </Card>
      </Grid>

      {/* 3. Tableau Skeleton */}
      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3 }}>
          <Box sx={{ height: 500, width: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* En-tête sombre du tableau */}
            <Box sx={{ height: 56, bgcolor: '#0d1b2a', display: 'flex', alignItems: 'center', px: 4 }}>
              <Skeleton variant='text' width='10%' height={24} sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 4 }} />
              <Skeleton variant='text' width='25%' height={24} sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 4 }} />
              <Skeleton variant='text' width='20%' height={24} sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 4 }} />
              <Skeleton variant='text' width='10%' height={24} sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 4 }} />
              <Skeleton variant='text' width='15%' height={24} sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 4 }} />
            </Box>

            {/* Lignes du tableau */}
            {[1, 2, 3, 4, 5, 6].map(row => (
              <Box
                key={row}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 4,
                  py: 3,
                  borderBottom: '1px solid rgba(58, 53, 65, 0.12)'
                }}
              >
                <Skeleton variant='text' width='10%' sx={{ mr: 4 }} />
                <Skeleton variant='text' width='25%' sx={{ mr: 4 }} />
                <Skeleton variant='text' width='20%' sx={{ mr: 4 }} />
                <Skeleton variant='text' width='10%' sx={{ mr: 4 }} />
                <Skeleton variant='rounded' width={100} height={24} sx={{ mr: 4, borderRadius: 8 }} />
                <Skeleton variant='circular' width={24} height={24} sx={{ ml: 'auto' }} />
              </Box>
            ))}
          </Box>
        </Card>
      </Grid>
    </Grid>
  )
}

export default SortiesSkeleton
