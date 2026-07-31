import { useCallback, useState } from 'react'
import { parseAuthError } from '../api/authError'
import { resolveMediaUrl } from '../api/mediaUrl'
import { userApi } from '../api/user.api'
import { useAuth } from '../context/auth-context'

function normalize(user) {
  return user ? { ...user, avatarUrl: resolveMediaUrl(user.avatarUrl), avatar: resolveMediaUrl(user.avatarUrl) } : user
}

export function useUser() {
  const { syncUser, clearSession } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = useCallback(async (action, sync = true) => {
    setLoading(true)
    setError(null)
    try {
      const result = await action()
      if (result?.user && sync) syncUser(normalize(result.user))
      return result?.user ? { ...result, user: normalize(result.user) } : result
    } catch (reason) {
      const parsed = parseAuthError(reason)
      setError(parsed)
      throw parsed
    } finally {
      setLoading(false)
    }
  }, [syncUser])

  return {
    loading,
    error,
    clearError: () => setError(null),
    getMe: () => run(userApi.getMe),
    updateMe: (payload) => run(() => userApi.updateMe(payload)),
    uploadAvatar: (file) => run(() => userApi.uploadAvatar(file)),
    changePassword: (payload) => run(() => userApi.changePassword(payload), false),
    deleteMe: async () => {
      const result = await run(userApi.deleteMe, false)
      clearSession()
      return result
    },
  }
}
