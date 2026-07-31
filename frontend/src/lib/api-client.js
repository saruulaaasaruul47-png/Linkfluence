import { API_BASE_URL, apiClient } from '../api/axiosClient'

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN_ERROR', details = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function friendlyApiMessage(error) {
  if (!navigator.onLine) return 'You appear to be offline. Check your connection and try again.'
  if (!error?.response) return 'Сервертэй холбогдож чадсангүй. Түр хүлээгээд дахин оролдоно уу.'
  if (error.response.status === 401) return 'Your session expired. Please sign in again.'
  if (error.response.status === 403) return 'You do not have permission to perform this action.'
  if (error.response.status === 404) return 'The requested resource could not be found.'
  if (error.response.status >= 500) return 'The service is temporarily unavailable. Please try again later.'
  return error.response.data?.error?.message || error.message || 'Something went wrong. Please try again.'
}

export async function apiRequest(path, options = {}) {
  let data = options.body
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      // Keep non-JSON text bodies unchanged.
    }
  }

  try {
    const response = await apiClient.request({
      url: path,
      method: options.method || 'GET',
      data,
      headers: options.headers,
      timeout: options.timeout || 15000,
    })
    return response.data
  } catch (error) {
    const backendError = error.response?.data?.error
    throw new ApiError(backendError?.message || friendlyApiMessage(error), {
      status: error.response?.status || 0,
      code: backendError?.code || error.code || 'NETWORK_ERROR',
      details: backendError?.details || null,
    })
  }
}

export async function optimisticMutation({ apply, rollback, request }) {
  const snapshot = apply()
  try {
    return await request()
  } catch (error) {
    rollback(snapshot)
    throw error
  }
}

export const API_URL = API_BASE_URL
