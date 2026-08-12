import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, ChevronLeft, ChevronRight, Heart, Pause, Play, Volume2, VolumeX, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { resolveMediaUrl } from '../../api/mediaUrl'
import { storyBackgroundValue, storyFontSize } from '../../lib/storyStyle'
import { Avatar } from '../ui'

function relativeTime(value) {
  const elapsed = Math.max(0, Date.now() - new Date(value || Date.now()).getTime())
  const minutes = Math.floor(elapsed / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h`
}

function normalizeStory(story) {
  const media = story.media?.[0]
  return {
    ...story,
    authorName: story.authorName || story.author?.name || story.author || 'VYRA channel',
    avatar: resolveMediaUrl(story.avatar || story.author?.avatarUrl),
    fallback: story.fallback || String(story.author?.name || story.author || 'VY').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    copy: story.copy ?? story.caption ?? '',
    mediaType: story.mediaType || media?.mediaType || 'IMAGE',
    mediaUrl: resolveMediaUrl(story.mediaUrl || media?.url || media?.thumbnailUrl),
    publishedAt: story.publishedAt || story.createdAt,
    storyAudio: story.storyAudio || null,
  }
}

export function StoryViewer({ stories = [], initialIndex = 0, onClose, onLike, onSave, liked = [], saved = [] }) {
  const normalized = useMemo(() => stories.map(normalizeStory), [stories])
  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(0, normalized.length - 1)))
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [audioMuted, setAudioMuted] = useState(false)
  const videoRef = useRef(null)
  const audioRef = useRef(null)
  const story = normalized[index]

  const previous = useCallback(() => {
    setIndex((value) => Math.max(0, value - 1))
    setProgress(0)
  }, [])
  const next = useCallback(() => {
    if (index >= normalized.length - 1) {
      onClose?.()
      return
    }
    setIndex((value) => value + 1)
    setProgress(0)
  }, [index, normalized.length, onClose])

  useEffect(() => {
    if (!story || paused) return undefined
    const timer = window.setInterval(() => {
      setProgress((value) => {
        if (value >= 98) {
          window.setTimeout(next, 0)
          return 0
        }
        return value + 2
      })
    }, 120)
    return () => window.clearInterval(timer)
  }, [next, paused, story])

  useEffect(() => {
    const players = [videoRef.current, audioRef.current].filter(Boolean)
    players.forEach((player) => {
      if (paused) player.pause()
      else player.play().catch(() => {})
    })
  }, [paused, story?.id])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const keydown = (event) => {
      if (event.key === 'Escape') onClose?.()
      if (event.key === 'ArrowLeft') previous()
      if (event.key === 'ArrowRight') next()
      if (event.key === ' ') {
        event.preventDefault()
        setPaused((value) => !value)
      }
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', keydown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', keydown)
    }
  }, [next, onClose, previous])

  if (!story || typeof document === 'undefined') return null
  const isLiked = liked.includes(story.id)
  const isSaved = saved.includes(story.saveKey)

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${story.authorName} story`} className="fixed inset-0 z-[250] grid place-items-center overflow-hidden bg-[#111] p-2 sm:p-4">
      {story.mediaUrl && <div aria-hidden="true" className="absolute inset-0 scale-110 bg-cover bg-center opacity-15 blur-3xl" style={{ backgroundImage: `url(${story.mediaUrl})` }} />}
      <button type="button" onClick={onClose} aria-label="Close story" className="absolute right-4 top-4 z-30 grid size-11 place-items-center rounded-full bg-black/35 text-white transition hover:bg-white/10 sm:right-7 sm:top-6"><X size={28} /></button>

      <button type="button" onClick={previous} disabled={index === 0} aria-label="Previous story" className="absolute left-3 top-1/2 z-30 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/15 disabled:pointer-events-none disabled:opacity-20 sm:left-[calc(50%-19rem)]"><ChevronLeft size={24} /></button>
      <button type="button" onClick={next} aria-label={index === normalized.length - 1 ? 'Close stories' : 'Next story'} className="absolute right-3 top-1/2 z-30 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/15 sm:right-[calc(50%-19rem)]"><ChevronRight size={24} /></button>

      <article className="relative z-10 aspect-[9/16] h-[min(92dvh,52rem)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[1.1rem] border border-white/10 bg-[#1b1b1b] shadow-[0_28px_100px_rgba(0,0,0,.7)]">
        {story.mediaType === 'VIDEO' && story.mediaUrl
          ? <video ref={videoRef} key={story.id} src={story.mediaUrl} autoPlay muted playsInline className="absolute inset-0 size-full object-cover" onEnded={next} />
          : story.mediaUrl
            ? <img src={story.mediaUrl} alt="" className="absolute inset-0 size-full object-cover" />
            : <div className="absolute inset-0" style={{ background: storyBackgroundValue(story.storyStyle?.background) }} />}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/65" />
        {story.storyStyle && <p className="pointer-events-none absolute z-10 w-[82%] -translate-x-1/2 -translate-y-1/2 whitespace-pre-wrap break-words rounded-xl px-3 py-2 font-black leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,.75)]" style={{ left: `${story.storyStyle.x}%`, top: `${story.storyStyle.y}%`, color: story.storyStyle.textColor, fontSize: storyFontSize(story.storyStyle.fontSize), textAlign: story.storyStyle.textAlign }}>{story.copy}</p>}
        {story.storyAudio?.url && <audio
          ref={audioRef}
          key={`${story.id}-audio`}
          src={resolveMediaUrl(story.storyAudio.url)}
          autoPlay
          loop
          muted={audioMuted}
          preload="auto"
          onLoadedMetadata={(event) => {
            const start = Math.max(0, Number(story.storyAudio.startMs || 0) / 1000)
            if (Number.isFinite(event.currentTarget.duration)) event.currentTarget.currentTime = Math.min(start, Math.max(0, event.currentTarget.duration - 0.1))
            event.currentTarget.volume = Math.min(1, Math.max(0, Number(story.storyAudio.volume ?? 0.7)))
          }}
        />}

        <header className="absolute inset-x-0 top-0 z-20 p-3.5">
          <div className="flex gap-1">{normalized.map((item, itemIndex) => <span key={item.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"><i className="block h-full bg-white transition-[width] duration-100" style={{ width: itemIndex < index ? '100%' : itemIndex === index ? `${progress}%` : '0%' }} /></span>)}</div>
          <div className="mt-3 flex items-center gap-2.5">
            <Avatar src={story.avatar} fallback={story.fallback} size="sm" story />
            <strong className="min-w-0 flex-1 truncate text-xs">{story.authorName}</strong>
            <time className="text-[10px] text-white/55">{relativeTime(story.publishedAt)}</time>
            {story.storyAudio?.url && <button type="button" onClick={() => setAudioMuted((value) => !value)} aria-label={audioMuted ? 'Unmute story audio' : 'Mute story audio'} className="grid size-8 place-items-center rounded-full hover:bg-white/10">{audioMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>}
            <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? 'Play story' : 'Pause story'} className="grid size-8 place-items-center rounded-full hover:bg-white/10">{paused ? <Play size={15} /> : <Pause size={15} />}</button>
          </div>
        </header>

        <footer className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-end gap-2 p-4">
          {story.storyAudio?.url && <span className="mr-auto max-w-[65%] truncate rounded-full bg-black/45 px-3 py-2 text-[9px] font-semibold backdrop-blur">♫ {story.storyAudio.title}{story.storyAudio.artist ? ` · ${story.storyAudio.artist}` : ''}</span>}
          {onLike && <button type="button" aria-label={isLiked ? 'Unlike story' : 'Like story'} aria-pressed={isLiked} onClick={() => onLike(story)} className={`grid size-11 place-items-center rounded-full border backdrop-blur ${isLiked ? 'border-pink bg-pink text-black' : 'border-white/35 bg-black/20 text-white'}`}><Heart size={20} fill={isLiked ? 'currentColor' : 'none'} /></button>}
          {onSave && <button type="button" aria-label={isSaved ? 'Remove story from saved' : 'Save story'} aria-pressed={isSaved} onClick={() => onSave(story)} className={`grid size-11 place-items-center rounded-full border backdrop-blur ${isSaved ? 'border-mint bg-mint text-black' : 'border-white/35 bg-black/20 text-white'}`}><Bookmark size={20} fill={isSaved ? 'currentColor' : 'none'} /></button>}
        </footer>
      </article>
    </div>,
    document.body,
  )
}
