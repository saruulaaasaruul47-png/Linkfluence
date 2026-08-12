export function normalizeUsername(value = '') {
  const clean = value.trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9._-]/g, '')
  return clean ? `@${clean}` : ''
}

// Only guards against picking the same username for both channels in the same onboarding session
// before either is saved — real uniqueness is enforced server-side when the profile is created.
export function isUsernameTaken(value, type) {
  const username = normalizeUsername(value)
  if (!username) return false

  try {
    const account = JSON.parse(window.localStorage.getItem('vyra:account'))
    return ['creator', 'business']
      .filter((channel) => channel !== type)
      .some((channel) => normalizeUsername(account?.[channel]?.username) === username)
  } catch {
    return false
  }
}
