import axios from 'axios'
import { tokenStore } from './tokenStore'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  '/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise = null

const noAutomaticRefresh = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-email',
  '/auth/forgot-password',
  '/auth/verify-reset-otp',
  '/auth/reset-password',
  '/auth/refresh',
]

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const isExcluded = noAutomaticRefresh.some((path) => original?.url?.includes(path))

    if (error.response?.status !== 401 || !original || original._retry || isExcluded) {
      throw error
    }

    original._retry = true

    if (!refreshPromise) {
      refreshPromise = refreshClient
        .post('/auth/refresh')
        .then((response) => {
          const token = response.data?.data?.accessToken
          if (!token) throw new Error('The refresh response did not include an access token.')
          tokenStore.set(token)
          return token
        })
        .finally(() => {
          refreshPromise = null
        })
    }

    try {
      const token = await refreshPromise
      original.headers = original.headers || {}
      original.headers.Authorization = `Bearer ${token}`
      return apiClient(original)
    } catch (refreshError) {
      tokenStore.clear()
      window.dispatchEvent(new CustomEvent('vyra:auth-expired'))
      throw refreshError
    }
  },
)
