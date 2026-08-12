import { apiClient } from './axiosClient'

const dataOf = (response) => response.data?.data

export const contentApi = {
  feed: (params = {}, config = {}) => apiClient.get('/feed', { ...config, params }).then(dataOf),
  get: (id) => apiClient.get(`/posts/${id}`).then(dataOf),
  channel: (authorType, id, params = {}) => apiClient.get(`/channels/${authorType}/${id}/posts`, { params }).then(dataOf),
  mine: (params) => apiClient.get('/posts/mine', { params }).then(dataOf),
  create: (payload) => apiClient.post('/posts', payload).then(dataOf),
  update: (id, payload) => apiClient.patch(`/posts/${id}`, payload).then(dataOf),
  publish: (id) => apiClient.post(`/posts/${id}/publish`, {}).then(dataOf),
  archive: (id) => apiClient.post(`/posts/${id}/archive`, {}).then(dataOf),
  remove: (id) => apiClient.delete(`/posts/${id}`).then(dataOf),
  like: (id) => apiClient.put(`/posts/${id}/like`, {}).then(dataOf),
  unlike: (id) => apiClient.delete(`/posts/${id}/like`).then(dataOf),
}
