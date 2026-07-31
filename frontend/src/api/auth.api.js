import { apiClient } from './axiosClient'

function responseData(response) {
  return response.data?.data ?? null
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
  return responseData(await apiClient.post('/auth/login', payload))
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

export async function getCurrentUser() {
  return responseData(await apiClient.get('/auth/me'))
}

export const authApi = {
  register,
  verifyEmail,
  resendOtp,
  login,
  refreshAccessToken,
  logout,
  logoutAll,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  getCurrentUser,
}
