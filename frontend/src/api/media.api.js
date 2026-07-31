import { apiClient } from './axiosClient'

const dataOf = (response) => response.data?.data

export const mediaApi = {
  upload: (file, purpose) => {
    const form = new FormData()
    form.append('purpose', purpose)
    form.append('file', file)
    return apiClient.post('/media/uploads', form).then(dataOf)
  },
  remove: (id) => apiClient.delete(`/media/uploads/${id}`).then(dataOf),
}
