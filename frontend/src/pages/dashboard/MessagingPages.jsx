import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, CheckCheck, Clock3, Edit3, FileText, Inbox, MessageCircle, Paperclip, Search, Send, Trash2, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { messagingApi, notificationApi } from '../../api/dashboard.api'
import { mediaApi } from '../../api/media.api'
import { createRealtimeClient } from '../../api/realtime'
import { DashboardHeader, DashboardPage, DashboardPanel } from '../../components/dashboard/DashboardUI'
import { Avatar, Badge, Button, EmptyState, Skeleton, Switch, useToast } from '../../components/ui'

function errorMessage(error, fallback) {
  return error.response?.data?.error?.message || error.message || fallback
}

function validDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function sameDay(first, second) {
  const firstDate = validDate(first)
  const secondDate = validDate(second)
  return Boolean(firstDate && secondDate
    && firstDate.getFullYear() === secondDate.getFullYear()
    && firstDate.getMonth() === secondDate.getMonth()
    && firstDate.getDate() === secondDate.getDate())
}

function formatConversationTime(value) {
  const date = validDate(value)
  if (!date) return ''
  const today = new Date()
  if (sameDay(date, today)) return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(date)
  const daysAgo = Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()) - new Date(date.getFullYear(), date.getMonth(), date.getDate())) / 86400000)
  if (daysAgo < 7) return new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date)
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)
}

function formatMessageTime(value) {
  const date = validDate(value)
  return date ? new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(date) : ''
}

function formatDayLabel(value) {
  const date = validDate(value)
  if (!date) return ''
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (sameDay(date, today)) return 'Today'
  if (sameDay(date, yesterday)) return 'Yesterday'
  return new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' }).format(date)
}

function messagePreview(message) {
  if (message?.body) return message.body
  if (message?.attachment?.mimeType?.startsWith('image/')) return 'Sent a photo'
  if (message?.attachment?.mimeType?.startsWith('video/')) return 'Sent a video'
  if (message?.attachment) return `Sent ${message.attachment.name || 'a file'}`
  return 'No messages yet'
}

