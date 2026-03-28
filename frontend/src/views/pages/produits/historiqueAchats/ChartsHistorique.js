import { useState } from 'react'
import { Card, CardHeader, CardContent, Box, Typography } from '@mui/material'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useKeenSlider } from 'keen-slider/react'
import 'keen-slider/keen-slider.min.css'
import { stringToColor } from 'src/@core/utils/colorUtils'

const ChartsHistorique = ({ chartDataCategory, chartDataYear, chartDataAccount, chartDataTopProducts }) => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loaded, setLoaded] = useState(false)

  const [sliderRef, instanceRef] = useKeenSlider(
    {
      initial: 0,
      loop: true,
      slides: { perView: 1, spacing: 15 },
      detailsChanged(slider) {
        setCurrentSlide(slider.track.details.rel)
      },
      created() {
        setLoaded(true)
      }
    },
    [
      slider => {
        let timeout
        let mouseOver = false

        function clearNextTimeout() {
          clearTimeout(timeout)
        }

        function nextTimeout() {
          clearTimeout(timeout)
          if (mouseOver) return
          timeout = setTimeout(() => {
            slider.next()
          }, 4000)
        }

        slider.on('created', () => {
          slider.container.addEventListener('mouseover', () => {
            mouseOver = true
            clearNextTimeout()
          })
          slider.container.addEventListener('mouseout', () => {
            mouseOver = false
            nextTimeout()
          })
          nextTimeout()
        })
        slider.on('dragStarted', clearNextTimeout)
        slider.on('animationEnded', nextTimeout)
        slider.on('updated', nextTimeout)
      }
    ]
  )

  return (
    <Card>
      <CardHeader title='Analyses Graphiques' />
      <CardContent>
        <Box ref={sliderRef} className='keen-slider'>
          <Box className='keen-slider__slide'>
            <Typography align='center' variant='h6' gutterBottom>
              Achats par Catégorie
            </Typography>
            <ResponsiveContainer width='100%' height={250}>
              <PieChart>
                <Pie data={chartDataCategory} dataKey='value' nameKey='name' cx='50%' cy='50%' outerRadius={90} label>
                  {chartDataCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={stringToColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          <Box className='keen-slider__slide'>
            <Typography align='center' variant='h6' gutterBottom>
              Achats par Année
            </Typography>
            <ResponsiveContainer width='100%' height={250}>
              <BarChart data={chartDataYear} margin={{ left: 20 }}>
                <XAxis dataKey='year' />
                <YAxis />
                <Tooltip formatter={value => [`${value} colis`, 'Total']} />
                <Bar dataKey='value' fill='#8884d8' />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          <Box className='keen-slider__slide'>
            <Typography align='center' variant='h6' gutterBottom>
              Achats par Compte
            </Typography>
            <ResponsiveContainer width='100%' height={250}>
              <PieChart>
                <Pie data={chartDataAccount} dataKey='value' nameKey='name' cx='50%' cy='50%' outerRadius={90} label>
                  {chartDataAccount.map(entry => (
                    <Cell key={`cell-${entry.name}`} fill={stringToColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          <Box className='keen-slider__slide'>
            <Typography align='center' variant='h6' gutterBottom>
              Top 5 Produits (Qté)
            </Typography>
            <ResponsiveContainer width='100%' height={250}>
              <BarChart data={chartDataTopProducts} layout='vertical' margin={{ left: 0 }}>
                <XAxis type='number' />
                <YAxis type='category' dataKey='name' width={100} tick={{ fontSize: 10 }} interval={0} />
                <Tooltip formatter={value => [value, 'Quantité']} />
                <Bar dataKey='value' fill='#82ca9d' />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        {loaded && instanceRef.current && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            {[...Array(instanceRef.current.track.details.slides.length).keys()].map(idx => {
              return (
                <Box
                  key={idx}
                  onClick={() => {
                    instanceRef.current?.moveToIdx(idx)
                  }}
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: currentSlide === idx ? 'primary.main' : 'action.disabled',
                    margin: '0 5px',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s ease'
                  }}
                />
              )
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default ChartsHistorique
