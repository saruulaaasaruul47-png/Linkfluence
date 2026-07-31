import { apiClient } from './axiosClient'

const dataOf = (response) => response.data?.data

export const showcaseApi = {
  list: (params = {}) => apiClient.get('/showcase', { params }).then(dataOf),
  following: (params = {}) => apiClient.get('/showcase/following', { params }).then(dataOf),
  get: (id) => apiClient.get(`/showcase/${id}`).then(dataOf),
  mine: () => apiClient.get('/showcase/mine').then(dataOf),
  create: (payload) => apiClient.post('/showcase', payload).then(dataOf),
  update: (id, payload) => apiClient.patch(`/showcase/${id}`, payload).then(dataOf),
  archive: (id) => apiClient.delete(`/showcase/${id}`).then(dataOf),
  like: (id) => apiClient.put(`/showcase/${id}/reactions/like`, {}).then(dataOf),
  unlike: (id) => apiClient.delete(`/showcase/${id}/reactions/like`).then(dataOf),
}
