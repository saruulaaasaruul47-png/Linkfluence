import { useCallback, useEffect, useRef, useState } from 'react'
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
  const authVersion = useRef(0)
  const pendingActions = useRef(0)

  useEffect(() => {
    return tokenStore.subscribe(setAccessToken)
  }, [])

  const resetAuth = useCallback(() => {
    authVersion.current += 1
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
    const version = authVersion.current
    const result = await authApi.getCurrentUser()
    const nextUser = normalizeUser(result.user)
    if (version === authVersion.current) setUser(nextUser)
    return nextUser
  }, [])

  const syncUser = useCallback((nextUser) => {
    const normalized = normalizeUser(nextUser)
    setUser(normalized)
    return normalized
  }, [])

  const refreshSession = useCallback(async () => {
    const version = authVersion.current
    if (!restorePromise) {
      restorePromise = authApi.refreshAccessToken().finally(() => {
        restorePromise = null
      })
    }
    const refreshed = await restorePromise
    // Use this restore attempt's token explicitly. This prevents /auth/me from
    // producing a guaranteed 401 while also keeping a stale restore from
    // replacing the token of a newer login that completed in parallel.
    const current = await authApi.getCurrentUser(refreshed.accessToken)
    if (version !== authVersion.current) return null

    const restoredUser = normalizeUser(current.user)
    tokenStore.set(refreshed.accessToken)
    setUser(restoredUser)
    return restoredUser
  }, [])

  useEffect(() => {
    let active = true
    const version = authVersion.current
    async function restore() {
      try {
        await refreshSession()
      } catch {
        if (active && version === authVersion.current) resetAuth()
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
    pendingActions.current += 1
    setIsLoading(true)
    setAuthError(null)
    try {
      return await action()
    } catch (error) {
      const parsed = parseAuthError(error)
      setAuthError(parsed)
      throw parsed
    } finally {
      pendingActions.current = Math.max(0, pendingActions.current - 1)
      if (pendingActions.current === 0) setIsLoading(false)
    }
  }

  const register = (payload) => runAuthAction(() => authApi.register(payload))

  const verifyEmail = (payload) => runAuthAction(async () => {
    const version = ++authVersion.current
    const result = await authApi.verifyEmail(payload)
    if (version !== authVersion.current) return null
    tokenStore.set(result.accessToken)
    const nextUser = normalizeUser(result.user)
    setUser(nextUser)
    setIsInitializing(false)
    return nextUser
  })

  const resendOtp = (payload) => runAuthAction(() => authApi.resendOtp(payload))

  const login = (payload) => runAuthAction(async () => {
    const version = ++authVersion.current
    const result = await authApi.login(payload)
    if (version !== authVersion.current) return null
    tokenStore.set(result.accessToken)
    const nextUser = normalizeUser(result.user)
    setUser(nextUser)
    setIsInitializing(false)
    return nextUser
  })

  const loginWithGoogle = (credential) => runAuthAction(async () => {
    const version = ++authVersion.current
    const result = await authApi.googleLogin(credential)
    if (version !== authVersion.current) return null
    tokenStore.set(result.accessToken)
    const nextUser = normalizeUser(result.user)
    setUser(nextUser)
    setIsInitializing(false)
    return nextUser
  })

  const logout = async () => {
    pendingActions.current += 1
    setIsLoading(true)
    resetAuth()
    try {
      await authApi.logout()
    } catch {
      // Local authentication state must still be cleared when the API is unavailable.
    } finally {
      pendingActions.current = Math.max(0, pendingActions.current - 1)
      if (pendingActions.current === 0) setIsLoading(false)
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
    loginWithGoogle,
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
