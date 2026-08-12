import { apiClient } from './axiosClient'

const dataOf = (response) => response.data?.data

export const socialApi = {
  authorize: (provider, channelType = 'CREATOR', redirectTo = `/account?channel=${channelType.toLowerCase()}`) => apiClient
    .get(`/social-connections/${provider}/authorize`, { params: { redirectTo, channelType } })
    .then(dataOf),
  list: (channelType = 'CREATOR') => apiClient.get('/social-connections', { params: { channelType } }).then(dataOf),
  createManual: (payload, channelType = 'CREATOR') => apiClient.post('/social-connections/manual', payload, { params: { channelType } }).then(dataOf),
  updateManual: (id, payload, channelType = 'CREATOR') => apiClient.patch(`/social-connections/${id}/manual`, payload, { params: { channelType } }).then(dataOf),
  sync: (id) => apiClient.post(`/social-connections/${id}/sync`).then(dataOf),
  disconnect: (id, channelType = 'CREATOR') => apiClient.delete(`/social-connections/${id}`, { params: { channelType } }).then(dataOf),
  selectionOptions: (selectionToken) => apiClient.get('/social-connections/selections/options', { params: { selectionToken } }).then(dataOf),
  completeSelection: (selectionToken, externalAccountId) => apiClient.post('/social-connections/selections/complete', { selectionToken, externalAccountId }).then(dataOf),
}
