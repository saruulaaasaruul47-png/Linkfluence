import axios from 'axios'
import { tokenStore } from './tokenStore'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  '/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshAttempt = null

const noAutomaticRefresh = [
  '/auth/login',
  '/auth/google',
  '/auth/register',
  '/auth/verify-email',
  '/auth/forgot-password',
  '/auth/verify-reset-otp',
  '/auth/reset-password',
  '/auth/refresh',
  '/auth/logout',
]

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`
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

    if (!refreshAttempt) {
      const attempt = {
        accessToken: tokenStore.get(),
        promise: null,
      }
      attempt.promise = refreshClient
        .post('/auth/refresh')
        .then((response) => {
          const token = response.data?.data?.accessToken
          if (!token) throw new Error('The refresh response did not include an access token.')
          const currentToken = tokenStore.get()
          if (currentToken !== attempt.accessToken) {
            const staleError = new Error('The active session changed while this request was being refreshed.')
            staleError.code = 'ERR_STALE_SESSION'
            throw staleError
          }
          tokenStore.set(token)
          return token
        })
        .finally(() => {
          if (refreshAttempt === attempt) refreshAttempt = null
        })
      refreshAttempt = attempt
    }

    const attempt = refreshAttempt
    try {
      const token = await attempt.promise
      original.headers = original.headers || {}
      original.headers.Authorization = `Bearer ${token}`
      return apiClient(original)
    } catch (refreshError) {
      if (tokenStore.get() === attempt.accessToken) {
        tokenStore.clear()
        window.dispatchEvent(new CustomEvent('vyra:auth-expired'))
      }
      throw refreshError
    }
  },
)
