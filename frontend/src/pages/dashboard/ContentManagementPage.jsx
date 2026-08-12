import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Archive, Clock3, FileVideo2, ImagePlus, Move, Music2, Plus, Repeat2, Send, Trash2 } from 'lucide-react'
import { contentApi } from '../../api/content.api'
import { mediaApi } from '../../api/media.api'
import { resolveMediaUrl } from '../../api/mediaUrl'
import { Button, Dialog, EmptyState, FileUpload, Input, Select, Textarea, useToast } from '../../components/ui'
import { DashboardHeader, DashboardPage, DashboardPanel } from '../../components/dashboard/DashboardUI'
import { defaultStoryStyle, storyBackgrounds, storyBackgroundValue, storyFontSize } from '../../lib/storyStyle'
import { StoryViewer } from '../../components/content/StoryViewer'

const emptyStoryAudio = { title: '', artist: '', startMs: 0, volume: 0.7, rightsConfirmed: false }
const emptyDraft = { title: '', caption: '', category: 'Lifestyle', visibility: 'PUBLIC', postType: 'POST', storyStyle: defaultStoryStyle, storyAudio: emptyStoryAudio, paidPartnership: false, campaignId: '', partnerId: '' }
const categories = ['Beauty', 'Fashion', 'Food', 'Travel', 'Sports', 'Technology', 'Gaming', 'Music', 'Lifestyle']

const cleanText = (value) => typeof value === 'string' ? value.trim() : ''

function requestErrorMessage(error, fallback) {
  const backendError = error?.response?.data?.error
  const detail = backendError?.details && Object.values(backendError.details).find(Boolean)
  if (detail) return `${backendError.message || 'Please check the submitted information.'} ${detail}`
  if (backendError?.message) return backendError.message
  if (error?.response?.data?.message) return error.response.data.message
  if (error?.message && error.message !== 'Network Error') return error.message
  return error?.message === 'Network Error'
    ? 'The server could not be reached. Check that the backend is running and try again.'
    : fallback
}

function announceStoryUpdate(authorType) {
  window.dispatchEvent(new CustomEvent('vyra:story-updated', { detail: { authorType } }))
}

function postImage(post) {
  const media = post.media?.[0]
  return resolveMediaUrl(media?.thumbnailUrl || media?.url || post.author?.coverUrl)
}

function storyTimeLeft(post) {
  if (post.type !== 'STORY') return ''
  if (post.expired) return 'Expired'
  const seconds = Number(post.expiresInSeconds || 0)
  if (!seconds) return ''
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours ? `${hours}h ${minutes}m left` : `${Math.max(1, minutes)}m left`
}

