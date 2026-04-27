import { useState, useEffect, forwardRef, useMemo } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Slide from '@mui/material/Slide'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import Skeleton from '@mui/material/Skeleton'
import { useTheme } from '@mui/material/styles'

import Timeline from '@mui/lab/Timeline'
import TimelineItem, { timelineItemClasses } from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent'

import Icon from 'src/@core/components/icon'
import { useCompte } from 'src/context/CompteContext'
import { formatMontant } from 'src/@core/utils/format'
import { hexToRGBA } from 'src/@core/utils/hex-to-rgba'
import { stringToColor } from 'src/@core/utils/colorUtils'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

dayjs.locale('fr')

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction='up' ref={ref} {...props} />
})

const HistoriqueCrediterDialog = ({ open, handleClose, compte }) => {
  const theme = useTheme()
  const { getHistoriqueCredit } = useCompte()

  const [historique, setHistorique] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && compte) {
      const fetchHistorique = async () => {
        setLoading(true)
        const data = await getHistoriqueCredit(compte.id_cpt)
        setHistorique(data)
        setLoading(false)
      }
      fetchHistorique()
    }
  }, [open, compte])

  const stats = useMemo(() => {
    if (!historique || historique.length === 0) return { totalInjecte: 0, totalDzd: 0, tauxMoyen: 0 }

    let totalInjecte = 0
    let totalDzd = 0

    historique.forEach(op => {
      const montant = parseFloat(op.montant_op || 0)
      const taux = parseFloat(op.taux_change || 0)
      totalInjecte += montant
      totalDzd += montant * taux
    })

    const tauxMoyen = totalInjecte > 0 ? totalDzd / totalInjecte : 0

    return { totalInjecte, totalDzd, tauxMoyen }
  }, [historique])

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      PaperProps={{
        sx: { backgroundColor: theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc' }
      }}
    >
      <Box
        sx={{
          px: 6,
          py: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Avatar
            variant='rounded'
            sx={{
              width: 48,
              height: 48,
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              color: 'text.primary'
            }}
          >
            <Icon icon='tabler:building-bank' fontSize='1.5rem' />
          </Avatar>
          <Box>
            <Typography variant='h5' sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}>
              {compte?.designation_cpt}
            </Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Historique des approvisionnements ({compte?.dev_code})
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={handleClose}
          sx={{
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            '&:hover': { backgroundColor: 'error.light', color: 'error.main' }
          }}
        >
          <Icon icon='tabler:x' />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: { xs: 4, md: 8 }, maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        <Grid container spacing={8}>
          <Grid item xs={12} md={4}>
            <Box sx={{ position: 'sticky', top: 32 }}>
              <Grid container spacing={4}>
                <Grid item xs={12}>
                  <Card sx={{ border: 'none', boxShadow: '0 4px 24px 0 rgba(0,0,0,0.05)', borderRadius: 3 }}>
                    <CardContent sx={{ p: '24px !important' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography
                            variant='body2'
                            sx={{ color: 'text.secondary', fontWeight: 600, mb: 1, letterSpacing: '0.5px' }}
                          >
                            TOTAL INJECTÉ
                          </Typography>
                          <Typography variant='h4' sx={{ fontWeight: 800, color: 'success.main' }}>
                            {formatMontant(stats.totalInjecte)}{' '}
                            <Typography component='span' variant='h6' sx={{ color: 'success.main', opacity: 0.8 }}>
                              {compte?.dev_code}
                            </Typography>
                          </Typography>
                        </Box>
                        <Avatar
                          variant='rounded'
                          sx={{
                            backgroundColor: hexToRGBA(theme.palette.success.main, 0.1),
                            color: 'success.main',
                            width: 48,
                            height: 48
                          }}
                        >
                          <Icon icon='tabler:arrow-down-left' fontSize='1.5rem' />
                        </Avatar>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card sx={{ border: 'none', boxShadow: '0 4px 24px 0 rgba(0,0,0,0.05)', borderRadius: 3 }}>
                    <CardContent sx={{ p: '24px !important' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography
                            variant='body2'
                            sx={{ color: 'text.secondary', fontWeight: 600, mb: 1, letterSpacing: '0.5px' }}
                          >
                            TAUX MOYEN
                          </Typography>
                          <Typography variant='h4' sx={{ fontWeight: 800, color: 'info.main' }}>
                            {formatMontant(stats.tauxMoyen)}{' '}
                            <Typography component='span' variant='h6' sx={{ color: 'info.main', opacity: 0.8 }}>
                              DA
                            </Typography>
                          </Typography>
                        </Box>
                        <Avatar
                          variant='rounded'
                          sx={{
                            backgroundColor: hexToRGBA(theme.palette.info.main, 0.1),
                            color: 'info.main',
                            width: 48,
                            height: 48
                          }}
                        >
                          <Icon icon='tabler:arrows-exchange' fontSize='1.5rem' />
                        </Avatar>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card sx={{ border: 'none', boxShadow: '0 4px 24px 0 rgba(0,0,0,0.05)', borderRadius: 3 }}>
                    <CardContent sx={{ p: '24px !important' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography
                            variant='body2'
                            sx={{ color: 'text.secondary', fontWeight: 600, mb: 1, letterSpacing: '0.5px' }}
                          >
                            ÉQUIVALENT DA
                          </Typography>
                          <Typography variant='h4' sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {formatMontant(stats.totalDzd)}{' '}
                            <Typography component='span' variant='h6' sx={{ color: 'text.secondary' }}>
                              DA
                            </Typography>
                          </Typography>
                        </Box>
                        <Avatar
                          variant='rounded'
                          sx={{
                            backgroundColor:
                              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                            color: 'text.primary',
                            width: 48,
                            height: 48
                          }}
                        >
                          <Icon icon='tabler:report-money' fontSize='1.5rem' />
                        </Avatar>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 4, gap: 6 }}>
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} variant='rectangular' width='60%' height={80} sx={{ borderRadius: 2 }} />
                ))}
              </Box>
            ) : historique.length > 0 ? (
              <Timeline position='alternate' sx={{ p: 0, m: 0 }}>
                {historique.map(row => {
                  const eqDzd = parseFloat(row.montant_op) * parseFloat(row.taux_change)
                  const dateTexte = dayjs(row.date_op).format('DD MMMM YYYY')
                  const dotColor = stringToColor(dateTexte)

                  return (
                    <TimelineItem key={row.id_op_crd} sx={{ minHeight: 120 }}>
                      <TimelineOppositeContent sx={{ m: 'auto 0' }}>
                        <Typography variant='body1' sx={{ color: 'text.secondary', fontWeight: 500 }}>
                          {dateTexte}
                        </Typography>
                      </TimelineOppositeContent>

                      <TimelineSeparator>
                        <TimelineConnector sx={{ backgroundColor: theme.palette.divider }} />
                        <TimelineDot
                          variant='outlined'
                          sx={{
                            borderWidth: 3,
                            borderColor: dotColor,
                            backgroundColor: 'background.paper',
                            p: 2,
                            m: 0
                          }}
                        />
                        <TimelineConnector sx={{ backgroundColor: theme.palette.divider }} />
                      </TimelineSeparator>

                      <TimelineContent sx={{ m: 'auto 0', py: 2 }}>
                        <Typography variant='h5' sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                          + {formatMontant(row.montant_op)}{' '}
                          <Typography
                            component='span'
                            variant='subtitle1'
                            sx={{ color: 'text.secondary', fontWeight: 600 }}
                          >
                            {compte?.dev_code}
                          </Typography>
                        </Typography>
                        <Typography variant='body2' sx={{ color: 'text.secondary', fontWeight: 500, mb: 0.5 }}>
                          <Icon
                            icon='tabler:clipboard-list'
                            fontSize='1.1rem'
                            style={{ verticalAlign: 'middle', marginRight: 4 }}
                          />
                          ≈ {formatMontant(eqDzd)} DA
                        </Typography>
                        <Typography variant='body2' sx={{ color: 'text.secondary', fontWeight: 500 }}>
                          <Icon
                            icon='tabler:arrows-exchange'
                            fontSize='1.1rem'
                            style={{ verticalAlign: 'middle', marginRight: 4 }}
                          />
                          Taux : {formatMontant(row.taux_change)}
                        </Typography>
                      </TimelineContent>
                    </TimelineItem>
                  )
                })}
              </Timeline>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pt: 10
                }}
              >
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    color: 'text.disabled',
                    mb: 4
                  }}
                >
                  <Icon icon='tabler:timeline-event-x' fontSize='2.5rem' />
                </Avatar>
                <Typography variant='h6' sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
                  Aucune donnée
                </Typography>
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  Ce compte n'a enregistré aucun approvisionnement.
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  )
}

export default HistoriqueCrediterDialog