export function MessagesPage() {
  const { toast } = useToast()
  const location = useLocation()
  const [conversations, setConversations] = useState([])
  const [requests, setRequests] = useState([])
  const [messages, setMessages] = useState([])
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState(null)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [error, setError] = useState('')
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState(null)
  const [sending, setSending] = useState(false)
  const [requestBox, setRequestBox] = useState('incoming')
  const [requestMode, setRequestMode] = useState(Boolean(location.state?.showRequests))
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [decidingId, setDecidingId] = useState(null)
  const messagesEndRef = useRef(null)
  const composerRef = useRef(null)
  const conversationSearchRef = useRef(null)

  const attachmentPreview = useMemo(() => (
    attachmentFile?.type.startsWith('image/') ? URL.createObjectURL(attachmentFile) : ''
  ), [attachmentFile])
  useEffect(() => {
    if (!attachmentPreview) return undefined
    return () => URL.revokeObjectURL(attachmentPreview)
  }, [attachmentPreview])

  const loadConversations = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await messagingApi.list({ q: query || undefined, limit: 50 })
      setConversations(result.items)
      setActiveId((current) => current && result.items.some((item) => item.id === current) ? current : null)
    } catch (requestError) {
      setError(errorMessage(requestError, 'Conversations could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [query])
  const loadRequests = useCallback(async () => {
    setRequestsLoading(true)
    try {
      const result = await messagingApi.requests({ box: requestBox, limit: 50 })
      setRequests(result.items)
    } catch (requestError) {
      toast(errorMessage(requestError, 'Message requests could not be loaded.'), { type: 'error' })
    } finally {
      setRequestsLoading(false)
    }
  }, [requestBox, toast])
  useEffect(() => {
    const timer = window.setTimeout(loadConversations, query ? 250 : 0)
    return () => window.clearTimeout(timer)
  }, [loadConversations, query])
  useEffect(() => {
    const timer = window.setTimeout(loadRequests, 0)
    return () => window.clearTimeout(timer)
  }, [loadRequests])
  useEffect(() => {
    const requestedId = location.state?.conversationId
    if (!requestedId || !conversations.some((item) => item.id === requestedId)) return
    const timer = window.setTimeout(() => {
      setActiveId(requestedId)
      setRequestMode(false)
      setMobileThreadOpen(true)
      window.history.replaceState({}, document.title)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [conversations, location.state])

  const updateConversationLastMessage = useCallback((conversationId, message) => {
    setConversations((items) => {
      const current = items.find((item) => item.id === conversationId)
      if (!current) return items
      const updated = { ...current, lastMessage: message, updatedAt: message.createdAt || current.updatedAt }
      return [updated, ...items.filter((item) => item.id !== conversationId)]
    })
  }, [])

  useEffect(() => {
    if (!activeId) return undefined
    let active = true
    Promise.resolve()
      .then(() => { if (active) setThreadLoading(true) })
      .then(() => Promise.all([messagingApi.messages(activeId, { limit: 100 }), messagingApi.read(activeId)]))
      .then(([result]) => {
        if (!active) return
        setMessages(result.items)
        setConversations((items) => items.map((item) => item.id === activeId ? { ...item, lastReadAt: new Date().toISOString() } : item))
      })
      .catch((requestError) => { if (active) toast(errorMessage(requestError, 'Messages could not be loaded.'), { type: 'error' }) })
      .finally(() => { if (active) setThreadLoading(false) })
    return () => { active = false }
  }, [activeId, toast])

  useEffect(() => {
    if (!activeId) return undefined
    const socket = createRealtimeClient()
    const merge = (message) => {
      setMessages((items) => items.some((item) => item.id === message.id) ? items.map((item) => item.id === message.id ? message : item) : [...items, message])
      updateConversationLastMessage(activeId, message)
    }
    const join = () => socket.emit('conversation:join', { conversationId: activeId }, (result) => {
      if (!result?.ok) toast('Realtime conversation access was rejected.', { type: 'error' })
    })
    socket.on('connect', join)
    socket.on('message:created', (event) => { if (event.conversationId === activeId) merge(event.message) })
    socket.on('message:edited', (event) => { if (event.conversationId === activeId) merge(event.message) })
    socket.on('message:deleted', (event) => {
      if (event.conversationId !== activeId) return
      setMessages((items) => items.filter((item) => item.id !== event.messageId))
      setConversations((items) => items.map((item) => item.id === activeId && item.lastMessage?.id === event.messageId ? { ...item, lastMessage: null } : item))
    })
    socket.connect()
    return () => {
      socket.emit('conversation:leave', { conversationId: activeId })
      socket.disconnect()
    }
  }, [activeId, toast, updateConversationLastMessage])

  useEffect(() => {
    if (!activeId || threadLoading) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [activeId, messages.length, threadLoading])

  const activeConversation = useMemo(() => conversations.find((item) => item.id === activeId), [conversations, activeId])
  const openConversation = (id) => { setActiveId(id); setMobileThreadOpen(true) }
  const decideRequest = async (requestId, action) => {
    setDecidingId(requestId)
    try {
      const result = await messagingApi.decideRequest(requestId, action)
      const request = result.request
      toast(action === 'ACCEPT' ? 'Message request accepted.' : 'Message request declined.', { type: 'success' })
      await Promise.all([loadRequests(), loadConversations()])
      if (request?.conversationId) {
        setActiveId(request.conversationId)
        setRequestMode(false)
        setMobileThreadOpen(true)
      }
    } catch (requestError) {
      toast(errorMessage(requestError, 'Message request could not be updated.'), { type: 'error' })
    } finally {
      setDecidingId(null)
    }
  }
  const chooseAttachment = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const supported = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm', 'application/pdf']
    if (!supported.includes(file.type)) {
      toast('Choose a JPG, PNG, GIF, WEBP, MP4, MOV, WEBM or PDF file.', { type: 'error' })
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      toast('Message attachments cannot exceed 25 MB.', { type: 'error' })
      return
    }
    setAttachmentFile(file)
  }
  const submit = async (event) => {
    event.preventDefault()
    if (!activeId || (!draft.trim() && !attachmentFile)) return
    const text = draft.trim()
    setDraft('')
    setSending(true)
    try {
      let attachment
      if (attachmentFile) {
        const upload = await mediaApi.upload(attachmentFile, 'COLLABORATION')
        const asset = upload.asset
        attachment = {
          mediaAssetId: asset.id,
          name: asset.originalName || attachmentFile.name,
          url: asset.url,
          mimeType: asset.mimeType || attachmentFile.type,
          sizeBytes: asset.sizeBytes || attachmentFile.size,
        }
      }
      const result = await messagingApi.send(activeId, { ...(text && { body: text }), ...(attachment && { attachment }) })
      setMessages((items) => items.some((item) => item.id === result.message.id) ? items : [...items, result.message])
      updateConversationLastMessage(activeId, result.message)
      setAttachmentFile(null)
    } catch (requestError) {
      setDraft(text)
      toast(errorMessage(requestError, 'Message could not be sent.'), { type: 'error' })
    } finally {
      setSending(false)
      window.requestAnimationFrame(() => {
        if (composerRef.current) {
          composerRef.current.style.height = 'auto'
          composerRef.current.focus()
        }
      })
    }
  }
  const saveEdit = async (message) => {
    if (!editing?.body.trim()) return
    try {
      const result = await messagingApi.edit(activeId, message.id, editing.body.trim())
      setMessages((items) => items.map((item) => item.id === message.id ? result.message : item))
      if (activeConversation?.lastMessage?.id === message.id) updateConversationLastMessage(activeId, result.message)
      setEditing(null)
    } catch (requestError) { toast(errorMessage(requestError, 'Message could not be updated.'), { type: 'error' }) }
  }
  const remove = async (messageId) => {
    if (!window.confirm('Delete this message for everyone in this conversation?')) return
    try {
      await messagingApi.remove(activeId, messageId)
      setMessages((items) => items.filter((item) => item.id !== messageId))
      setConversations((items) => items.map((item) => item.id === activeId && item.lastMessage?.id === messageId ? { ...item, lastMessage: null } : item))
    } catch (requestError) { toast(errorMessage(requestError, 'Message could not be deleted.'), { type: 'error' }) }
  }

  return <DashboardPage className="relative !max-w-none !p-0">
    {error && <div role="alert" className="absolute left-1/2 top-3 z-40 flex w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 items-center justify-between rounded-xl border border-red-300/20 bg-[#221519]/95 p-3 text-xs text-red-200 shadow-xl backdrop-blur-xl"><span>{error}</span><Button size="sm" variant="outline" onClick={loadConversations}>Retry</Button></div>}
    <div className="grid h-[calc(100dvh-76px)] min-h-0 overflow-hidden border-y border-white/10 bg-[#0d1115] lg:grid-cols-[21rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className={`${mobileThreadOpen ? 'hidden lg:block' : 'block'} min-h-0 overflow-y-auto border-white/10 lg:border-r`}>
        <div className="sticky top-0 z-10 border-b border-white/[.07] bg-[#101010]/95 p-4 backdrop-blur-xl"><div className="mb-4 flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-pink">Private inbox</p><h2 className="mt-1 text-lg font-semibold tracking-[-.02em]">Conversations</h2></div><span className="grid min-w-7 place-items-center rounded-full border border-white/10 bg-white/[.05] px-2 py-1 text-[10px] font-bold text-white/55">{conversations.length}</span></div><div className="grid grid-cols-2 rounded-xl border border-white/10 bg-black/25 p-1"><button type="button" onClick={() => setRequestMode(false)} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold transition ${!requestMode ? 'bg-white text-black shadow-sm' : 'text-white/45 hover:bg-white/[.04] hover:text-white'}`}><Inbox size={13}/>Chats</button><button type="button" onClick={() => setRequestMode(true)} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold transition ${requestMode ? 'bg-white text-black shadow-sm' : 'text-white/45 hover:bg-white/[.04] hover:text-white'}`}><Clock3 size={13}/>Requests{requests.filter((item) => item.status === 'PENDING' && item.direction === 'INCOMING').length > 0 && <span className="grid size-5 place-items-center rounded-full bg-pink text-[9px] text-black">{requests.filter((item) => item.status === 'PENDING' && item.direction === 'INCOMING').length}</span>}</button></div>{!requestMode && <div className="relative mt-3"><Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"/><input ref={conversationSearchRef} aria-label="Search conversations" value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-full border border-white/10 bg-white/[.045] pl-10 pr-4 text-[11px] outline-none transition placeholder:text-white/25 focus:border-pink/70 focus:bg-white/[.06]" placeholder="Search conversations"/></div>}</div>
        {requestMode ? <div className="p-2"><div className="mb-2 flex rounded-lg bg-white/[.035] p-1">{['incoming','outgoing'].map((box)=><button type="button" key={box} onClick={()=>setRequestBox(box)} className={`flex-1 rounded-md px-2 py-2 text-[10px] font-bold capitalize transition ${requestBox===box?'bg-white/10 text-white':'text-white/35 hover:text-white/60'}`}>{box}</button>)}</div>{requestsLoading ? <div className="space-y-2 py-2">{[1,2,3].map((item)=><Skeleton key={item} className="h-28 rounded-2xl"/>)}</div> : requests.length ? <div className="space-y-2">{requests.map((item)=><article key={item.id} className="rounded-2xl border border-white/[.08] bg-white/[.025] p-3.5 transition hover:bg-white/[.04]"><div className="flex items-center gap-3"><Avatar size="sm" src={item.peer.avatarUrl} fallback={item.peer.name}/><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{item.peer.name}</strong><small className="mt-1 block capitalize text-[9px] text-white/35">{item.direction.toLowerCase()} · {item.status.toLowerCase()}</small></span><Badge variant={item.status==='PENDING'?'pink':item.status==='ACCEPTED'?'mint':'outline'}>{item.status}</Badge></div><p className="mt-3 line-clamp-3 text-[11px] leading-5 text-white/50">{item.initialMessage}</p>{item.direction==='INCOMING'&&item.status==='PENDING'&&<div className="mt-3 grid grid-cols-2 gap-2"><Button size="sm" variant="outline" loading={decidingId===item.id} onClick={()=>decideRequest(item.id,'DECLINE')}>Decline</Button><Button size="sm" variant="mint" loading={decidingId===item.id} onClick={()=>decideRequest(item.id,'ACCEPT')}>Accept</Button></div>}{item.status==='ACCEPTED'&&item.conversationId&&<Button size="sm" variant="ghost" className="mt-2 w-full" onClick={()=>{setActiveId(item.conversationId);setRequestMode(false);setMobileThreadOpen(true)}}>Open chat</Button>}</article>)}</div> : <div className="p-2"><EmptyState title={`No ${requestBox} requests`} description={requestBox==='incoming'?'New introductions will wait here for your approval.':'Requests you send from profiles will appear here.'}/></div>}</div>
          : loading ? <div className="space-y-2 p-2">{[1,2,3,4].map((item)=><Skeleton key={item} className="h-[4.5rem] rounded-2xl"/>)}</div>
          : conversations.length ? <div className="space-y-1 p-2">{conversations.map((item) => {
            const peer = item.peers[0]
            const unread = Boolean(item.lastMessage && item.peers.some((person) => person.id === item.lastMessage.senderId) && (!item.lastReadAt || new Date(item.lastMessage.createdAt) > new Date(item.lastReadAt)))
            return <button type="button" key={item.id} aria-current={activeId === item.id ? 'true' : undefined} onClick={() => openConversation(item.id)} className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${activeId === item.id ? 'bg-white/[.09] shadow-[inset_3px_0_0_#ff76bd]' : 'hover:bg-white/[.045]'}`}>
              <Avatar size="md" src={peer?.avatarUrl} fallback={peer?.name}/><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong className={`min-w-0 flex-1 truncate text-xs ${unread ? 'text-white' : 'text-white/80'}`}>{item.title || peer?.name}</strong><time className={`text-[9px] ${unread ? 'font-bold text-pink' : 'text-white/25'}`}>{formatConversationTime(item.lastMessage?.createdAt || item.updatedAt)}</time></span><span className="mt-1.5 flex items-center gap-2"><small className={`min-w-0 flex-1 truncate text-[10px] ${unread ? 'font-medium text-white/70' : 'text-white/35'}`}>{messagePreview(item.lastMessage)}</small>{unread && <i aria-label="Unread" className="size-2 shrink-0 rounded-full bg-pink"/>}</span></span>
            </button>
          })}</div> : <div className="p-4"><EmptyState title="No conversations" description="Send a request from a Creator or Business profile to start a private chat."/></div>}
      </aside>
      <section className={`${mobileThreadOpen ? 'flex' : 'hidden lg:flex'} relative h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_10%,rgba(255,118,189,.055),transparent_34%)]`}>
        {activeConversation ? <>
          <header className="flex min-h-[4.5rem] items-center gap-3 border-b border-white/[.08] bg-[#101010]/90 px-4 py-3 backdrop-blur-xl sm:px-5"><button type="button" className="grid size-9 place-items-center rounded-full text-white/60 transition hover:bg-white/[.06] hover:text-white lg:hidden" onClick={()=>setMobileThreadOpen(false)} aria-label="Back to conversations"><ArrowLeft size={17}/></button><Avatar size="md" src={activeConversation.peers[0]?.avatarUrl} fallback={activeConversation.peers[0]?.name}/><div className="min-w-0 flex-1"><strong className="block truncate text-sm tracking-[-.01em]">{activeConversation.title || activeConversation.peers[0]?.name}</strong><small className="mt-0.5 block truncate text-[10px] text-white/35">{activeConversation.collaboration?.campaign ? `Campaign · ${activeConversation.collaboration.campaign}` : 'Private conversation'}</small></div>{activeConversation.collaboration && <span className="hidden rounded-full border border-mint/20 bg-mint/[.08] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.12em] text-mint sm:block">Collaboration</span>}</header>
          <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-3 py-5 sm:px-6">
            {threadLoading ? <div className="space-y-4">{[1,2,3].map((item)=><Skeleton key={item} className={`h-16 rounded-2xl ${item === 2 ? 'ml-auto w-1/2' : 'w-2/3'}`}/>)}</div>
              : messages.length ? messages.map((message, index) => {
                const mine = !activeConversation.peers.some((peer) => peer.id === message.senderId)
                const showDay = index === 0 || !sameDay(messages[index - 1]?.createdAt, message.createdAt)
                const imageAttachment = message.attachment?.mimeType?.startsWith('image/')
                const videoAttachment = message.attachment?.mimeType?.startsWith('video/')
                return <div key={message.id}>
                  {showDay && <div className="my-5 flex items-center gap-3" role="separator"><span className="h-px flex-1 bg-white/[.06]"/><time className="rounded-full border border-white/[.07] bg-[#151515] px-3 py-1 text-[9px] font-semibold text-white/30">{formatDayLabel(message.createdAt)}</time><span className="h-px flex-1 bg-white/[.06]"/></div>}
                  <div className={`group mb-2 flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                    {!mine && <Avatar size="sm" src={message.sender?.avatarUrl || activeConversation.peers[0]?.avatarUrl} fallback={message.sender?.name || activeConversation.peers[0]?.name}/>}
                    <div className={`flex max-w-[82%] items-center gap-2 sm:max-w-[72%] ${mine ? 'flex-row-reverse' : ''}`}>
                      <div className={`min-w-0 overflow-hidden rounded-[1.2rem] text-xs shadow-sm ${mine ? 'rounded-br-md bg-pink text-black' : 'rounded-bl-md border border-white/[.07] bg-[#202020] text-white'}`}>
                        {editing?.id === message.id ? <div className="flex min-w-[15rem] items-center gap-2 p-3"><input autoFocus value={editing.body} onChange={(event)=>setEditing({id:message.id,body:event.target.value})} onKeyDown={(event)=>{if(event.key==='Enter'){event.preventDefault();saveEdit(message)}if(event.key==='Escape')setEditing(null)}} className="min-w-0 flex-1 bg-transparent outline-none"/><button type="button" className="grid size-7 place-items-center rounded-full hover:bg-black/10" onClick={()=>saveEdit(message)} aria-label="Save edit"><Check size={13}/></button><button type="button" className="grid size-7 place-items-center rounded-full hover:bg-black/10" onClick={()=>setEditing(null)} aria-label="Cancel edit"><X size={13}/></button></div> : <>
                          {imageAttachment && <a href={message.attachment.url} target="_blank" rel="noreferrer" className="block"><img src={message.attachment.url} alt={message.attachment.name || 'Shared image'} className="max-h-80 w-full min-w-[12rem] object-cover" loading="lazy"/></a>}
                          {videoAttachment && <video src={message.attachment.url} controls preload="metadata" className="max-h-80 w-full min-w-[14rem] bg-black"/>}
                          {message.attachment && !imageAttachment && !videoAttachment && <a href={message.attachment.url} target="_blank" rel="noreferrer" className="m-2.5 flex min-w-[13rem] items-center gap-3 rounded-xl border border-current/15 bg-black/[.06] p-3 transition hover:bg-black/10"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-current/10"><FileText size={16}/></span><span className="min-w-0"><strong className="block truncate text-[11px]">{message.attachment.name || 'Attachment'}</strong><small className="mt-1 block opacity-50">Open file</small></span></a>}
                          {message.body && <p className="whitespace-pre-wrap break-words px-3.5 pt-2.5 leading-5 last:pb-2.5">{message.body}</p>}
                          <span className={`flex items-center justify-end gap-1 px-3.5 pb-2 text-[8px] ${mine ? 'text-black/50' : 'text-white/30'}`}><time>{formatMessageTime(message.createdAt)}</time>{message.editedAt && <span>· edited</span>}{mine && <CheckCheck size={11}/>}</span>
                        </>}
                      </div>
                      {mine && !editing && <div className="flex translate-x-1 gap-0.5 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100"><button type="button" onClick={()=>setEditing({id:message.id,body:message.body || ''})} disabled={!message.body} aria-label="Edit message" className="grid size-8 place-items-center rounded-full text-white/35 transition hover:bg-white/[.07] hover:text-white disabled:hidden"><Edit3 size={12}/></button><button type="button" onClick={()=>remove(message.id)} aria-label="Delete message" className="grid size-8 place-items-center rounded-full text-white/35 transition hover:bg-red-400/10 hover:text-red-300"><Trash2 size={12}/></button></div>}
                    </div>
                  </div>
                </div>
              }) : <div className="grid h-full min-h-72 place-items-center"><EmptyState title="No messages yet" description="Start this private conversation with a friendly hello."/></div>}
            <div ref={messagesEndRef}/>
          </div>
          <form onSubmit={submit} className="sticky bottom-0 z-20 shrink-0 border-t border-white/[.08] bg-[#101010]/95 px-3 py-2 shadow-[0_-12px_30px_rgba(0,0,0,.14)] backdrop-blur-xl sm:px-4">
            {attachmentFile && <div className="mb-2 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[.045] p-2">
              {attachmentPreview ? <img src={attachmentPreview} alt="Attachment preview" className="size-9 rounded-lg object-cover" /> : <span className="grid size-9 place-items-center rounded-lg bg-white/[.06] text-white/50"><FileText size={15}/></span>}
              <span className="min-w-0 flex-1"><strong className="block truncate text-[11px]">{attachmentFile.name}</strong><small className="mt-1 block text-[9px] text-white/35">{(attachmentFile.size / 1024 / 1024).toFixed(2)} MB · ready to send</small></span>
              <button type="button" aria-label="Remove attachment" onClick={() => setAttachmentFile(null)} className="inline-flex size-8 items-center justify-center rounded-full p-0 leading-none text-white/45 transition hover:bg-white/[.07] hover:text-white"><X size={14} className="block"/></button>
            </div>}
            <div className="flex items-center gap-1.5 rounded-[1.1rem] border border-white/10 bg-white/[.045] p-1 transition focus-within:border-pink/60 focus-within:bg-white/[.06]">
              <label className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full p-0 leading-none text-white/40 transition hover:bg-white/[.07] hover:text-pink">
                <span className="sr-only">Attach a file</span><Paperclip size={14} className="block"/>
                <input aria-label="Attach a file" type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm,application/pdf" className="sr-only" onChange={chooseAttachment}/>
              </label>
              <textarea ref={composerRef} rows={1} aria-label="Message" value={draft} onChange={(event)=>{setDraft(event.target.value);event.target.style.height='auto';event.target.style.height=`${Math.min(event.target.scrollHeight,96)}px`}} onKeyDown={(event)=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();event.currentTarget.form?.requestSubmit()}}} placeholder="Write a message..." className="max-h-24 min-h-8 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-[11px] leading-4 outline-none placeholder:text-white/25"/>
              <button type="submit" disabled={sending || (!draft.trim() && !attachmentFile)} aria-label="Send message" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-pink p-0 leading-none text-black shadow-[0_6px_18px_rgba(255,118,189,.22)] transition hover:bg-[#ff92c8] active:scale-95 disabled:pointer-events-none disabled:bg-white/10 disabled:text-white/25 disabled:shadow-none"><Send size={13} className={`block translate-x-px ${sending ? 'animate-pulse' : ''}`}/></button>
            </div>
          </form>
        </> : <div className="grid flex-1 place-items-center p-6 text-center"><div><span className="mx-auto grid size-28 place-items-center rounded-full border-2 border-white/70 text-white"><Send size={40} strokeWidth={1.5}/></span><h3 className="mt-7 text-2xl font-medium tracking-[-.035em]">Your messages</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/40">Select a conversation from your inbox or search for someone to start chatting.</p><Button variant="pink" className="mt-6" onClick={()=>{setRequestMode(false);window.requestAnimationFrame(()=>conversationSearchRef.current?.focus())}}><MessageCircle size={15}/>Send message</Button></div></div>}
      </section>
    </div>
  </DashboardPage>
}

export function NotificationsPage({ role = 'creator' }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [preference, setPreference] = useState(null)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const result = await notificationApi.list({ limit: 100 }); setItems(result.items) }
    catch (requestError) { setError(errorMessage(requestError, 'Notifications could not be loaded.')) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load])
  useEffect(() => {
    notificationApi.preferences().then((result) => setPreference(result.preference)).catch(() => {})
  }, [])
  const togglePreference = async (key) => {
    const next = !preference[key]
    setPreference((current) => ({ ...current, [key]: next }))
    try {
      const result = await notificationApi.savePreferences({ [key]: next })
      setPreference(result.preference)
    } catch (requestError) {
      setPreference((current) => ({ ...current, [key]: !next }))
      toast(errorMessage(requestError, 'Email preference could not be updated.'), { type: 'error' })
    }
  }
  const open = async (item) => {
    if (item.unread) {
      try { await notificationApi.read(item.id); setItems((values)=>values.map((value)=>value.id===item.id?{...value,unread:false,readAt:new Date().toISOString()}:value)) }
      catch (requestError) { toast(errorMessage(requestError, 'Notification could not be updated.'), { type:'error' }); return }
    }
    if (item.href) navigate(item.href)
  }
  const markAll = async () => {
    try { await notificationApi.readAll(); setItems((values)=>values.map((item)=>({...item,unread:false,readAt:item.readAt||new Date().toISOString()}))) }
    catch (requestError) { toast(errorMessage(requestError, 'Notifications could not be updated.'), {type:'error'}) }
  }
  return <DashboardPage>
    <DashboardHeader eyebrow={`${role} updates`} title="Notifications" copy="Persistent account and collaboration events." action={<Button variant="outline" onClick={markAll} disabled={!items.some((item)=>item.unread)}><Check size={15}/>Mark all read</Button>}/>
    <DashboardPanel title="Recent notifications">
      {error ? <div role="alert" className="flex items-center justify-between text-xs text-red-200"><span>{error}</span><Button size="sm" variant="outline" onClick={load}>Retry</Button></div>
        : loading ? <div className="space-y-3">{[1,2,3,4].map((item)=><Skeleton key={item} className="h-20"/>)}</div>
        : items.length ? items.map((item)=><button type="button" key={item.id} onClick={()=>open(item)} className="flex w-full gap-4 border-b border-white/10 py-5 text-left transition last:border-0 hover:bg-white/[.025]"><span className={`mt-1 size-2 shrink-0 rounded-full ${item.unread?'bg-pink':'bg-white/15'}`}/><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.title}</strong><p className="mt-2 line-clamp-2 text-xs text-white/40">{item.body}</p><small className="mt-2 block text-[10px] text-white/25">{new Date(item.createdAt).toLocaleString()}</small></span><Badge variant="outline">{item.type.replaceAll('_',' ')}</Badge></button>)
        : <EmptyState title="No notifications" description="New campaign, contract and payment events will appear here."/>}
    </DashboardPanel>
    {preference && <DashboardPanel className="mt-5" title="Email preferences"><div className="grid gap-4 sm:grid-cols-2"><Switch label="Email notifications" description="Master email delivery switch. In-app notifications remain enabled." checked={preference.emailEnabled} onChange={() => togglePreference('emailEnabled')}/>{[['offerEmail','Offers'],['proposalEmail','Proposals'],['contractEmail','Contracts'],['paymentEmail','Payments'],['deliverableEmail','Deliverables'],['proofEmail','Publish proof'],['payoutEmail','Payouts'],['deadlineEmail','Deadlines']].map(([key,label]) => <Switch key={key} label={label} description={`Receive ${label.toLowerCase()} updates by email.`} checked={preference[key]} disabled={!preference.emailEnabled} onChange={() => togglePreference(key)}/>)}</div></DashboardPanel>}
  </DashboardPage>
}
