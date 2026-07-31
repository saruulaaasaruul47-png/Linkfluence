import { apiClient } from './axiosClient'

const dataOf = (response) => response.data?.data

export const offerApi = {
  list: (side, params = {}) => apiClient.get('/offers', { params: { side, ...params } }).then(dataOf),
  create: (payload) => apiClient.post('/offers', payload).then(dataOf),
  creatorRespond: (id, payload) => apiClient.post(`/offers/${id}/respond`, payload).then(dataOf),
  businessDecide: (id, payload) => apiClient.post(`/offers/${id}/decision`, payload).then(dataOf),
}

export const collaborationApi = {
  list: (side, params = {}) => apiClient.get('/collaborations', { params: { side, ...params } }).then(dataOf),
  get: (id) => apiClient.get(`/collaborations/${id}`).then(dataOf),
  updateTerms: (id, payload) => apiClient.patch(`/collaborations/${id}/terms`, payload).then(dataOf),
  lockAgreement: (id, version) => apiClient.post(`/collaborations/${id}/agreement/lock`, { version }).then(dataOf),
  agreementAction: (id, payload) => apiClient.post(`/collaborations/${id}/agreement/action`, payload).then(dataOf),
  toggleTask: (id, taskId) => apiClient.post(`/collaborations/${id}/tasks/${taskId}/toggle`, {}).then(dataOf),
  addFile: (id, payload) => apiClient.post(`/collaborations/${id}/files`, payload).then(dataOf),
  addActivity: (id, message) => apiClient.post(`/collaborations/${id}/activity`, { message }).then(dataOf),
  createFundingIntent: (id, payload = {}) => apiClient.post(`/collaborations/${id}/payments/funding-intent`, payload).then(dataOf),
  submitDeliverable: (id, payload) => apiClient.post(`/collaborations/${id}/deliverables`, payload).then(dataOf),
  reviseDeliverable: (id, deliverableId, payload) => apiClient.post(`/collaborations/${id}/deliverables/${deliverableId}/revision`, payload).then(dataOf),
  reviewDeliverable: (id, deliverableId, payload) => apiClient.post(`/collaborations/${id}/deliverables/${deliverableId}/review`, payload).then(dataOf),
  submitReview: (id, payload) => apiClient.post(`/collaborations/${id}/reviews`, payload).then(dataOf),
  publishShowcase: (id, payload = {}) => apiClient.post(`/collaborations/${id}/showcase`, payload).then(dataOf),
}

export const contractApi = {
  action: (id, payload) => apiClient.post(`/contracts/${id}/action`, payload).then(dataOf),
}

export const paymentApi = {
  transactions: (params = {}) => apiClient.get('/payments/transactions', { params }).then(dataOf),
  methods: () => apiClient.get('/payments/methods').then(dataOf),
  addMethod: (payload) => apiClient.post('/payments/methods', payload).then(dataOf),
  removeMethod: (id) => apiClient.delete(`/payments/methods/${id}`).then(dataOf),
  requestRefund: (id, payload) => apiClient.post(`/payments/${id}/refunds`, payload).then(dataOf),
  requestPayout: (id, payload) => apiClient.post(`/payments/${id}/payouts`, payload).then(dataOf),
}
