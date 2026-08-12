import { apiClient } from './axiosClient'

const dataOf = (response) => response.data?.data

export const marketplaceApi = {
  listCreators: (params = {}, config = {}) => apiClient.get('/creators', { ...config, params }).then(dataOf),
  getCreator: (id) => apiClient
    .get(`/creators/${id}`)
    .then(dataOf)
    .then((data) => data?.creator || data),
  listBusinesses: (params = {}, config = {}) => apiClient.get('/businesses', { ...config, params }).then(dataOf),
  getBusiness: (id) => apiClient
    .get(`/businesses/${id}`)
    .then(dataOf)
    .then((data) => data?.business || data),
  getCategories: () => apiClient.get('/categories').then(dataOf),
  getPortfolioItem: (id) => apiClient.get(`/portfolio/${id}`).then(dataOf),
  discover: (params = {}, config = {}) => apiClient.get('/marketplace/discover', { ...config, params }).then(dataOf),
  search: (params = {}, config = {}) => apiClient.get('/search', { ...config, params }).then(dataOf),
}
