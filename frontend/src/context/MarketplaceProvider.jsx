import { useEffect, useState } from 'react'
import { ArrowRight, FolderPlus, LockKeyhole, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { businessApi } from '../api/business.api'
import { creatorApi } from '../api/creator.api'
import { collectionsApi, libraryApi } from '../api/library.api'
import { resolveMediaUrl } from '../api/mediaUrl'
import { userApi } from '../api/user.api'
import { initialCollections } from '../data/marketplace'
import { Button, Dialog, Input, useToast } from '../components/ui'
import { MarketplaceContext } from './marketplace-context'
import { useAuth } from './auth-context'

const emptyAccount = {
  viewer: { name: '', email: '', username: '', phone: '', location: '', bio: '', avatar: '' },
  creator: { name: '', username: '', niche: '', location: '', bio: '', instagram: '', facebook: '', tiktok: '', rate: '', availability: '', avatar: '', cover: '' },
  business: { name: '', username: '', industry: '', website: '', location: '', description: '', companySize: '', contactEmail: '', logo: '', cover: '' },
}

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* Storage may be unavailable. */ }
  }, [key, value])
  return [value, setValue]
}

function normalizeCollection(collection) {
  const items = Array.isArray(collection.items)
    ? [...new Set(collection.items.map((item) => typeof item === 'string' ? item : item?.key).filter(Boolean))]
    : []
  return {
    ...collection,
    cover: collection.cover || collection.coverUrl || 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85',
    items,
    count: items.length,
    visibility: collection.visibility || 'private',
  }
}

