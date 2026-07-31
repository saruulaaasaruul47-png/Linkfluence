import { useCallback, useState } from 'react'
import { parseAuthError } from '../api/authError'
import { creatorApi } from '../api/creator.api'
import { resolveMediaUrl } from '../api/mediaUrl'
import { useAuth } from '../context/auth-context'

const normalize = (profile) => profile ? {
  ...profile,
  avatar: resolveMediaUrl(profile.avatar || profile.avatarUrl),
  avatarUrl: resolveMediaUrl(profile.avatarUrl || profile.avatar),
  cover: resolveMediaUrl(profile.cover || profile.coverUrl),
  coverUrl: resolveMediaUrl(profile.coverUrl || profile.cover),
} : profile

export function useCreator() {
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
    getProfile: () => run(creatorApi.getProfile),
    createProfile: (payload) => run(() => creatorApi.createProfile(payload)),
    updateProfile: (payload) => run(() => creatorApi.updateProfile(payload)),
    deleteProfile: () => run(creatorApi.deleteProfile),
  }
}
