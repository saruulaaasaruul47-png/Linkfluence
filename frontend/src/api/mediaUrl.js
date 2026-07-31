import { API_BASE_URL } from './axiosClient'

export function resolveMediaUrl(value) {
  if (!value || /^(data:|blob:|https?:\/\/)/i.test(value)) return value || ''
  try {
    return new URL(value, new URL(API_BASE_URL, window.location.origin).origin).href
  } catch {
    return value
  }
}