export function MarketplaceProvider({ children }) {
  const [saved, setSaved] = usePersistentState('vyra:saved', ['creator:amara-b', 'showcase:open-road', 'business:gobi-cashmere'])
  const [following, setFollowing] = usePersistentState('vyra:following', ['creator:nara-eats', 'business:lhamour'])
  const [collectionState, setCollectionState] = usePersistentState('vyra:collections', initialCollections.map(normalizeCollection))
  const [recent, setRecent] = usePersistentState('vyra:recent', ['creator:temuulen-film', 'business:gobi-cashmere', 'showcase:second-skin'])
  const [account, setAccount] = useState(emptyAccount)
  const [restricted, setRestricted] = useState(null)
  const [collectionItem, setCollectionItem] = useState(null)
  const [newCollection, setNewCollection] = useState('')
  const { session } = useAuth()
  const sessionUser = session?.user
  const { toast } = useToast()
  const navigate = useNavigate()
  const collections = collectionState.map(normalizeCollection)
  const setCollections = (update) => setCollectionState((current) => {
    const next = typeof update === 'function' ? update(current.map(normalizeCollection)) : update
    return next.map(normalizeCollection)
  })
  useEffect(() => {
    let active = true
    if (!sessionUser) {
      Promise.resolve().then(() => {
        if (active) setAccount(emptyAccount)
      })
      return () => { active = false }
    }
    Promise.allSettled([
      userApi.getMe(),
      sessionUser.roles?.includes('creator') ? creatorApi.getProfile() : Promise.resolve(null),
      sessionUser.roles?.includes('business') ? businessApi.getProfile() : Promise.resolve(null),
    ]).then(([userResult, creatorResult, businessResult]) => {
      if (!active) return
      setAccount((current) => ({
        ...current,
        viewer: userResult.status === 'fulfilled'
          ? {
              ...current.viewer,
              ...userResult.value.user,
              name: userResult.value.user.displayName,
              avatar: resolveMediaUrl(userResult.value.user.avatarUrl),
            }
          : current.viewer,
        creator: creatorResult.status === 'fulfilled' && creatorResult.value
          ? {
              ...current.creator,
              ...creatorResult.value.profile,
              avatar: resolveMediaUrl(creatorResult.value.profile.avatar || creatorResult.value.profile.avatarUrl),
              cover: resolveMediaUrl(creatorResult.value.profile.cover || creatorResult.value.profile.coverUrl),
            }
          : emptyAccount.creator,
        business: businessResult.status === 'fulfilled' && businessResult.value
          ? {
              ...current.business,
              ...businessResult.value.profile,
              logo: resolveMediaUrl(businessResult.value.profile.logo || businessResult.value.profile.logoUrl),
              cover: resolveMediaUrl(businessResult.value.profile.cover || businessResult.value.profile.coverUrl),
            }
          : emptyAccount.business,
      }))
    })
    return () => { active = false }
  }, [sessionUser])

  useEffect(() => {
    let active = true
    if (!sessionUser) return () => { active = false }
    Promise.all([libraryApi.state(), collectionsApi.list()])
      .then(([library, collectionResult]) => {
        if (!active) return
        setSaved(library.saved || [])
        setFollowing(library.following || [])
        setRecent(library.recent || [])
        setCollectionState((collectionResult.collections || []).map(normalizeCollection))
      })
      .catch(() => {
        if (active) toast('Your saved library could not be synchronized.', { type: 'error' })
      })
    return () => { active = false }
  }, [sessionUser, setCollectionState, setFollowing, setRecent, setSaved, toast])

  const toggleSaved = (key) => {
    if (!sessionUser) {
      navigate('/login', { state: { from: window.location.pathname } })
      return
    }
    const wasSaved = saved.includes(key)
    setSaved((items) => wasSaved ? items.filter((item) => item !== key) : [...items, key])
    const request = wasSaved ? libraryApi.unsave(key) : libraryApi.save(key)
    request.catch(() => {
      setSaved((items) => wasSaved
        ? [...new Set([...items, key])]
        : items.filter((item) => item !== key))
      toast('Saved items could not be updated.', { type: 'error' })
    })
  }
  const toggleFollowing = (key) => {
    if (!sessionUser) {
      navigate('/login', { state: { from: window.location.pathname } })
      return
    }
    const wasFollowing = following.includes(key)
    setFollowing((items) => wasFollowing ? items.filter((item) => item !== key) : [...items, key])
    const request = wasFollowing ? libraryApi.unfollow(key) : libraryApi.follow(key)
    request.catch(() => {
      setFollowing((items) => wasFollowing
        ? [...new Set([...items, key])]
        : items.filter((item) => item !== key))
      toast('Following could not be updated.', { type: 'error' })
    })
  }
  const markViewed = (key) => {
    const isNew = !recent.includes(key)
    setRecent((items) => [key, ...items.filter((item) => item !== key)].slice(0, 8))
    if (sessionUser && isNew) libraryApi.recent(key).catch(() => {})
  }
  const share = async (label, url = window.location.href, key = null) => {
    try {
      await navigator.clipboard.writeText(url)
      toast(`${label} link copied.`, { type: 'success' })
      if (sessionUser && key) libraryApi.share(key).catch(() => {})
    } catch {
      toast('Could not copy the link. Copy it from the address bar.', { type: 'error' })
    }
  }
  const addToCollection = async (collectionId) => {
    if (!collectionItem) return
    const target = collections.find((collection) => collection.id === collectionId)
    const added = Boolean(target && !target.items.includes(collectionItem))
    if (!added) {
      toast('This item is already in the collection.', { type: 'info' })
      setCollectionItem(null)
      return
    }
    if (sessionUser) {
      try {
        const result = await collectionsApi.addItem(collectionId, collectionItem)
        setCollections((items) => items.map((collection) => collection.id === collectionId ? normalizeCollection(result.collection) : collection))
        toast('Added to collection.', { type: 'success' })
      } catch {
        toast('The item could not be added to this collection.', { type: 'error' })
        return
      }
    } else {
      setCollections((items) => items.map((collection) => collection.id === collectionId ? { ...collection, items: [...collection.items, collectionItem] } : collection))
      toast('Added to collection.', { type: 'success' })
    }
    setCollectionItem(null)
  }
  const createCollection = async () => {
    if (!newCollection.trim()) return
    if (sessionUser) {
      try {
        const result = await collectionsApi.create({
          name: newCollection.trim(),
          description: 'A private collection curated by you.',
          visibility: 'private',
        })
        let collection = normalizeCollection(result.collection)
        if (collectionItem) {
          const withItem = await collectionsApi.addItem(collection.id, collectionItem)
          collection = normalizeCollection(withItem.collection)
        }
        setCollections((items) => [collection, ...items])
      } catch {
        toast('Collection could not be created.', { type: 'error' })
        return
      }
    } else {
      const id = `${newCollection.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
      setCollections((items) => [{ id, name: newCollection.trim(), description: 'A private collection curated by you.', cover: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85', items: collectionItem ? [collectionItem] : [], visibility: 'private' }, ...items])
    }
    setNewCollection('')
    setCollectionItem(null)
    toast('Collection created.', { type: 'success' })
  }
  const updateCollection = async (id, details) => {
    if (!sessionUser) {
      setCollections((items) => items.map((collection) => collection.id === id ? { ...collection, ...details } : collection))
      return
    }
    try {
      const result = await collectionsApi.update(id, {
        ...details,
        coverUrl: details.cover,
        cover: undefined,
      })
      setCollections((items) => items.map((collection) => collection.id === id ? normalizeCollection(result.collection) : collection))
    } catch {
      toast('Collection could not be updated.', { type: 'error' })
    }
  }
  const deleteCollection = async (id) => {
    if (sessionUser) {
      try { await collectionsApi.remove(id) } catch {
        toast('Collection could not be deleted.', { type: 'error' })
        return
      }
    }
    setCollections((items) => items.filter((collection) => collection.id !== id))
  }
  const removeCollectionItem = async (id, itemKey) => {
    if (sessionUser) {
      try {
        const result = await collectionsApi.removeItem(id, itemKey)
        setCollections((items) => items.map((collection) => collection.id === id ? normalizeCollection(result.collection) : collection))
        return
      } catch {
        toast('Collection item could not be removed.', { type: 'error' })
        return
      }
    }
    setCollections((items) => items.map((collection) => collection.id === id ? { ...collection, items: collection.items.filter((item) => item !== itemKey) } : collection))
  }
  const updateAccount = (type, details) => setAccount((current) => ({ ...current, [type]: { ...current[type], ...details } }))

  const openCollection = (key) => {
    if (!sessionUser) {
      navigate('/login', { state: { from: window.location.pathname } })
      return
    }
    setCollectionItem(key)
  }
  const value = {
    saved: sessionUser ? saved : [],
    following: sessionUser ? following : [],
    collections: sessionUser ? collections : [],
    recent: sessionUser ? recent : [],
    account,
    updateAccount,
    toggleSaved,
    toggleFollowing,
    markViewed,
    share,
    requestChannel:setRestricted,
    openCollection,
    createEmptyCollection:() => openCollection(''),
    setCollections,
    updateCollection,
    deleteCollection,
    removeCollectionItem,
  }

  return <MarketplaceContext.Provider value={value}>{children}
    <Dialog dark open={Boolean(restricted)} onClose={() => setRestricted(null)} title="Create a Creator or Business Channel to unlock this feature." description={`${restricted || 'This action'} is unavailable in Viewer mode.`}>
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><span className="grid size-11 place-items-center rounded-full bg-pink text-black"><LockKeyhole size={18} /></span><p className="mt-4 text-sm leading-6 text-[var(--subtle)]">A channel builds trust, keeps collaborations organized and gives the other party enough context to respond.</p></div><div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setRestricted(null)}>Maybe later</Button><Button variant="pink" onClick={() => { setRestricted(null); navigate('/welcome') }}>Create channel <ArrowRight size={16} /></Button></div>
    </Dialog>
    <Dialog dark open={collectionItem !== null} onClose={() => setCollectionItem(null)} title="Save to collection" description="Organize references, partners and campaign ideas in one place.">
      <div className="max-h-56 space-y-2 overflow-y-auto">{collections.map((collection) => <button key={collection.id} onClick={() => addToCollection(collection.id)} className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] p-3 text-left hover:bg-[var(--surface-2)]"><img src={collection.cover} alt="" className="size-11 rounded-lg object-cover" /><span className="flex-1"><strong className="block text-sm">{collection.name}</strong><small className="text-[var(--subtle)]">{collection.count} items</small></span><Plus size={16} /></button>)}</div>
      <div className="mt-5 border-t border-[var(--border)] pt-5"><Input label="New collection" placeholder="Collection name" value={newCollection} onChange={(event) => setNewCollection(event.target.value)} /><Button className="mt-3 w-full" variant="pink" onClick={createCollection}><FolderPlus size={16} /> Create collection</Button></div>
    </Dialog>
  </MarketplaceContext.Provider>
}
