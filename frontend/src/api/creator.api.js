import { apiClient } from './axiosClient'

const dataOf = (response) => response.data?.data

export const creatorApi = {
  createProfile: (payload) => apiClient.post('/creator/profile', payload).then(dataOf),
  getProfile: () => apiClient.get('/creator/profile').then(dataOf),
  updateProfile: (payload) => apiClient.patch('/creator/profile', payload).then(dataOf),
  deleteProfile: () => apiClient.delete('/creator/profile').then(dataOf),
  downloadMediaKit: () => apiClient.get('/creator/media-kit.pdf', { responseType: 'blob' }),
  listPortfolio: () => apiClient.get('/creator/portfolio').then(dataOf),
  createPortfolio: (payload) => apiClient.post('/creator/portfolio', payload).then(dataOf),
  updatePortfolio: (id, payload) => apiClient.patch(`/creator/portfolio/${id}`, payload).then(dataOf),
  deletePortfolio: (id) => apiClient.delete(`/creator/portfolio/${id}`).then(dataOf),
}
