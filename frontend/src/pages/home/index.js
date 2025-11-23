import HomeView from 'src/views/pages/home'

const Home = () => {
  return <HomeView />
}

export default Home

// import React, { useEffect, useState } from 'react'
// import { Card, CardHeader, CardContent, Grid, Box, Typography, CircularProgress } from '@mui/material'
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
// import axios from 'axios'
// import toast from 'react-hot-toast'

// const Home = () => {
//   const [chartData, setChartData] = useState([])
//   const [loading, setLoading] = useState(true)

//   useEffect(() => {
//     const fetchChartData = async () => {
//       try {
//         const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}produits/dashboard/sales-purchases-chart`)
//         setChartData(response.data)
//       } catch (error) {
//         toast.error('Erreur lors de la récupération des données du graphique.')
//       } finally {
//         setLoading(false)
//       }
//     }
//     fetchChartData()
//   }, [])

//   return (
//     <Grid container spacing={6}>
//       <Grid item xs={12}>
//         <Card>
//           <CardHeader
//             title='Activité des 12 Derniers Mois'
//             subheader='Nombre de colis achetés vs. nombre de produits vendus'
//           />
//           <CardContent>
//             {loading ? (
//               <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
//                 <CircularProgress />
//               </Box>
//             ) : (
//               <Box sx={{ height: 300 }}>
//                 <ResponsiveContainer width='100%' height='100%'>
//                   <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
//                     <CartesianGrid strokeDasharray='3 3' />
//                     <XAxis dataKey='month' />
//                     <YAxis allowDecimals={false} />
//                     <Tooltip />
//                     <Legend />
//                     <Line type='monotone' dataKey='achats' name='Colis Achetés' stroke='#8884d8' strokeWidth={2} />
//                     <Line type='monotone' dataKey='ventes' name='Produits Vendus' stroke='#82ca9d' strokeWidth={2} />
//                   </LineChart>
//                 </ResponsiveContainer>
//               </Box>
//             )}
//           </CardContent>
//         </Card>
//       </Grid>
//       <Grid item xs={12}>
//         <Card>
//           <CardHeader title='Bienvenue sur Web Shop It 🚀'></CardHeader>
//           <CardContent>
//             <Typography>
//               Utilisez le menu de navigation sur la gauche pour gérer vos produits, commandes et dépenses.
//             </Typography>
//           </CardContent>
//         </Card>
//       </Grid>
//     </Grid>
//   )
// }

// export default Home
