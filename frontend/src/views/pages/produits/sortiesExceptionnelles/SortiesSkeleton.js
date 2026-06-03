import { Grid, Card, CardContent, Box, Skeleton } from '@mui/material'

const SortiesSkeleton = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12} md={4} sx={{ height: 320 }}>
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: '24px !important'
            }}
          >
            <Skeleton variant='text' width='60%' height={32} sx={{ mb: 4 }} />
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <Skeleton variant='circular' width={160} height={160} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
              <Skeleton variant='circular' width={10} height={10} />
              <Skeleton variant='circular' width={10} height={10} />
              <Skeleton variant='circular' width={10} height={10} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4} sx={{ height: 320 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Grid container spacing={4}>
              <Grid item xs={6}>
                <Skeleton variant='rounded' height={56} />
              </Grid>
              <Grid item xs={6}>
                <Skeleton variant='rounded' height={56} />
              </Grid>
              <Grid item xs={6}>
                <Skeleton variant='rounded' height={56} />
              </Grid>
              <Grid item xs={6}>
                <Skeleton variant='rounded' height={56} />
              </Grid>
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Skeleton variant='rounded' width={220} height={40} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4} sx={{ height: 320 }}>
        <Box
          sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 4, height: '100%' }}
        >
          {[1, 2, 3, 4].map(item => (
            <Card key={item} sx={{ boxShadow: 2, display: 'flex', flexDirection: 'column' }}>
              <CardContent
                sx={{
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: '16px !important'
                }}
              >
                <Skeleton variant='rounded' width={38} height={38} sx={{ mb: 2 }} />
                <Skeleton variant='text' width='40%' height={28} />
                <Skeleton variant='text' width='70%' height={16} />
              </CardContent>
            </Card>
          ))}
        </Box>
      </Grid>

      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3 }}>
          <Box sx={{ height: 500, width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ height: 56, bgcolor: '#0d1b2a', display: 'flex', alignItems: 'center', px: 4 }}>
              <Skeleton variant='text' width='15%' height={24} sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 4 }} />
              <Skeleton variant='text' width='25%' height={24} sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 4 }} />
              <Skeleton variant='text' width='20%' height={24} sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 4 }} />
              <Skeleton variant='text' width='10%' height={24} sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 4 }} />
              <Skeleton variant='text' width='15%' height={24} sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 4 }} />
              <Skeleton variant='text' width='15%' height={24} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
            </Box>

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
                <Skeleton variant='text' width='15%' sx={{ mr: 4 }} />
                <Skeleton variant='text' width='25%' sx={{ mr: 4 }} />
                <Skeleton variant='text' width='20%' sx={{ mr: 4 }} />
                <Skeleton variant='text' width='10%' sx={{ mr: 4 }} />
                <Skeleton variant='text' width='15%' sx={{ mr: 4 }} />
                <Skeleton variant='rounded' width={100} height={24} sx={{ mr: 4, borderRadius: 8 }} />
                <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                  <Skeleton variant='circular' width={28} height={28} />
                  <Skeleton variant='circular' width={28} height={28} />
                </Box>
              </Box>
            ))}
          </Box>
        </Card>
      </Grid>
    </Grid>
  )
}

export default SortiesSkeleton
