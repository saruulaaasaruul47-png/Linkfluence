let accessToken = null
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener(accessToken))
}

export const tokenStore = {
  get() {
    return accessToken
  },
  set(token) {
    accessToken = token || null
    emit()
  },
  clear() {
    accessToken = null
    emit()
  },
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
