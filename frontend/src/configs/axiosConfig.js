import axios from 'axios'
import authConfig from 'src/configs/auth'

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL
})

axiosInstance.interceptors.request.use(
  config => {
    const storedToken = window.localStorage.getItem(authConfig.storageTokenKeyName)
    if (storedToken) {
      config.headers.Authorization = `Bearer ${storedToken}`
    }
    return config
  },
  error => Promise.reject(error)
)

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config

    if (error.response?.status === 403 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject })
        })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token
            return axiosInstance(originalRequest)
          })
          .catch(err => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = window.localStorage.getItem(authConfig.onTokenExpiration)

      if (!refreshToken) {
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}auth/refresh-token`, {
          refreshToken
        })

        window.localStorage.setItem(authConfig.storageTokenKeyName, data.accessToken)
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`
        originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`

        processQueue(null, data.accessToken)

        return axiosInstance(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        window.localStorage.removeItem('userData')
        window.localStorage.removeItem(authConfig.storageTokenKeyName)
        window.localStorage.removeItem(authConfig.onTokenExpiration)
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default axiosInstance