function StoryEditor({ draft, setDraft, file, setFile, preview, audioFile, setAudioFile, audioPreview }) {
  const canvasRef = useRef(null)
  const storyTextRef = useRef(null)
  const dragging = useRef(false)
  const style = { ...defaultStoryStyle, ...draft.storyStyle }
  const updateStyle = (change) => setDraft((value) => ({ ...value, storyStyle: { ...defaultStoryStyle, ...value.storyStyle, ...change } }))

  useEffect(() => {
    if (!storyTextRef.current) return
    storyTextRef.current.style.height = 'auto'
    storyTextRef.current.style.height = `${storyTextRef.current.scrollHeight}px`
  }, [draft.caption, style.fontSize])

  const moveText = (event) => {
    if (!dragging.current || !canvasRef.current) return
    const bounds = canvasRef.current.getBoundingClientRect()
    const x = Math.min(92, Math.max(8, ((event.clientX - bounds.left) / bounds.width) * 100))
    const y = Math.min(92, Math.max(8, ((event.clientY - bounds.top) / bounds.height) * 100))
    updateStyle({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) })
  }
  const stopDragging = (event) => {
    dragging.current = false
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return <div className="grid items-start gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
    <div className="space-y-4">
      <Textarea label="Story text" value={draft.caption} onChange={(event) => setDraft((value) => ({ ...value, caption: event.target.value }))} placeholder="Type something…" rows={3} maxLength={280} help="Drag this text anywhere on the preview." />
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[.12em] text-white/35">Background</p>
        <div className="grid grid-cols-6 gap-2 lg:grid-cols-4">
          {storyBackgrounds.map((background) => <button type="button" key={background.id} aria-label={background.label} aria-pressed={style.background === background.id} onClick={() => updateStyle({ background: background.id })} className={`aspect-square rounded-full border-2 transition hover:scale-105 ${style.background === background.id ? 'border-white' : 'border-transparent'}`} style={{ background: background.value }} />)}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[.12em] text-white/35">Text color</p>
        <div className="flex gap-2">{['#ffffff','#111111','#ff76bd','#bbf7d0'].map((color) => <button type="button" key={color} aria-label={`Text color ${color}`} aria-pressed={style.textColor === color} onClick={() => updateStyle({ textColor: color })} className={`size-8 rounded-full border-2 ${style.textColor === color ? 'border-pink' : 'border-white/15'}`} style={{ backgroundColor: color }} />)}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><p className="mb-2 text-[9px] font-bold uppercase tracking-[.12em] text-white/35">Size</p><div className="flex rounded-lg border border-white/10 p-0.5">{[['sm','S'],['md','M'],['lg','L']].map(([value,label]) => <button type="button" key={value} onClick={() => updateStyle({ fontSize: value })} className={`min-h-7 flex-1 rounded-md text-[9px] font-bold ${style.fontSize === value ? 'bg-white text-black' : 'text-white/40'}`}>{label}</button>)}</div></div>
        <div><p className="mb-2 text-[9px] font-bold uppercase tracking-[.12em] text-white/35">Align</p><div className="flex rounded-lg border border-white/10 p-0.5">{[['left','L'],['center','C'],['right','R']].map(([value,label]) => <button type="button" key={value} onClick={() => updateStyle({ textAlign: value })} className={`min-h-7 flex-1 rounded-md text-[9px] font-bold ${style.textAlign === value ? 'bg-white text-black' : 'text-white/40'}`}>{label}</button>)}</div></div>
      </div>
      <Select label="Category" value={draft.category} onChange={(event) => setDraft((value) => ({ ...value, category: event.target.value }))} options={categories} />
      <Select label="Audience" value={draft.visibility} onChange={(event) => setDraft((value) => ({ ...value, visibility: event.target.value }))} options={[{ label: 'Public', value: 'PUBLIC' }, { label: 'Followers only', value: 'FOLLOWERS' }]} />
      <FileUpload label="Photo or video (optional)" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" value={file?.name || ''} onChange={(files) => setFile(files[0] || null)} compact />
      <div className="rounded-xl border border-white/[.08] bg-white/[.025] p-3">
        <FileUpload label="Music or audio (optional)" accept="audio/mpeg,audio/wav,audio/x-wav,audio/ogg" value={audioFile?.name || ''} onChange={(files) => {
          const next = files[0] || null
          setAudioFile(next)
          setDraft((value) => ({ ...value, storyAudio: { ...value.storyAudio, title: next ? value.storyAudio.title || next.name.replace(/\.[^.]+$/, '') : '' } }))
        }} compact />
        {audioFile && <div className="mt-3 space-y-3">
          <audio src={audioPreview} controls preload="metadata" className="h-9 w-full" />
          <Input label="Track title" value={draft.storyAudio.title} onChange={(event) => setDraft((value) => ({ ...value, storyAudio: { ...value.storyAudio, title: event.target.value } }))} placeholder="Track title" />
          <Input label="Artist (optional)" value={draft.storyAudio.artist} onChange={(event) => setDraft((value) => ({ ...value, storyAudio: { ...value.storyAudio, artist: event.target.value } }))} placeholder="Artist or original audio" />
          <label className="block text-[9px] font-bold uppercase tracking-[.1em] text-white/40">Volume
            <input type="range" min="0" max="1" step="0.05" value={draft.storyAudio.volume} onChange={(event) => setDraft((value) => ({ ...value, storyAudio: { ...value.storyAudio, volume: Number(event.target.value) } }))} className="mt-2 block w-full accent-pink" />
          </label>
          <label className="flex items-start gap-2 text-[10px] leading-4 text-white/55"><input type="checkbox" className="mt-0.5 accent-pink" checked={draft.storyAudio.rightsConfirmed} onChange={(event) => setDraft((value) => ({ ...value, storyAudio: { ...value.storyAudio, rightsConfirmed: event.target.checked } }))} /><span>I own this audio or have permission to use it in this story.</span></label>
        </div>}
      </div>
    </div>

    <div className="rounded-2xl border border-white/10 bg-black/35 p-3 sm:p-5 lg:sticky lg:top-0">
      <p className="mb-3 text-xs font-bold">Preview <span className="ml-2 font-normal text-white/35">Click the text to edit · drag the handle to move it</span></p>
      <div
        ref={canvasRef}
        className="relative mx-auto aspect-[9/16] max-h-[60vh] overflow-hidden rounded-[1.2rem] shadow-[0_20px_70px_rgba(0,0,0,.45)]"
        style={{ background: storyBackgroundValue(style.background) }}
      >
        {preview && (file.type.startsWith('video/') ? <video src={preview} muted loop autoPlay playsInline className="absolute inset-0 size-full object-cover" /> : <img src={preview} alt="Story preview" className="absolute inset-0 size-full object-cover" />)}
        {preview && <div className="absolute inset-0 bg-black/20" />}
        {audioFile && <span className="absolute bottom-3 left-3 z-20 flex max-w-[80%] items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1.5 text-[9px] font-bold backdrop-blur"><Music2 size={12} className="text-pink" /><span className="truncate">{draft.storyAudio.title || audioFile.name}</span></span>}
        <div
          className="group absolute z-10 w-[82%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_2px_8px_rgba(0,0,0,.65)]"
          style={{ left: `${style.x}%`, top: `${style.y}%` }}
        >
          <button
            type="button"
            aria-label="Move story text"
            onPointerDown={(event) => {
              event.preventDefault()
              dragging.current = true
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerMove={moveText}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            className="absolute -top-8 left-1/2 z-20 grid size-7 -translate-x-1/2 touch-none select-none place-items-center rounded-full border border-white/25 bg-black/60 text-white opacity-0 shadow-lg transition cursor-grab hover:bg-black/80 group-hover:opacity-100 group-focus-within:opacity-100 active:cursor-grabbing"
          >
            <Move size={13} />
          </button>
          <textarea
            ref={storyTextRef}
            aria-label="Story text on preview"
            rows={1}
            maxLength={280}
            value={draft.caption}
            onChange={(event) => setDraft((value) => ({ ...value, caption: event.target.value }))}
            placeholder="Type your story text"
            className="block max-h-72 w-full resize-none overflow-hidden rounded-xl border border-transparent bg-transparent px-3 py-2 font-black leading-tight outline-none transition placeholder:text-current placeholder:opacity-100 hover:border-white/20 focus:border-white/45 focus:bg-black/15"
            style={{ color: style.textColor, fontSize: storyFontSize(style.fontSize), textAlign: style.textAlign }}
          />
        </div>
      </div>
    </div>
  </div>
}

export default function ContentManagementPage({ role }) {
  const { toast } = useToast()
  const authorType = role.toUpperCase()
  const [items, setItems] = useState([])
  const [draft, setDraft] = useState(emptyDraft)
  const [file, setFile] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [composer, setComposer] = useState(null)
  const [composerError, setComposerError] = useState('')
  const [contentFilter, setContentFilter] = useState('ALL')
  const [storyPreview, setStoryPreview] = useState(null)
  const [resharingId, setResharingId] = useState('')

  const preview = useMemo(() => file ? URL.createObjectURL(file) : '', [file])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  const audioPreview = useMemo(() => audioFile ? URL.createObjectURL(audioFile) : '', [audioFile])
  useEffect(() => () => { if (audioPreview) URL.revokeObjectURL(audioPreview) }, [audioPreview])

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    return Promise.all([
      contentApi.mine({ authorType, limit: 30 }),
      contentApi.mine({ authorType, postType: 'STORY', limit: 30 }),
    ]).then(([contentResult, storyResult]) => {
      const combined = [...(contentResult.items || []), ...(storyResult.items || [])]
      setItems([...new Map(combined.map((item) => [item.id, item])).values()])
    })
      .catch((requestError) => setError(requestErrorMessage(requestError, 'Posts could not be loaded.')))
      .finally(() => setLoading(false))
  }, [authorType])

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) load() })
    return () => { active = false }
  }, [load])

  const visibleItems = useMemo(() => items.filter((item) => {
    if (contentFilter === 'ALL') return true
    if (contentFilter === 'POST') return item.type !== 'STORY'
    if (contentFilter === 'STORY') return item.type === 'STORY' && item.status === 'PUBLISHED' && !item.expired
    return item.type === 'STORY' && (item.expired || item.status === 'ARCHIVED')
  }), [contentFilter, items])

  const openComposer = (postType) => {
    setDraft({ ...emptyDraft, postType, storyStyle: { ...defaultStoryStyle }, storyAudio: { ...emptyStoryAudio } })
    setFile(null)
    setAudioFile(null)
    setComposerError('')
    setComposer(postType)
  }

  const closeComposer = () => {
    if (saving) return
    setComposer(null)
    setComposerError('')
    setDraft(emptyDraft)
    setFile(null)
    setAudioFile(null)
  }

  const submit = async (status) => {
    const caption = cleanText(draft.caption)
    const title = cleanText(draft.title)
    const campaignId = cleanText(draft.campaignId)
    const partnerId = cleanText(draft.partnerId)
    const storyAudioDraft = { ...emptyStoryAudio, ...(draft.storyAudio || {}) }

    if (!caption) {
      setComposerError(`Write ${draft.postType === 'STORY' ? 'a short story caption' : 'a caption'} before continuing.`)
      return
    }
    if (status === 'PUBLISHED' && !file && draft.postType !== 'STORY') {
      setComposerError('Choose an image or video before publishing a post.')
      return
    }
    if (audioFile && (!cleanText(storyAudioDraft.title) || !storyAudioDraft.rightsConfirmed)) {
      setComposerError('Add the track title and confirm that you have permission to use this audio.')
      return
    }
    setSaving(true)
    setComposerError('')
    const uploadedAssetIds = []
    try {
      let media = []
      let storyAudio
      if (file) {
        const uploaded = await mediaApi.upload(file, 'CONTENT')
        uploadedAssetIds.push(uploaded.asset.id)
        media = [{
          assetId: uploaded.asset.id,
          mediaType: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
          altText: title || caption.slice(0, 120),
        }]
      }
      if (audioFile && draft.postType === 'STORY') {
        const uploaded = await mediaApi.upload(audioFile, 'CONTENT')
        uploadedAssetIds.push(uploaded.asset.id)
        storyAudio = {
          assetId: uploaded.asset.id,
          title: cleanText(storyAudioDraft.title),
          artist: cleanText(storyAudioDraft.artist) || undefined,
          startMs: Number(storyAudioDraft.startMs) || 0,
          volume: Number.isFinite(Number(storyAudioDraft.volume)) ? Number(storyAudioDraft.volume) : emptyStoryAudio.volume,
          rightsConfirmed: true,
        }
      }
      const result = await contentApi.create({
        authorType,
        postType: draft.postType === 'STORY' ? 'STORY' : role === 'business' ? 'BRAND_STORY' : 'ORIGINAL',
        title: title || undefined,
        caption,
        storyStyle: draft.postType === 'STORY' ? { ...defaultStoryStyle, ...(draft.storyStyle || {}) } : undefined,
        storyAudio,
        category: cleanText(draft.category) || emptyDraft.category,
        visibility: draft.visibility || emptyDraft.visibility,
        paidPartnership: Boolean(draft.paidPartnership),
        campaignId: campaignId || undefined,
        ...(role === 'creator'
          ? { partnerBusinessId: partnerId || undefined }
          : { partnerCreatorId: partnerId || undefined }),
        status,
        media,
      })
      if (!result?.post) throw new Error('The server did not return the saved content record.')
      setItems((current) => [result.post, ...current])
      setDraft(emptyDraft)
      setFile(null)
      setAudioFile(null)
      setComposer(null)
      if (draft.postType === 'STORY' && status === 'PUBLISHED') announceStoryUpdate(authorType)
      toast(status === 'PUBLISHED' ? `${draft.postType === 'STORY' ? 'Story' : 'Post'} published to Showcase.` : 'Post draft saved.', { type: 'success' })
    } catch (requestError) {
      await Promise.all(uploadedAssetIds.map((assetId) => mediaApi.remove(assetId).catch(() => {})))
      setComposerError(requestErrorMessage(requestError, `The ${draft.postType === 'STORY' ? 'story' : 'post'} could not be saved.`))
    } finally {
      setSaving(false)
    }
  }

  const mutate = async (post, action) => {
    try {
      if (action === 'publish') {
        const result = await contentApi.publish(post.id)
        setItems((current) => current.map((item) => item.id === post.id ? result.post : item))
        if (post.type === 'STORY') announceStoryUpdate(authorType)
        toast('Post published.', { type: 'success' })
      } else if (action === 'archive') {
        const result = await contentApi.archive(post.id)
        setItems((current) => current.map((item) => item.id === post.id ? result.post : item))
        if (post.type === 'STORY') announceStoryUpdate(authorType)
        toast('Post archived.', { type: 'success' })
      } else {
        await contentApi.remove(post.id)
        setItems((current) => current.filter((item) => item.id !== post.id))
        if (post.type === 'STORY') announceStoryUpdate(authorType)
        toast('Post removed.', { type: 'success' })
      }
    } catch (requestError) {
      setError(requestErrorMessage(requestError, 'The post could not be updated.'))
    }
  }

  const shareAgain = async (post) => {
    setResharingId(post.id)
    setError('')
    try {
      const result = await contentApi.create({
        authorType,
        postType: 'STORY',
        title: post.title || undefined,
        caption: post.caption,
        storyStyle: post.storyStyle || undefined,
        storyAudio: post.storyAudio ? { ...post.storyAudio, rightsConfirmed: true } : undefined,
        category: post.category || undefined,
        visibility: post.visibility || 'PUBLIC',
        paidPartnership: Boolean(post.paidPartnership),
        campaignId: post.campaign?.id || undefined,
        partnerCreatorId: post.partnerCreatorId || undefined,
        partnerBusinessId: post.partnerBusinessId || undefined,
        status: 'PUBLISHED',
        media: (post.media || []).map((media) => ({
          assetId: media.assetId,
          mediaType: media.mediaType,
          altText: media.altText || post.caption.slice(0, 120),
          width: media.width || undefined,
          height: media.height || undefined,
          durationMs: media.durationMs || undefined,
        })),
      })
      setItems((current) => [result.post, ...current])
      announceStoryUpdate(authorType)
      setContentFilter('STORY')
      toast('Story shared again for the next 24 hours.', { type: 'success' })
    } catch (requestError) {
      setError(requestErrorMessage(requestError, 'The archived story could not be shared again.'))
    } finally {
      setResharingId('')
    }
  }

  return <DashboardPage>
    <DashboardHeader
      eyebrow={`${role} channel`}
      title="Posts & stories"
      copy="Create permanent feed posts or share moments that disappear automatically after 24 hours."
      action={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => openComposer('STORY')}><Clock3 size={14} />Add story</Button><Button variant={role === 'creator' ? 'pink' : 'mint'} onClick={() => openComposer('POST')}><ImagePlus size={14} />Create post</Button></div>}
    />
    {error && <p role="alert" className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs text-red-200">{error}</p>}
    <section className="mb-5 rounded-[1.4rem] border border-white/10 bg-white/[.028] p-4">
      <button type="button" onClick={() => openComposer('POST')} className="flex w-full items-center gap-3 text-left">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full font-black text-black ${role === 'creator' ? 'bg-pink' : 'bg-mint'}`}>{role === 'creator' ? 'C' : 'B'}</span>
        <span className="flex min-h-10 flex-1 items-center rounded-full border border-white/10 bg-white/[.045] px-4 text-xs text-white/35 transition hover:border-white/20 hover:bg-white/[.07]">What do you want to share?</span>
      </button>
      <div className="mt-4 grid grid-cols-2 border-t border-white/[.08] pt-3">
        <button type="button" onClick={() => openComposer('POST')} className="flex min-h-10 items-center justify-center gap-2 rounded-xl text-xs font-semibold text-white/55 transition hover:bg-white/[.05] hover:text-white"><ImagePlus size={16} className="text-mint" />Create post</button>
        <button type="button" onClick={() => openComposer('STORY')} className="flex min-h-10 items-center justify-center gap-2 rounded-xl border-l border-white/[.08] text-xs font-semibold text-white/55 transition hover:bg-white/[.05] hover:text-white"><Clock3 size={16} className="text-pink" />Add story</button>
      </div>
    </section>

    <DashboardPanel title="Your content" action={<div className="flex rounded-lg border border-white/10 bg-black/20 p-0.5">{[['ALL','All'],['POST','Posts'],['STORY','Active stories'],['ARCHIVE','Story archive']].map(([value,label]) => <button type="button" key={value} onClick={() => setContentFilter(value)} className={`rounded-md px-2.5 py-1.5 text-[9px] font-bold transition ${contentFilter === value ? 'bg-white text-black' : 'text-white/35 hover:text-white'}`}>{label}</button>)}</div>}>
        {loading ? <p role="status" className="py-10 text-center text-sm text-white/40">Loading posts…</p> : visibleItems.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((post) => <article key={post.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]">
            <button type="button" disabled={post.type !== 'STORY'} onClick={() => setStoryPreview(post)} aria-label={post.type === 'STORY' ? 'View story' : undefined} className="relative block aspect-video w-full overflow-hidden bg-black/35 text-left disabled:cursor-default">{post.type === 'STORY' && post.storyStyle && !post.media?.length ? <><div className="absolute inset-0" style={{ background: storyBackgroundValue(post.storyStyle.background) }} /><p className="absolute w-[82%] -translate-x-1/2 -translate-y-1/2 whitespace-pre-wrap break-words px-2 font-black leading-tight" style={{ left: `${post.storyStyle.x}%`, top: `${post.storyStyle.y}%`, color: post.storyStyle.textColor, fontSize: storyFontSize(post.storyStyle.fontSize), textAlign: post.storyStyle.textAlign }}>{post.caption}</p></> : postImage(post) ? <img src={postImage(post)} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-white/20">{post.media?.[0]?.mediaType === 'VIDEO' ? <FileVideo2 /> : <ImagePlus />}</span>}</button>
            <div className="p-4"><div className="flex items-center justify-between gap-2"><strong className="truncate text-sm">{post.title || post.caption}</strong><span className="rounded-full border border-white/10 px-2 py-1 text-[8px] font-bold uppercase text-white/45">{post.type === 'STORY' ? post.expired || post.status === 'ARCHIVED' ? 'ARCHIVED' : 'STORY' : post.status}</span></div><p className="mt-2 line-clamp-2 text-[10px] leading-4 text-white/40">{post.caption}</p>{storyTimeLeft(post) && <p className={`mt-2 flex items-center gap-1 text-[10px] font-bold ${post.expired ? 'text-white/35' : 'text-mint'}`}><Clock3 size={11} />{storyTimeLeft(post)}</p>}<div className="mt-4 flex flex-wrap items-center gap-3">{post.type === 'STORY' && (post.expired || post.status === 'ARCHIVED') && <button disabled={resharingId === post.id} onClick={() => shareAgain(post)} className="flex items-center gap-1 text-[10px] font-bold text-pink disabled:opacity-40"><Repeat2 size={11} />{resharingId === post.id ? 'Sharing…' : 'Share again'}</button>}{post.status !== 'PUBLISHED' && post.type !== 'STORY' && <button onClick={() => mutate(post, 'publish')} className="text-[10px] font-bold text-mint">Publish</button>}{post.status === 'PUBLISHED' && !post.expired && <button onClick={() => mutate(post, 'archive')} className="flex items-center gap-1 text-[10px] text-white/45"><Archive size={11} />Archive</button>}<button onClick={() => mutate(post, 'remove')} className="ml-auto flex items-center gap-1 text-[10px] text-red-300"><Trash2 size={11} />Remove</button></div></div>
          </article>)}
        </div> : <EmptyState title={contentFilter === 'ARCHIVE' ? 'Your story archive is empty' : contentFilter === 'STORY' ? 'No active stories' : contentFilter === 'POST' ? 'No posts yet' : 'No content yet'} description={contentFilter === 'ARCHIVE' ? 'Expired and manually archived stories will appear here.' : contentFilter === 'STORY' ? 'Add a story to share a moment for the next 24 hours.' : 'Create a draft or publish content from this channel.'} />}
    </DashboardPanel>

    <Dialog
      dark
      open={Boolean(composer)}
      onClose={closeComposer}
      title={composer === 'STORY' ? 'Add to your story' : 'Create post'}
      description={composer === 'STORY' ? 'Stories stay visible for 24 hours unless you remove them earlier.' : 'Posts remain on your channel and in Showcase until you archive or remove them.'}
      className={composer === 'STORY' ? '!max-w-5xl' : ''}
    >
      <div className="space-y-4">
        {composer === 'STORY'
          ? <StoryEditor draft={draft} setDraft={setDraft} file={file} setFile={setFile} preview={preview} audioFile={audioFile} setAudioFile={setAudioFile} audioPreview={audioPreview} />
          : <>
            <Input label="Title (optional)" value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} placeholder="A clear title" />
            <Textarea label="Caption" value={draft.caption} onChange={(event) => setDraft((value) => ({ ...value, caption: event.target.value }))} placeholder="What do you want to share?" rows={4} />
            <div className="grid gap-3 sm:grid-cols-2"><Select label="Category" value={draft.category} onChange={(event) => setDraft((value) => ({ ...value, category: event.target.value }))} options={categories} /><Select label="Audience" value={draft.visibility} onChange={(event) => setDraft((value) => ({ ...value, visibility: event.target.value }))} options={[{ label: 'Public', value: 'PUBLIC' }, { label: 'Followers only', value: 'FOLLOWERS' }]} /></div>
            <FileUpload label="Post photo or video" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" value={file?.name || ''} onChange={(files) => setFile(files[0] || null)} />
            {preview && <div className="overflow-hidden rounded-xl border border-white/10 bg-black/35">{file.type.startsWith('video/') ? <video src={preview} controls className="max-h-72 w-full object-contain" /> : <img src={preview} alt="Post preview" className="max-h-72 w-full object-contain" />}</div>}
          </>}
        <label className="flex items-center gap-2 rounded-xl border border-white/[.08] px-3 py-2.5 text-xs text-white/55"><input type="checkbox" checked={draft.paidPartnership} onChange={(event) => setDraft((value) => ({ ...value, paidPartnership: event.target.checked }))} />Paid partnership disclosure</label>
        {draft.paidPartnership && <div className="grid gap-3 rounded-xl border border-mint/15 bg-mint/5 p-3 sm:grid-cols-2"><Input label="Campaign ID (optional)" value={draft.campaignId} onChange={(event) => setDraft((value) => ({ ...value, campaignId: event.target.value }))} /><Input label={`${role === 'creator' ? 'Business' : 'Creator'} partner ID`} value={draft.partnerId} onChange={(event) => setDraft((value) => ({ ...value, partnerId: event.target.value }))} /><p className="text-[10px] leading-4 text-white/35 sm:col-span-2">Paid content must link a real campaign or partner channel. The disclosure remains visible after publishing.</p></div>}
        {composerError && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-xs text-red-200">{composerError}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
          <Button variant="ghost" disabled={saving} onClick={closeComposer}>Cancel</Button>
          {composer === 'POST' && <Button variant="outline" disabled={saving} onClick={() => submit('DRAFT')}><Plus size={14} />Save draft</Button>}
          <Button variant={role === 'creator' ? 'pink' : 'mint'} disabled={saving} onClick={() => submit('PUBLISHED')}><Send size={14} />{saving ? 'Saving…' : composer === 'STORY' ? 'Share story' : 'Publish post'}</Button>
        </div>
      </div>
    </Dialog>
    {storyPreview && <StoryViewer stories={[storyPreview]} onClose={() => setStoryPreview(null)} />}
  </DashboardPage>
}
