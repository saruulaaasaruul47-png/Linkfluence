import { apiClient } from './axiosClient'

const dataOf = (response) => response.data?.data

export const userApi = {
  getMe: () => apiClient.get('/users/me').then(dataOf),
  updateMe: (payload) => apiClient.patch('/users/me', payload).then(dataOf),
  uploadAvatar: (file) => {
    const form = new FormData()
    form.append('avatar', file)
    return apiClient.patch('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(dataOf)
  },
  changePassword: (payload) => apiClient.patch('/users/me/password', payload).then(dataOf),
  deleteMe: () => apiClient.delete('/users/me').then(dataOf),
}
