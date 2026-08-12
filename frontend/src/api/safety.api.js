import { apiClient } from './axiosClient'

const dataOf = (response) => response.data?.data
const path = (action, type, id) => `/safety/${action}/${type}/${encodeURIComponent(id)}`

export const safetyApi = {
  state: () => apiClient.get('/safety').then(dataOf),
  block: (type, id) => apiClient.put(path('blocks', type, id), {}).then(dataOf),
  unblock: (type, id) => apiClient.delete(path('blocks', type, id)).then(dataOf),
  mute: (type, id) => apiClient.put(path('mutes', type, id), {}).then(dataOf),
  unmute: (type, id) => apiClient.delete(path('mutes', type, id)).then(dataOf),
  report: (payload) => apiClient.post('/reports', payload).then(dataOf),
}
