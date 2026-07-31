import { useMemo, useState } from 'react'
import { ArrowLeft, Check, Edit3, FileText, Link2, Paperclip, Search, Send, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DashboardHeader, DashboardPage, DashboardPanel } from '../../components/dashboard/DashboardUI'
import { Avatar, Badge, Button, EmptyState, useToast } from '../../components/ui'
import { notifications as staticNotifications } from '../../data/dashboard'
import { useCollaboration } from '../../context/collaboration-context'
import { useDashboardData } from '../../context/dashboard-data-context'

function readAttachment(file, callback) {
  if (!file) return callback(null)
  const reader = new FileReader()
  reader.onload = () => callback({
    name: file.name,
    type: file.type,
    size: file.size,
    dataUrl: String(reader.result || ''),
  })
  reader.readAsDataURL(file)
}

export function MessagesPage({ role }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { conversations, markConversationRead, sendMessage, editMessage, deleteMessage } = useDashboardData()
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState(conversations[0]?.id)
  const [draft, setDraft] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [editing, setEditing] = useState(null)
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false)
  const filtered = useMemo(() => conversations.filter((item) => {
    const last = item.messages.at(-1)?.text || ''
    return `${item.name} ${last}`.toLowerCase().includes(query.toLowerCase())
  }), [conversations, query])
  const active = conversations.find((item) => item.id === activeId) || filtered[0]
  const openConversation = (id) => {
    setActiveId(id)
    markConversationRead(id)
    setMobileThreadOpen(true)
  }
  const submit = (event) => {
    event.preventDefault()
    if (!active || (!draft.trim() && !attachment)) return
    sendMessage(active.id, { text: draft, attachment })
    setDraft('')
    setAttachment(null)
    toast('Message saved in this browser.', { type: 'success' })
  }
  const saveEdit = (message) => {
    if (!editing?.text.trim()) return
    editMessage(active.id, message.id, editing.text)
    setEditing(null)
  }

  return <DashboardPage>
    <DashboardHeader eyebrow={`${role} channel`} title="Messages" copy="Search conversations, send messages and attachments, and jump to linked campaign resources." />
    <div className="grid min-h-[680px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[.025] lg:grid-cols-[21rem_1fr]">
      <aside className={`${mobileThreadOpen ? 'hidden lg:block' : 'block'} border-b border-white/10 lg:border-b-0 lg:border-r`}>
        <div className="p-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input aria-label="Search conversations" value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-white/[.04] pl-9 pr-3 text-xs outline-none focus:border-pink" placeholder="Search people or messages" />
          </div>
        </div>
        {filtered.length ? filtered.map((item) => {
          const last = item.messages.at(-1)
          return <button type="button" key={item.id} onClick={() => openConversation(item.id)} className={`flex w-full items-center gap-3 border-t border-white/[.07] p-4 text-left ${active?.id === item.id ? 'bg-white/[.07]' : 'hover:bg-white/[.035]'}`}>
            <span className="relative"><Avatar size="sm" fallback={item.avatar} />{item.online && <i className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-[#151515] bg-mint" />}</span>
            <span className="min-w-0 flex-1"><strong className="block truncate text-xs">{item.name}</strong><small className="mt-1 block truncate text-white/35">{last?.attachment ? `📎 ${last.attachment.name}` : last?.text || 'No messages'}</small></span>
            {item.unread > 0 && <i className="grid size-5 place-items-center rounded-full bg-pink text-[9px] not-italic text-black">{item.unread}</i>}
          </button>
        }) : <div className="p-4"><EmptyState title="No conversations found" description="Try another search term." /></div>}
      </aside>

      {active ? <section className={`${mobileThreadOpen ? 'flex' : 'hidden'} min-w-0 flex-col lg:flex`}>
        <header className="flex flex-wrap items-center gap-3 border-b border-white/10 p-4">
          <button type="button" aria-label="Back to conversations" onClick={() => setMobileThreadOpen(false)} className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 text-white/60 lg:hidden"><ArrowLeft size={15} /></button>
          <Avatar fallback={active.avatar} />
          <span><strong className="block text-sm">{active.name}</strong><small className={active.online ? 'text-mint' : 'text-white/35'}>{active.online ? 'Online now' : 'Offline'} · linked workspace</small></span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate(`/${role}/campaigns/${active.campaignId}`)}><Link2 size={13} />Campaign</Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`/${role}/contracts/${active.contractId}`)}><FileText size={13} />Contract</Button>
          </div>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
          {active.messages.map((message) => <div key={message.id} className={`group flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[min(34rem,85%)] rounded-2xl p-4 ${message.sender === 'me' ? 'rounded-tr-sm bg-pink text-black' : 'rounded-tl-sm bg-white/[.07] text-white/75'}`}>
              {editing?.id === message.id ? <div className="flex gap-2"><input autoFocus value={editing.text} onChange={(event) => setEditing({ ...editing, text: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-black/15 bg-white/70 px-3 py-2 text-xs text-black outline-none" /><button onClick={() => saveEdit(message)} aria-label="Save edit"><Check size={15} /></button><button onClick={() => setEditing(null)} aria-label="Cancel edit"><X size={15} /></button></div> : <>
                {message.text && <p className="text-sm leading-6">{message.text}</p>}
                {message.attachment && <a href={message.attachment.dataUrl} download={message.attachment.name} className={`mt-3 flex items-center gap-2 rounded-xl border p-3 text-xs ${message.sender === 'me' ? 'border-black/15' : 'border-white/10'}`}><Paperclip size={14} /><span className="truncate">{message.attachment.name}</span></a>}
              </>}
              <div className={`mt-2 flex items-center justify-end gap-2 text-[9px] ${message.sender === 'me' ? 'text-black/45' : 'text-white/25'}`}>
                {message.editedAt && <span>edited</span>}<time>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>{message.sender === 'me' && <span>{message.status}</span>}
              </div>
              {message.sender === 'me' && editing?.id !== message.id && <div className="mt-2 hidden justify-end gap-2 group-hover:flex group-focus-within:flex"><button onClick={() => setEditing({ id: message.id, text: message.text })} aria-label="Edit message"><Edit3 size={12} /></button><button onClick={() => deleteMessage(active.id, message.id)} aria-label="Delete message"><Trash2 size={12} /></button></div>}
            </div>
          </div>)}
          {draft.trim() && <p className="text-[10px] text-white/30">You are typing…</p>}
        </div>
        {attachment && <div className="flex items-center gap-2 border-t border-white/10 px-4 py-2 text-xs text-white/50"><Paperclip size={13} /><span className="truncate">{attachment.name}</span><button className="ml-auto" onClick={() => setAttachment(null)} aria-label="Remove attachment"><X size={14} /></button></div>}
        <form onSubmit={submit} className="flex gap-2 border-t border-white/10 p-4">
          <label className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-white/10 hover:bg-white/[.05]">
            <span className="sr-only">Attach image or file</span><Paperclip size={15} />
            <input type="file" className="sr-only" accept="image/*,.pdf,.doc,.docx" onChange={(event) => readAttachment(event.target.files?.[0], setAttachment)} />
          </label>
          <input aria-label="Write a message" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message..." className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[.04] px-4 text-sm outline-none focus:border-pink" />
          <Button type="submit" variant="pink" aria-label="Send message" disabled={!draft.trim() && !attachment}><Send size={15} /></Button>
        </form>
      </section> : <div className="grid place-items-center p-6"><EmptyState title="Choose a conversation" description="Select a thread from the conversation list." /></div>}
    </div>
  </DashboardPage>
}

export function NotificationsPage({ role = 'creator' }) {
  const navigate = useNavigate()
  const {
    notifications: workflowNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useCollaboration()
  const { notificationReadIds, markStaticNotificationRead, markAllStaticNotificationsRead } = useDashboardData()
  const roleWorkflow = workflowNotifications.filter((item) => item.role === role)
  const targets = {
    n1: role === 'creator' ? '/creator/work-requests' : '/business/responses',
    n2: `/${role}/contracts/ctr-8821`,
    n3: `/${role}/campaigns/city-in-motion`,
  }
  const items = [
    ...roleWorkflow.map((item) => ({ ...item, workflow: true, time: new Date(item.createdAt).toLocaleString() })),
    ...staticNotifications.map((item) => ({ ...item, workflow: false, unread: item.unread && !notificationReadIds.includes(item.id) })),
  ]
  const open = (item) => {
    if (item.workflow) markNotificationRead(item.id)
    else markStaticNotificationRead(item.id)
    navigate(item.workflow ? item.href : targets[item.id])
  }
  const markAll = () => {
    markAllNotificationsRead(role)
    markAllStaticNotificationsRead(staticNotifications.map((item) => item.id))
  }
  return <DashboardPage>
    <DashboardHeader eyebrow={`${role} updates`} title="Notifications" copy="Persistent local read state with role-safe campaign, contract and collaboration deep-links." action={<Button variant="outline" onClick={markAll}><Check size={15} />Mark all read</Button>} />
    <DashboardPanel title="Recent notifications">
      {items.map((item) => <button type="button" key={`${item.workflow ? 'workflow' : 'static'}-${item.id}`} onClick={() => open(item)} className="flex w-full gap-4 border-b border-white/10 py-5 text-left transition last:border-0 hover:bg-white/[.025] focus-visible:bg-white/[.04]">
        <span className={`mt-1 size-2 shrink-0 rounded-full ${item.unread ? 'bg-pink' : 'bg-white/15'}`} />
        <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.title}</strong><p className="mt-2 line-clamp-2 text-xs text-white/40">{item.copy}</p><small className="mt-2 block text-[10px] text-white/25">{item.time}</small></span>
        <Badge variant="outline">{item.workflow ? 'Workspace' : 'Platform'}</Badge>
      </button>)}
    </DashboardPanel>
  </DashboardPage>
}
