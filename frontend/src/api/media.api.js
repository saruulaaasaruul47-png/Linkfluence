import { apiClient } from './axiosClient'

const dataOf = (response) => response.data?.data

export const mediaApi = {
  upload: (file, purpose) => {
    const form = new FormData()
    form.append('purpose', purpose)
    form.append('file', file)
    return apiClient.post('/media/uploads', form, {
      // Override the JSON default used by apiClient. Axios/browser will add the
      // multipart boundary required by multer on the backend.
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(dataOf)
  },
  remove: (id) => apiClient.delete(`/media/uploads/${id}`).then(dataOf),
}
