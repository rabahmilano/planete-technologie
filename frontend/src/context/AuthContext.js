import { createContext, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import axiosInstance from 'src/configs/axiosConfig'
import authConfig from 'src/configs/auth'

const defaultProvider = {
  user: null,
  loading: true,
  setUser: () => null,
  setLoading: () => Boolean,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  register: () => Promise.resolve()
}

export const AuthContext = createContext(defaultProvider)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(defaultProvider.user)
  const [loading, setLoading] = useState(defaultProvider.loading)
  const router = useRouter()

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = window.localStorage.getItem(authConfig.storageTokenKeyName)
      if (storedToken) {
        setLoading(true)
        await axiosInstance
          .get(authConfig.meEndpoint)
          .then(async response => {
            setLoading(false)
            setUser({ ...response.data })
          })
          .catch(() => {
            localStorage.removeItem('userData')
            localStorage.removeItem(authConfig.storageTokenKeyName)
            localStorage.removeItem(authConfig.onTokenExpiration)
            setUser(null)
            setLoading(false)
            if (authConfig.onTokenExpiration === 'logout' && !router.pathname.includes('login')) {
              router.replace('/login')
            }
          })
      } else {
        setLoading(false)
      }
    }
    initAuth()
  }, [])

  const handleLogin = (params, errorCallback) => {
    axiosInstance
      .post(authConfig.loginEndpoint, params)
      .then(async response => {
        window.localStorage.setItem(authConfig.storageTokenKeyName, response.data.accessToken)
        window.localStorage.setItem(authConfig.onTokenExpiration, response.data.refreshToken)

        const returnUrl = router.query.returnUrl
        setUser({ ...response.data.user })
        window.localStorage.setItem('userData', JSON.stringify(response.data.user))

        const redirectURL = returnUrl && returnUrl !== '/' ? returnUrl : '/'
        router.replace(redirectURL)
      })
      .catch(err => {
        if (errorCallback) errorCallback(err)
      })
  }

  const handleRegister = (params, errorCallback) => {
    const payload = {
      nom_complet: params.username || 'Nouvel Utilisateur',
      email: params.email,
      password: params.password
    }

    axiosInstance
      .post(authConfig.registerEndpoint, payload)
      .then(res => {
        window.localStorage.setItem(authConfig.storageTokenKeyName, res.data.accessToken)
        window.localStorage.setItem(authConfig.onTokenExpiration, res.data.refreshToken)
        window.localStorage.setItem('userData', JSON.stringify(res.data.user))
        setUser({ ...res.data.user })
        router.replace('/')
      })
      .catch(err => {
        if (errorCallback) errorCallback(err)
      })
  }

  const handleLogout = () => {
    setUser(null)
    window.localStorage.removeItem('userData')
    window.localStorage.removeItem(authConfig.storageTokenKeyName)
    window.localStorage.removeItem(authConfig.onTokenExpiration)
    router.push('/login')
  }

  const values = {
    user,
    loading,
    setUser,
    setLoading,
    login: handleLogin,
    logout: handleLogout,
    register: handleRegister
  }

  return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>
}
