import { apiClient } from './axiosClient'

const dataOf = (response) => response.data?.data

export const businessApi = {
  createProfile: (payload) => apiClient.post('/business/profile', payload).then(dataOf),
  getProfile: () => apiClient.get('/business/profile').then(dataOf),
  updateProfile: (payload) => apiClient.patch('/business/profile', payload).then(dataOf),
  deleteProfile: () => apiClient.delete('/business/profile').then(dataOf),
}
