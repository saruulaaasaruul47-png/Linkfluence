import { useCallback, useEffect, useState } from 'react'
import { authApi } from '../api/auth.api'
import { parseAuthError } from '../api/authError'
import { resolveMediaUrl } from '../api/mediaUrl'
import { tokenStore } from '../api/tokenStore'
import { AuthContext } from './auth-context'

let restorePromise = null

function normalizeUser(user) {
  if (!user) return null
  const serverRoles = (user.roles || []).map((role) => role.toLowerCase())
  return {
    ...user,
    avatarUrl: resolveMediaUrl(user.avatarUrl),
    name: user.displayName || user.name || user.email?.split('@')[0] || 'Influence Hub user',
    roles: [...new Set(serverRoles)],
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    return tokenStore.subscribe(setAccessToken)
  }, [])

  const resetAuth = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    setAuthError(null)
  }, [])

  useEffect(() => {
    const expired = () => {
      resetAuth()
    }
    window.addEventListener('vyra:auth-expired', expired)
    return () => {
      window.removeEventListener('vyra:auth-expired', expired)
    }
  }, [resetAuth])

  const loadCurrentUser = useCallback(async () => {
    const result = await authApi.getCurrentUser()
    const nextUser = normalizeUser(result.user)
    setUser(nextUser)
    return nextUser
  }, [])

  const syncUser = useCallback((nextUser) => {
    const normalized = normalizeUser(nextUser)
    setUser(normalized)
    return normalized
  }, [])

  const refreshSession = useCallback(async () => {
    if (!restorePromise) {
      restorePromise = (async () => {
        const refreshed = await authApi.refreshAccessToken()
        tokenStore.set(refreshed.accessToken)
        const current = await authApi.getCurrentUser()
        return normalizeUser(current.user)
      })().finally(() => {
        restorePromise = null
      })
    }
    const nextUser = await restorePromise
    setUser(nextUser)
    return nextUser
  }, [])

  useEffect(() => {
    let active = true
    async function restore() {
      try {
        await refreshSession()
      } catch {
        if (active) resetAuth()
      } finally {
        if (active) setIsInitializing(false)
      }
    }
    restore()
    return () => {
      active = false
    }
  }, [refreshSession, resetAuth])

  const runAuthAction = async (action) => {
    setIsLoading(true)
    setAuthError(null)
    try {
      return await action()
    } catch (error) {
      const parsed = parseAuthError(error)
      setAuthError(parsed)
      throw parsed
    } finally {
      setIsLoading(false)
    }
  }

  const register = (payload) => runAuthAction(() => authApi.register(payload))

  const verifyEmail = (payload) => runAuthAction(async () => {
    const result = await authApi.verifyEmail(payload)
    tokenStore.set(result.accessToken)
    const nextUser = normalizeUser(result.user)
    setUser(nextUser)
    return nextUser
  })

  const resendOtp = (payload) => runAuthAction(() => authApi.resendOtp(payload))

  const login = (payload) => runAuthAction(async () => {
    const result = await authApi.login(payload)
    tokenStore.set(result.accessToken)
    const nextUser = normalizeUser(result.user)
    setUser(nextUser)
    return nextUser
  })

  const logout = async () => {
    setIsLoading(true)
    try {
      await authApi.logout()
    } catch {
      // Local authentication state must still be cleared when the API is unavailable.
    } finally {
      resetAuth()
      setIsLoading(false)
    }
  }

  const session = user ? { user, roles: user.roles } : null
  const value = {
    user,
    accessToken,
    session,
    isAuthenticated: Boolean(user && accessToken),
    isInitializing,
    isLoading,
    authError,
    register,
    verifyEmail,
    resendOtp,
    login,
    logout,
    signIn: login,
    signOut: logout,
    refreshSession,
    loadCurrentUser,
    syncUser,
    clearSession: resetAuth,
    clearAuthError: () => setAuthError(null),
    hasRole: (role) => role === 'viewer' ? Boolean(user) : Boolean(user?.roles?.includes(role)),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
