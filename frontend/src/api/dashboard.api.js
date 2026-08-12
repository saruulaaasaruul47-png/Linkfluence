import { apiClient } from './axiosClient'
const dataOf = (response) => response.data?.data

export const messagingApi = {
  list: (params = {}) => apiClient.get('/conversations', { params }).then(dataOf),
  create: (collaborationId) => apiClient.post('/conversations', { collaborationId }).then(dataOf),
  requests: (params = {}) => apiClient.get('/conversations/requests', { params }).then(dataOf),
  createRequest: (payload) => apiClient.post('/conversations/requests', payload).then(dataOf),
  decideRequest: (id, action) => apiClient.post(`/conversations/requests/${id}/decision`, { action }).then(dataOf),
  messages: (id, params = {}) => apiClient.get(`/conversations/${id}/messages`, { params }).then(dataOf),
  send: (id, payload) => apiClient.post(`/conversations/${id}/messages`, payload).then(dataOf),
  edit: (id, messageId, body) => apiClient.patch(`/conversations/${id}/messages/${messageId}`, { body }).then(dataOf),
  remove: (id, messageId) => apiClient.delete(`/conversations/${id}/messages/${messageId}`).then(dataOf),
  read: (id) => apiClient.post(`/conversations/${id}/read`, {}).then(dataOf),
}

export const notificationApi = {
  list: (params = {}) => apiClient.get('/notifications', { params }).then(dataOf),
  read: (id) => apiClient.post(`/notifications/${id}/read`, {}).then(dataOf),
  readAll: () => apiClient.post('/notifications/read-all', {}).then(dataOf),
  preferences: () => apiClient.get('/notifications/preferences').then(dataOf),
  savePreferences: (payload) => apiClient.patch('/notifications/preferences', payload).then(dataOf),
}

export const analyticsApi = {
  summary: (params = {}) => apiClient.get('/analytics/summary', { params }).then(dataOf),
  track: (payload) => apiClient.post('/analytics/events', payload).then(dataOf),
  campaignReport: (campaignId) => apiClient.get(`/analytics/campaigns/${campaignId}/report`).then(dataOf),
  campaignReportPdf: (campaignId) => apiClient.get(`/analytics/campaigns/${campaignId}/report.pdf`, { responseType: 'blob' }),
}

export const adminApi = {
  overview: () => apiClient.get('/admin/overview').then(dataOf),
  financeOverview: () => apiClient.get('/admin/finance/overview').then(dataOf),
  financeList: (resource, params = {}) => apiClient.get(`/admin/finance/${resource}`, { params }).then(dataOf),
  financeDetail: (resource, id) => apiClient.get(`/admin/finance/${resource}/${id}`).then(dataOf),
  list: (resource, params = {}) => apiClient.get(`/admin/${resource}`, { params }).then(dataOf),
  setUserStatus: (id, payload) => apiClient.patch(`/admin/users/${id}/status`, payload).then(dataOf),
  resolveCase: (id, payload) => apiClient.post(`/admin/cases/${id}/resolve`, payload).then(dataOf),
  announce: (payload) => apiClient.post('/admin/announcements', payload).then(dataOf),
  verifyChannel: (type, id, payload) => apiClient.patch(`/admin/channels/${type}/${id}/verification`, payload).then(dataOf),
  setCampaignStatus: (id, payload) => apiClient.patch(`/admin/campaigns/${id}/status`, payload).then(dataOf),
  freezeContract: (id, payload) => apiClient.post(`/admin/contracts/${id}/freeze`, payload).then(dataOf),
  refundPayment: (id, payload) => apiClient.post(`/admin/finance/payments/${id}/refund`, payload).then(dataOf),
  reconcilePayout: (id, payload) => apiClient.patch(`/admin/finance/payouts/${id}/reconcile`, payload).then(dataOf),
  decidePayout: (id, payload) => apiClient.post(`/admin/finance/payouts/${id}/decision`, payload).then(dataOf),
  runReconciliation: (payload) => apiClient.post('/admin/reconciliation-runs', payload).then(dataOf),
  decideProof: (id, payload) => apiClient.post(`/admin/proofs/${id}/decision`, payload).then(dataOf),
  resolveDispute: (id, payload) => apiClient.post(`/admin/disputes/${id}/resolve`, payload).then(dataOf),
  settings: () => apiClient.get('/admin/settings').then(dataOf),
  updateSettings: (payload) => apiClient.patch('/admin/settings', payload).then(dataOf),
  featureFlags: () => apiClient.get('/admin/feature-flags').then(dataOf),
  createFeatureFlag: (payload) => apiClient.post('/admin/feature-flags', payload).then(dataOf),
  updateFeatureFlag: (id, payload) => apiClient.patch(`/admin/feature-flags/${id}`, payload).then(dataOf),
  hideContent: (id, payload) => apiClient.post(`/admin/content/${id}/hide`, payload).then(dataOf),
  restoreContent: (id, payload) => apiClient.post(`/admin/content/${id}/restore`, payload).then(dataOf),
}
