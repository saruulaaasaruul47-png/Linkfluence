import { apiClient } from './axiosClient'

function responseData(response) {
  return response.data?.data ?? null
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function waitForApi() {
  let lastError
  const deadline = Date.now() + 12_000

  while (Date.now() < deadline) {
    try {
      await apiClient.get('/health', { timeout: 2_000 })
      return
    } catch (error) {
      lastError = error
      // A real HTTP response proves the API is reachable. Login should proceed
      // so the backend can return its own validation or authorization error.
      if (error.response) return
      if (Date.now() < deadline) await delay(500)
    }
  }

  throw lastError
}

export async function register(payload) {
  return responseData(await apiClient.post('/auth/register', payload))
}

export async function verifyEmail(payload) {
  return responseData(await apiClient.post('/auth/verify-email', payload))
}

export async function resendOtp(payload) {
  return responseData(await apiClient.post('/auth/resend-otp', payload))
}

export async function login(payload) {
  await waitForApi()
  return responseData(await apiClient.post('/auth/login', payload))
}

export async function googleLogin(credential) {
  return responseData(await apiClient.post('/auth/google', { credential }))
}

export async function refreshAccessToken() {
  return responseData(await apiClient.post('/auth/refresh'))
}

export async function logout() {
  return responseData(await apiClient.post('/auth/logout'))
}

export async function logoutAll() {
  return responseData(await apiClient.post('/auth/logout-all'))
}

export async function forgotPassword(payload) {
  return responseData(await apiClient.post('/auth/forgot-password', payload))
}

export async function verifyResetOtp(payload) {
  return responseData(await apiClient.post('/auth/verify-reset-otp', payload))
}

export async function resetPassword(payload) {
  return responseData(await apiClient.post('/auth/reset-password', payload))
}

export async function getCurrentUser(accessToken) {
  const config = accessToken
    ? { headers: { Authorization: `Bearer ${accessToken}` } }
    : undefined
  return responseData(await apiClient.get('/auth/me', config))
}

export async function reauthenticate(password) {
  return responseData(await apiClient.post('/auth/reauthenticate', { password }))
}

export const authApi = {
  register,
  verifyEmail,
  resendOtp,
  login,
  googleLogin,
  refreshAccessToken,
  logout,
  logoutAll,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  getCurrentUser,
  reauthenticate,
}
