import { apiClient } from './axiosClient'

const dataOf = (response) => response.data?.data

export const marketplaceApi = {
  listCreators: (params = {}) => apiClient.get('/creators', { params }).then(dataOf),
  getCreator: (id) => apiClient
    .get(`/creators/${id}`)
    .then(dataOf)
    .then((data) => data?.creator || data),
  listBusinesses: (params = {}) => apiClient.get('/businesses', { params }).then(dataOf),
  getBusiness: (id) => apiClient
    .get(`/businesses/${id}`)
    .then(dataOf)
    .then((data) => data?.business || data),
  getCategories: () => apiClient.get('/categories').then(dataOf),
  getPortfolioItem: (id) => apiClient.get(`/portfolio/${id}`).then(dataOf),
  discover: (params = {}) => apiClient.get('/marketplace/discover', { params }).then(dataOf),
  search: (params = {}) => apiClient.get('/search', { params }).then(dataOf),
}
