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
  createTask: (id, payload) => apiClient.post(`/collaborations/${id}/tasks`, payload).then(dataOf),
  updateTask: (id, taskId, payload) => apiClient.patch(`/collaborations/${id}/tasks/${taskId}`, payload).then(dataOf),
  deleteTask: (id, taskId, version) => apiClient.delete(`/collaborations/${id}/tasks/${taskId}`, { params: { version } }).then(dataOf),
  toggleTask: (id, taskId) => apiClient.post(`/collaborations/${id}/tasks/${taskId}/toggle`, {}).then(dataOf),
  addFile: (id, payload) => apiClient.post(`/collaborations/${id}/files`, payload).then(dataOf),
  addActivity: (id, message) => apiClient.post(`/collaborations/${id}/activity`, { message }).then(dataOf),
  createFundingIntent: (id, payload = {}) => apiClient.post(`/collaborations/${id}/payments/funding-intent`, payload).then(dataOf),
  paymentSummary: (id) => apiClient.get(`/collaborations/${id}/payments/summary`).then(dataOf),
  fundFromWallet: (id, payload) => apiClient.post(`/collaborations/${id}/payments/fund`, payload).then(dataOf),
  submitDeliverable: (id, payload) => apiClient.post(`/collaborations/${id}/deliverables`, payload).then(dataOf),
  reviseDeliverable: (id, deliverableId, payload) => apiClient.post(`/collaborations/${id}/deliverables/${deliverableId}/revision`, payload).then(dataOf),
  reviewDeliverable: (id, deliverableId, payload) => apiClient.post(`/collaborations/${id}/deliverables/${deliverableId}/review`, payload).then(dataOf),
  submitReview: (id, payload) => apiClient.post(`/collaborations/${id}/reviews`, payload).then(dataOf),
  publishShowcase: (id, payload = {}) => apiClient.post(`/collaborations/${id}/showcase`, payload).then(dataOf),
  declineShowcase: (id) => apiClient.post(`/collaborations/${id}/showcase/decline`, {}).then(dataOf),
  proofs: (id) => apiClient.get(`/collaborations/${id}/proofs`).then(dataOf),
  submitProof: (id, payload) => apiClient.post(`/collaborations/${id}/proofs`, payload).then(dataOf),
  disputes: (id) => apiClient.get(`/collaborations/${id}/disputes`).then(dataOf),
  openDispute: (id, payload) => apiClient.post(`/collaborations/${id}/disputes`, payload).then(dataOf),
}

export const disputeApi = {
  addEvidence: (id, payload) => apiClient.post(`/disputes/${id}/evidence`, payload).then(dataOf),
}

export const contractApi = {
  list: (params = {}) => apiClient.get('/contracts', { params }).then(dataOf),
  get: (id) => apiClient.get(`/contracts/${id}`).then(dataOf),
  action: (id, payload) => apiClient.post(`/contracts/${id}/action`, payload).then(dataOf),
  document: (id, version) => apiClient.get(`/contracts/${id}/document`, {
    params: version ? { version } : {},
    responseType: 'blob',
  }),
}

export const paymentApi = {
  wallet: (currency = 'MNT') => apiClient.get('/payments/wallet', { params: { currency } }).then(dataOf),
  createTopUp: (payload) => apiClient.post('/payments/wallet/top-ups', payload).then(dataOf),
  transactions: (params = {}) => apiClient.get('/payments/transactions', { params }).then(dataOf),
  methods: () => apiClient.get('/payments/methods').then(dataOf),
  addMethod: (payload) => apiClient.post('/payments/methods', payload).then(dataOf),
  removeMethod: (id) => apiClient.delete(`/payments/methods/${id}`).then(dataOf),
  payoutAccounts: () => apiClient.get('/payments/payout-accounts').then(dataOf),
  addPayoutAccount: (payload) => apiClient.post('/payments/payout-accounts', payload).then(dataOf),
  removePayoutAccount: (id) => apiClient.delete(`/payments/payout-accounts/${id}`).then(dataOf),
  requestRefund: (id, payload) => apiClient.post(`/payments/${id}/refunds`, payload).then(dataOf),
  requestPayout: (id, payload) => apiClient.post(`/payments/${id}/payouts`, payload).then(dataOf),
  earningsSummary: () => apiClient.get('/payments/earnings/summary').then(dataOf),
  earningsExport: (year) => apiClient.get('/payments/earnings/export.csv', { params: year ? { year } : {}, responseType: 'blob' }),
}
