import { useCallback, useState } from 'react'
import { parseAuthError } from '../api/authError'
import { businessApi } from '../api/business.api'
import { resolveMediaUrl } from '../api/mediaUrl'
import { useAuth } from '../context/auth-context'

const normalize = (profile) => profile ? {
  ...profile,
  logo: resolveMediaUrl(profile.logo || profile.logoUrl),
  logoUrl: resolveMediaUrl(profile.logoUrl || profile.logo),
  cover: resolveMediaUrl(profile.cover || profile.coverUrl),
  coverUrl: resolveMediaUrl(profile.coverUrl || profile.cover),
} : profile

export function useBusiness() {
  const { syncUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const run = useCallback(async (action) => {
    setLoading(true); setError(null)
    try {
      const result = await action()
      if (result?.user) syncUser(result.user)
      return result?.profile ? { ...result, profile: normalize(result.profile) } : result
    } catch (reason) {
      const parsed = parseAuthError(reason)
      setError(parsed)
      throw parsed
    } finally { setLoading(false) }
  }, [syncUser])
  return {
    loading, error, clearError: () => setError(null),
    getProfile: () => run(businessApi.getProfile),
    createProfile: (payload) => run(() => businessApi.createProfile(payload)),
    updateProfile: (payload) => run(() => businessApi.updateProfile(payload)),
    deleteProfile: () => run(businessApi.deleteProfile),
  }
}
