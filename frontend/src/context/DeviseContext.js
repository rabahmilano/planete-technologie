// src/context/DeviseContext.js
import { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'

const DeviseContext = createContext()

export const useDevises = () => useContext(DeviseContext)

export const DeviseProvider = ({ children }) => {
  const [devises, setDevises] = useState([])
  // const [devisesDetails, setDevisesDetails] = useState([])

  const fetchDevises = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}devises/allDevises`)
      setDevises(response.data)
    } catch (error) {
      console.error('Erreur lors de la récupération des devises:', error)
    }
  }

  // const fetchDevisesDetails = async () => {
  //   try {
  //     const reponse = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}devises/allDevisesDetails`)
  //     setDevisesDetails(reponse.data)
  //   } catch (error) {
  //     console.error('Erreur lors de la récupération les détails des devises:', error)
  //   }
  // }

  useEffect(() => {
    fetchDevises()
  }, [])

  return <DeviseContext.Provider value={{ devises, fetchDevises }}>{children}</DeviseContext.Provider>
}
