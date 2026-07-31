import { businesses, creators } from '../data/marketplace'

export function normalizeUsername(value = '') {
  const clean = value.trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9._-]/g, '')
  return clean ? `@${clean}` : ''
}

export function isUsernameTaken(value, type) {
  const username = normalizeUsername(value)
  if (!username) return false

  const fixtures = type === 'creator' ? creators : businesses
  if (fixtures.some((item) => normalizeUsername(item.username) === username)) return true

  try {
    const account = JSON.parse(window.localStorage.getItem('vyra:account'))
    return ['creator', 'business']
      .filter((channel) => channel !== type)
      .some((channel) => normalizeUsername(account?.[channel]?.username) === username)
  } catch {
    return false
  }
}
