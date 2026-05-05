// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'

const StyledCompanyName = styled(Link)(({ theme }) => ({
  fontWeight: 500,
  textDecoration: 'none',
  color: `${theme.palette.primary.main} !important`
}))

const FooterContent = () => {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
      <Typography sx={{ display: 'flex', color: 'text.secondary' }}>
        {`© ${new Date().getFullYear()}, `}
        <Typography sx={{ ml: 1 }} href='/' component={StyledCompanyName}>
          Planète Technologie
        </Typography>
      </Typography>
    </Box>
  )
}

export default FooterContent
