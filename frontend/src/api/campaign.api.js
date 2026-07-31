import { apiClient } from './axiosClient'

const dataOf = (response) => response.data?.data

export const campaignApi = {
  discover: (params = {}) => apiClient.get('/campaigns', { params }).then(dataOf),
  get: (id) => apiClient.get(`/campaigns/${id}`).then(dataOf),
  listMine: (params = {}) => apiClient.get('/business/campaigns', { params }).then(dataOf),
  create: (payload) => apiClient.post('/business/campaigns', payload).then(dataOf),
  update: (id, payload) => apiClient.patch(`/business/campaigns/${id}`, payload).then(dataOf),
  publish: (id, isPublic = true) => apiClient.post(`/business/campaigns/${id}/publish`, { isPublic }).then(dataOf),
  pause: (id) => apiClient.post(`/business/campaigns/${id}/pause`, {}).then(dataOf),
  archive: (id) => apiClient.post(`/business/campaigns/${id}/archive`, {}).then(dataOf),
  remove: (id) => apiClient.delete(`/business/campaigns/${id}`).then(dataOf),
}

export const proposalApi = {
  submit: (campaignId, payload) => apiClient.post(`/campaigns/${campaignId}/proposals`, payload).then(dataOf),
  get: (id) => apiClient.get(`/proposals/${id}`).then(dataOf),
  listMine: (params = {}) => apiClient.get('/creator/proposals', { params }).then(dataOf),
  update: (id, payload) => apiClient.patch(`/creator/proposals/${id}`, payload).then(dataOf),
  withdraw: (id) => apiClient.post(`/creator/proposals/${id}/withdraw`, {}).then(dataOf),
  listBusiness: (params = {}) => apiClient.get('/business/proposals', { params }).then(dataOf),
  decide: (id, payload) => apiClient.post(`/business/proposals/${id}/decision`, payload).then(dataOf),
}

export const sourcingApi = {
  shortlist: (params = {}) => apiClient.get('/business/shortlist', { params }).then(dataOf),
  addShortlist: (creatorId, payload = {}) => apiClient.put(`/business/shortlist/${creatorId}`, payload).then(dataOf),
  removeShortlist: (creatorId, params = {}) => apiClient.delete(`/business/shortlist/${creatorId}`, { params }).then(dataOf),
  compare: (params = {}) => apiClient.get('/business/compare', { params }).then(dataOf),
  addCompare: (creatorId, payload = {}) => apiClient.put(`/business/compare/${creatorId}`, payload).then(dataOf),
  removeCompare: (creatorId, params = {}) => apiClient.delete(`/business/compare/${creatorId}`, { params }).then(dataOf),
  invite: (payload) => apiClient.post('/business/invitations', payload).then(dataOf),
  businessInvitations: (params = {}) => apiClient.get('/business/invitations', { params }).then(dataOf),
  creatorInvitations: (params = {}) => apiClient.get('/creator/invitations', { params }).then(dataOf),
  respondInvitation: (id, action) => apiClient.post(`/creator/invitations/${id}/respond`, { action }).then(dataOf),
  cancelInvitation: (id) => apiClient.post(`/business/invitations/${id}/cancel`, {}).then(dataOf),
}
