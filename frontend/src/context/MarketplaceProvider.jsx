import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Bookmark, FolderPlus, LockKeyhole, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { businessApi } from '../api/business.api'
import { creatorApi } from '../api/creator.api'
import { collectionsApi, libraryApi } from '../api/library.api'
import { resolveMediaUrl } from '../api/mediaUrl'
import { userApi } from '../api/user.api'
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
  const [saved, setSaved] = usePersistentState('vyra:saved', [])
  const [following, setFollowing] = usePersistentState('vyra:following', [])
  const [collectionState, setCollectionState] = usePersistentState('vyra:collections', [])
  const [recent, setRecent] = usePersistentState('vyra:recent', [])
  const [account, setAccount] = useState(emptyAccount)
  const [accountOwnerId, setAccountOwnerId] = useState(null)
  const [libraryOwnerId, setLibraryOwnerId] = useState(null)
  const accountLoadVersion = useRef(0)
  const libraryLoadVersion = useRef(0)
  const [restricted, setRestricted] = useState(null)
  const [collectionItem, setCollectionItem] = useState(null)
  const [newCollection, setNewCollection] = useState('')
  const { session } = useAuth()
  const sessionUser = session?.user
  const sessionUserId = sessionUser?.id || null
  const activeUserIdRef = useRef(sessionUserId)
  useEffect(() => {
    activeUserIdRef.current = sessionUserId
  }, [sessionUserId])
  const { toast } = useToast()
  const navigate = useNavigate()
  const collections = collectionState.map(normalizeCollection)
  const setCollections = (update) => setCollectionState((current) => {
    const next = typeof update === 'function' ? update(current.map(normalizeCollection)) : update
    return next.map(normalizeCollection)
  })
  useEffect(() => {
    const loadVersion = ++accountLoadVersion.current
    let active = true
    if (!sessionUser) {
      Promise.resolve().then(() => {
        if (active && loadVersion === accountLoadVersion.current) {
          setAccount(emptyAccount)
          setAccountOwnerId(null)
        }
      })
      return () => { active = false }
    }
    Promise.allSettled([
      userApi.getMe(),
      sessionUser.roles?.includes('creator') ? creatorApi.getProfile() : Promise.resolve(null),
      sessionUser.roles?.includes('business') ? businessApi.getProfile() : Promise.resolve(null),
    ]).then(([userResult, creatorResult, businessResult]) => {
      if (!active || loadVersion !== accountLoadVersion.current) return
      setAccount({
        viewer: userResult.status === 'fulfilled'
          ? {
              ...emptyAccount.viewer,
              ...userResult.value.user,
              name: userResult.value.user.displayName,
              avatar: resolveMediaUrl(userResult.value.user.avatarUrl),
            }
          : {
              ...emptyAccount.viewer,
              name: sessionUser.displayName || sessionUser.name || '',
              email: sessionUser.email || '',
              username: sessionUser.username || '',
              avatar: resolveMediaUrl(sessionUser.avatarUrl),
            },
        creator: creatorResult.status === 'fulfilled' && creatorResult.value
          ? {
              ...emptyAccount.creator,
              ...creatorResult.value.profile,
              avatar: resolveMediaUrl(creatorResult.value.profile.avatar || creatorResult.value.profile.avatarUrl),
              cover: resolveMediaUrl(creatorResult.value.profile.cover || creatorResult.value.profile.coverUrl),
            }
          : emptyAccount.creator,
        business: businessResult.status === 'fulfilled' && businessResult.value
          ? {
              ...emptyAccount.business,
              ...businessResult.value.profile,
              logo: resolveMediaUrl(businessResult.value.profile.logo || businessResult.value.profile.logoUrl),
              cover: resolveMediaUrl(businessResult.value.profile.cover || businessResult.value.profile.coverUrl),
            }
          : emptyAccount.business,
      })
      setAccountOwnerId(sessionUser.id)
    })
    return () => {
      active = false
      if (loadVersion === accountLoadVersion.current) accountLoadVersion.current += 1
    }
  }, [sessionUser])

  useEffect(() => {
    const loadVersion = ++libraryLoadVersion.current
    let active = true
    queueMicrotask(() => {
      if (!active || loadVersion !== libraryLoadVersion.current) return
      setCollectionItem(null)
      setNewCollection('')
      setRestricted(null)
    })
    if (!sessionUser) {
      Promise.resolve().then(() => {
        if (active && loadVersion === libraryLoadVersion.current) setLibraryOwnerId(null)
      })
      return () => { active = false }
    }
    Promise.all([libraryApi.state(), collectionsApi.list()])
      .then(([library, collectionResult]) => {
        if (!active || loadVersion !== libraryLoadVersion.current) return
        setSaved(library.saved || [])
        setFollowing(library.following || [])
        setRecent(library.recent || [])
        setCollectionState((collectionResult.collections || []).map(normalizeCollection))
        setLibraryOwnerId(sessionUser.id)
      })
      .catch(() => {
        if (active && loadVersion === libraryLoadVersion.current) {
          setSaved([])
          setFollowing([])
          setRecent([])
          setCollectionState([])
          setLibraryOwnerId(sessionUser.id)
          toast('Your saved library could not be synchronized.', { type: 'error' })
        }
      })
    return () => {
      active = false
      if (loadVersion === libraryLoadVersion.current) libraryLoadVersion.current += 1
    }
  }, [sessionUser, setCollectionState, setFollowing, setRecent, setSaved, toast])

  const libraryReady = Boolean(sessionUserId && libraryOwnerId === sessionUserId)
  const visibleSaved = libraryReady ? saved : []
  const visibleFollowing = libraryReady ? following : []
  const visibleRecent = libraryReady ? recent : []
  const visibleCollections = libraryReady ? collections : []

  const toggleSaved = (key) => {
    if (!sessionUser) {
      navigate('/login', { state: { from: window.location.pathname } })
      return
    }
    const wasSaved = visibleSaved.includes(key)
    const requestUserId = sessionUserId
    if (!wasSaved) {
      setCollectionItem(key)
      return
    }
    setSaved((items) => items.filter((item) => item !== key))
    const request = libraryApi.unsave(key)
    request.catch(() => {
      if (requestUserId !== activeUserIdRef.current) return
      setSaved((items) => [...new Set([...items, key])])
      toast('Saved items could not be updated.', { type: 'error' })
    })
  }
  const toggleFollowing = (key) => {
    if (!sessionUser) {
      navigate('/login', { state: { from: window.location.pathname } })
      return
    }
    const wasFollowing = visibleFollowing.includes(key)
    const requestUserId = sessionUserId
    setFollowing((items) => wasFollowing ? items.filter((item) => item !== key) : [...items, key])
    const request = wasFollowing ? libraryApi.unfollow(key) : libraryApi.follow(key)
    request.catch(() => {
      if (requestUserId !== activeUserIdRef.current) return
      setFollowing((items) => wasFollowing
        ? [...new Set([...items, key])]
        : items.filter((item) => item !== key))
      toast('Following could not be updated.', { type: 'error' })
    })
  }
  const markViewed = (key) => {
    const isNew = !visibleRecent.includes(key)
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
  const ensureSaved = async (key) => {
    if (!key || visibleSaved.includes(key)) return true
    const requestUserId = sessionUserId
    setSaved((items) => [...new Set([...items, key])])
    try {
      await libraryApi.save(key)
      return requestUserId === activeUserIdRef.current
    } catch {
      if (requestUserId !== activeUserIdRef.current) return false
      setSaved((items) => items.filter((item) => item !== key))
      toast('This item could not be saved.', { type: 'error' })
      return false
    }
  }
  const saveWithoutCollection = async () => {
    if (!collectionItem) return
    const didSave = await ensureSaved(collectionItem)
    if (!didSave) return
    setCollectionItem(null)
    toast('Saved without a folder.', { type: 'success' })
  }
  const addToCollection = async (collectionId) => {
    if (!collectionItem) return
    const target = visibleCollections.find((collection) => collection.id === collectionId)
    const added = Boolean(target && !target.items.includes(collectionItem))
    if (!added) {
      toast('This item is already in the collection.', { type: 'info' })
      setCollectionItem(null)
      return
    }
    const didSave = await ensureSaved(collectionItem)
    if (!didSave) return
    if (sessionUser) {
      const requestUserId = sessionUserId
      try {
        const result = await collectionsApi.addItem(collectionId, collectionItem)
        if (requestUserId !== activeUserIdRef.current) return
        setCollections((items) => items.map((collection) => collection.id === collectionId ? normalizeCollection(result.collection) : collection))
        toast('Added to collection.', { type: 'success' })
      } catch {
        if (requestUserId !== activeUserIdRef.current) return
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
    if (collectionItem) {
      const didSave = await ensureSaved(collectionItem)
      if (!didSave) return
    }
    if (sessionUser) {
      const requestUserId = sessionUserId
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
        if (requestUserId !== activeUserIdRef.current) return
        setCollections((items) => [collection, ...items])
      } catch {
        if (requestUserId !== activeUserIdRef.current) return
        toast('Collection could not be created.', { type: 'error' })
        return
      }
    } else {
      const id = `${newCollection.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-local`
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
    const requestUserId = sessionUserId
    try {
      const result = await collectionsApi.update(id, {
        ...details,
        coverUrl: details.cover,
        cover: undefined,
      })
      if (requestUserId !== activeUserIdRef.current) return
      setCollections((items) => items.map((collection) => collection.id === id ? normalizeCollection(result.collection) : collection))
    } catch {
      if (requestUserId !== activeUserIdRef.current) return
      toast('Collection could not be updated.', { type: 'error' })
    }
  }
  const deleteCollection = async (id) => {
    const requestUserId = sessionUserId
    if (sessionUser) {
      try { await collectionsApi.remove(id) } catch {
        if (requestUserId !== activeUserIdRef.current) return
        toast('Collection could not be deleted.', { type: 'error' })
        return
      }
    }
    if (requestUserId !== activeUserIdRef.current) return
    setCollections((items) => items.filter((collection) => collection.id !== id))
  }
  const removeCollectionItem = async (id, itemKey) => {
    const requestUserId = sessionUserId
    if (sessionUser) {
      try {
        const result = await collectionsApi.removeItem(id, itemKey)
        if (requestUserId !== activeUserIdRef.current) return
        setCollections((items) => items.map((collection) => collection.id === id ? normalizeCollection(result.collection) : collection))
        return
      } catch {
        if (requestUserId !== activeUserIdRef.current) return
        toast('Collection item could not be removed.', { type: 'error' })
        return
      }
    }
    setCollections((items) => items.map((collection) => collection.id === id ? { ...collection, items: collection.items.filter((item) => item !== itemKey) } : collection))
  }
  const updateAccount = useCallback((type, details) => {
    setAccount((current) => ({ ...current, [type]: { ...current[type], ...details } }))
    setAccountOwnerId(sessionUserId)
  }, [sessionUserId])

  const openCollection = (key) => {
    if (!sessionUser) {
      navigate('/login', { state: { from: window.location.pathname } })
      return
    }
    setCollectionItem(key)
  }
  const collectionItemIsSaved = Boolean(collectionItem && visibleSaved.includes(collectionItem))
  const value = {
    saved: visibleSaved,
    following: visibleFollowing,
    collections: visibleCollections,
    recent: visibleRecent,
    account: sessionUserId && accountOwnerId === sessionUserId ? account : emptyAccount,
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
    <Dialog dark open={collectionItem !== null} onClose={() => setCollectionItem(null)} title={collectionItem ? 'Save item' : 'Create a folder'} description={collectionItem ? 'Keep it in Saved, with or without organizing it into a folder.' : 'Create a private folder inside your Saved library.'}>
      {collectionItem && <Button className="w-full" variant={collectionItemIsSaved ? 'secondary' : 'mint'} onClick={saveWithoutCollection}><Bookmark size={15} fill={collectionItemIsSaved ? 'currentColor' : 'none'} />{collectionItemIsSaved ? 'Keep in Saved only' : 'Save without a folder'}</Button>}
      {collectionItem && visibleCollections.length > 0 && <p className="my-4 text-center text-[10px] font-bold uppercase tracking-[.13em] text-white/30">Or choose a folder</p>}
      {collectionItem && <div className="max-h-56 space-y-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{visibleCollections.map((collection) => <button key={collection.id} onClick={() => addToCollection(collection.id)} className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] p-3 text-left transition hover:border-pink/30 hover:bg-[var(--surface-2)]"><img src={collection.cover} alt="" className="size-10 rounded-lg object-cover" /><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{collection.name}</strong><small className="text-[10px] text-[var(--subtle)]">{collection.count} items</small></span><Plus size={15} /></button>)}</div>}
      <div className={`${collectionItem ? 'mt-5 border-t border-[var(--border)] pt-5' : ''}`}><Input label="New folder" placeholder="Folder name" value={newCollection} onChange={(event) => setNewCollection(event.target.value)} /><Button className="mt-3 w-full" variant="pink" disabled={!newCollection.trim()} onClick={createCollection}><FolderPlus size={15} /> Create{collectionItem ? ' and save' : ''}</Button></div>
    </Dialog>
  </MarketplaceContext.Provider>
}
