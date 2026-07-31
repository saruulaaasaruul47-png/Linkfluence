import { apiClient } from './axiosClient'

const dataOf = (response) => response.data?.data
const target = (key) => {
  const [type, ...rest] = String(key || '').split(':')
  return {
    type: type.toLowerCase(),
    id: rest.join(':'),
  }
}
const targetUrl = (prefix, key) => {
  const item = target(key)
  return `${prefix}/${encodeURIComponent(item.type)}/${encodeURIComponent(item.id)}`
}

export const libraryApi = {
  state: () => apiClient.get('/library').then(dataOf),
  save: (key) => apiClient.put(targetUrl('/library/saved', key), {}).then(dataOf),
  unsave: (key) => apiClient.delete(targetUrl('/library/saved', key)).then(dataOf),
  follow: (key) => apiClient.put(targetUrl('/library/following', key), {}).then(dataOf),
  unfollow: (key) => apiClient.delete(targetUrl('/library/following', key)).then(dataOf),
  recent: (key) => {
    const item = target(key)
    return apiClient.post('/library/recent', {
      targetType: item.type,
      targetId: item.id,
    }).then(dataOf)
  },
  share: (key, channel = 'clipboard') => {
    const item = target(key)
    return apiClient.post('/library/shares', {
      targetType: item.type,
      targetId: item.id,
      channel,
    }).then(dataOf)
  },
}

export const collectionsApi = {
  list: () => apiClient.get('/collections').then(dataOf),
  get: (id, token) => apiClient.get(`/collections/${id}`, { params: token ? { token } : {} }).then(dataOf),
  create: (payload) => apiClient.post('/collections', payload).then(dataOf),
  update: (id, payload) => apiClient.patch(`/collections/${id}`, payload).then(dataOf),
  remove: (id) => apiClient.delete(`/collections/${id}`).then(dataOf),
  addItem: (id, key, note) => apiClient.put(
    targetUrl(`/collections/${id}/items`, key),
    note ? { note } : {},
  ).then(dataOf),
  removeItem: (id, key) => apiClient.delete(
    targetUrl(`/collections/${id}/items`, key),
  ).then(dataOf),
}
