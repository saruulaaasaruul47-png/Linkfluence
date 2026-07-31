import { useState } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  Eye,
  FileCheck2,
  FileSignature,
  FileText,
  FolderOpen,
  Globe2,
  History,
  Image,
  Landmark,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target,
  UploadCloud,
  UserRound,
  Users,
  Video,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { DashboardPage, Progress } from '../../components/dashboard/DashboardUI'
import { AuroraBackground, Badge, Button, FileUpload, Input, SpotlightCard, Textarea, useToast } from '../../components/ui'
import { useCollaboration } from '../../context/collaboration-context'

const workspaceTabs = [
  { value: 'overview', label: 'Overview', icon: LayoutDashboard },
  { value: 'negotiation', label: 'Negotiation', icon: SlidersHorizontal },
  { value: 'agreement', label: 'Agreement', icon: FileCheck2 },
  { value: 'tasks', label: 'Tasks', icon: ListChecks },
  { value: 'files', label: 'Files', icon: FolderOpen },
  { value: 'timeline', label: 'Timeline', icon: CalendarDays },
  { value: 'contract', label: 'Contract', icon: FileSignature },
  { value: 'payment', label: 'Payment', icon: CreditCard },
  { value: 'deliverables', label: 'Deliverables', icon: PackageCheck },
  { value: 'activity', label: 'Activity', icon: Activity },
]

const termFields = [
  { key: 'deliverables', label: 'Deliverables', placeholder: '2 Instagram Reels, 2 Stories', span: true },
  { key: 'contentType', label: 'Content type', placeholder: 'Lifestyle storytelling Reel' },
  { key: 'contentCount', label: 'Content quantity', placeholder: '4 assets' },
  { key: 'draftDeadline', label: 'Draft deadline', type: 'date' },
  { key: 'finalDeadline', label: 'Final deadline', type: 'date' },
  { key: 'publishDate', label: 'Publish date', type: 'date' },
  { key: 'revisionLimit', label: 'Revision limit', placeholder: '2 revision rounds' },
  { key: 'usageRights', label: 'Usage rights', placeholder: 'Organic social · 90 days', span: true },
  { key: 'paymentTerms', label: 'Payment terms', placeholder: '50% funded · 50% on approval', span: true },
]

function asText(value, fallback = '—') {
  if (Array.isArray(value)) return value.join(', ')
  if (value && typeof value === 'object') return value.name || value.title || value.label || fallback
  return value || fallback
}

function titleCase(value) {
  return String(value || 'Draft')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value, fallback = 'Not scheduled') {
  if (!value) return fallback
  if (typeof value === 'string' && !/\d{4}/.test(value)) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed)
}

function formatMoney(value) {
  if (typeof value === 'number') return `${new Intl.NumberFormat('en-US').format(value)}₮`
  return value || 'Not set'
}

function downloadContractDocument({ campaign, business, creator, terms, version }) {
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character])
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${safe(campaign)} contract</title><style>body{font:16px/1.65 Georgia,serif;max-width:760px;margin:48px auto;padding:0 24px;color:#171717}header{border-bottom:1px solid #bbb;padding-bottom:20px;margin-bottom:32px}small{color:#666}h2{font-size:18px;margin-top:28px}button{margin-bottom:24px;padding:10px 16px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print / Save as PDF</button><header><small>Creator services agreement · Version ${safe(version)}</small><h1>${safe(campaign)}</h1><p>${safe(business)} × ${safe(creator)}</p></header><h2>1. Parties and scope</h2><p>${safe(business)} engages ${safe(creator)} to produce ${safe(terms.deliverables)}.</p><h2>2. Compensation</h2><p>${safe(formatMoney(terms.budget))}. ${safe(terms.paymentTerms)}</p><h2>3. Delivery and revisions</h2><p>Final deadline: ${safe(formatDate(terms.finalDeadline))}. ${safe(terms.revisionLimit)}</p><h2>4. Usage rights</h2><p>${safe(terms.usageRights)}</p><small>Frontend preview generated ${safe(new Date().toLocaleString())}. Legal signatures require backend verification.</small></body></html>`
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${String(campaign || 'contract').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-v${version}.html`
  anchor.click()
  URL.revokeObjectURL(url)
}

function getItemRole(item) {
  const value = String(item?.role || item?.actor || item?.addedBy || item?.uploadedBy || '').toLowerCase()
  if (value.includes('creator')) return 'creator'
  if (value.includes('business')) return 'business'
  return 'system'
}

function getApproval(record, role) {
  if (!record) return false
  if (record.approvals && typeof record.approvals === 'object') return Boolean(record.approvals[role])
  if (Array.isArray(record.approvedBy)) return record.approvedBy.includes(role)
  return Boolean(record[`${role}Approved`] || record[`${role}Signed`])
}

function getTerms(workspace) {
  const source = workspace?.terms || workspace?.agreement?.terms || {}
  return {
    deliverables: asText(source.deliverables || workspace?.deliverablesSummary, ''),
    contentType: asText(source.contentType, ''),
    contentCount: asText(source.contentCount || source.quantity, ''),
    draftDeadline: source.draftDeadline || '',
    finalDeadline: source.finalDeadline || workspace?.deadline || '',
    publishDate: source.publishDate || '',
    revisionLimit: source.revisionLimit ?? '',
    usageRights: asText(source.usageRights, ''),
    paymentTerms: asText(source.paymentTerms, ''),
    additionalRequirements: asText(source.additionalRequirements, ''),
    budget: source.budget ?? workspace?.budget ?? '',
  }
}

function getProgress(workspace) {
  if (Number.isFinite(workspace?.progress)) return Math.min(100, Math.max(0, workspace.progress))
  const statusProgress = {
    NEGOTIATION: 18,
    AGREEMENT_PENDING: 30,
    AGREEMENT_APPROVED: 42,
    CONTRACT_PENDING: 50,
    CONTRACT_ACTIVE: 62,
    PAYMENT_REQUIRED: 68,
    IN_PROGRESS: 76,
    IN_REVIEW: 88,
    COMPLETED: 100,
  }
  return statusProgress[String(workspace?.status || '').toUpperCase()] ?? 12
}

function getActivity(workspace) {
  return workspace?.activity || workspace?.activities || workspace?.timeline || []
}

function Panel({ title, description, action, children, className = '' }) {
  return (
    <SpotlightCard as="section" className={`min-w-0 rounded-[1.4rem] border border-white/10 bg-white/[.028] p-5 transition duration-300 hover:border-white/20 sm:p-6 ${className}`}>
      <header className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-[-.035em]">{title}</h2>
          {description && <p className="mt-1.5 max-w-2xl text-xs leading-5 text-white/38">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </SpotlightCard>
  )
}

function Detail({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/[.08] bg-black/10 p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.11em] text-white/28">
        {Icon && <Icon size={13} />}
        {label}
      </div>
      <p className="mt-2.5 break-words text-sm font-semibold leading-5">{value || '—'}</p>
    </div>
  )
}

function EmptyBlock({ icon: Icon, title, copy, action, actionLabel }) {
  return (
    <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[.015] p-6 text-center">
      <div>
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-white/[.055] text-white/40"><Icon size={19} /></span>
        <h3 className="mt-4 text-sm font-bold">{title}</h3>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-white/35">{copy}</p>
        {action && <Button size="sm" variant="outline" className="mt-4" onClick={action}>{actionLabel || 'Continue'}</Button>}
      </div>
    </div>
  )
}

function ApprovalState({ title, approved, accent }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 ${approved ? 'border-mint/25 bg-mint/[.06]' : 'border-white/10 bg-white/[.02]'}`}>
      <span className={`grid size-8 shrink-0 place-items-center rounded-full ${approved ? 'bg-mint text-black' : accent === 'mint' ? 'bg-mint/10 text-mint' : 'bg-pink/10 text-pink'}`}>
        {approved ? <Check size={15} /> : <Clock3 size={14} />}
      </span>
      <span>
        <strong className="block text-xs">{title}</strong>
        <small className={approved ? 'text-mint/70' : 'text-white/30'}>{approved ? 'Approved' : 'Awaiting approval'}</small>
      </span>
    </div>
  )
}

function FileIcon({ file }) {
  const type = String(file?.type || file?.mimeType || '').toLowerCase()
  const name = String(file?.name || '').toLowerCase()
  if (type.includes('video') || /\.(mp4|mov|webm)$/.test(name)) return <Video size={18} />
  if (type.includes('image') || /\.(png|jpe?g|webp|gif)$/.test(name)) return <Image size={18} />
  return <FileText size={18} />
}

export default function CollaborationWorkspacePage({ role: suppliedRole }) {
  const params = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const {
    getWorkspace,
    updateTerms,
    lockAgreement,
    approveAgreement,
    requestAgreementChanges,
    approveContract,
    requestContractChanges,
    fundWorkspace,
    toggleTask,
    addFile,
    submitDeliverable,
    reviewDeliverable,
    submitReview,
    publishShowcase,
    addActivity,
    isLoading,
  } = useCollaboration()

  const workspaceId = params.workspaceId || params.id
  const role = suppliedRole || params.role || (window.location.pathname.startsWith('/creator') ? 'creator' : 'business')
  const workspace = getWorkspace(workspaceId)
  const accent = role === 'creator' ? 'pink' : 'mint'
  const [activeTab, setActiveTab] = useState('overview')
  const [termsDraft, setTermsDraft] = useState(() => getTerms(workspace))
  const [agreementNote, setAgreementNote] = useState('')
  const [contractNote, setContractNote] = useState('')
  const [activityText, setActivityText] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [deliverableFile, setDeliverableFile] = useState(null)
  const [deliverableNote, setDeliverableNote] = useState('')
  const [reviewNotes, setReviewNotes] = useState({})
  const [rating, setRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [busyAction, setBusyAction] = useState('')
  const [fileUploadVersion, setFileUploadVersion] = useState(0)
  const [deliverableUploadVersion, setDeliverableUploadVersion] = useState(0)

  const runAction = async (key, action, success) => {
    setBusyAction(key)
    try {
      await action()
      toast(success, { type: 'success' })
    } catch (error) {
      toast(error?.message || 'That action could not be completed.', { type: 'error' })
    } finally {
      setBusyAction('')
    }
  }

  if (!workspace) {
    return (
      <DashboardPage>
        <button type="button" onClick={() => navigate(`/${role}/dashboard`)} className="mb-6 flex items-center gap-2 text-xs text-white/40 transition hover:text-white">
          <ArrowLeft size={14} /> Back to dashboard
        </button>
        <EmptyBlock
          icon={isLoading ? History : AlertCircle}
          title={isLoading ? 'Loading workspace...' : 'Workspace not found'}
          copy={isLoading ? 'Fetching the latest agreement, contract and payment state.' : 'This collaboration may have been removed, or the workspace link is no longer valid.'}
        />
      </DashboardPage>
    )
  }

  const businessName = asText(workspace.business, workspace.businessName || 'Business')
  const creatorName = asText(workspace.creator, workspace.creatorName || 'Creator')
  const campaignName = asText(workspace.campaign, workspace.campaignName || workspace.title || 'Collaboration')
  const status = titleCase(workspace.status)
  const progress = getProgress(workspace)
  const terms = workspace.terms || workspace.agreement?.terms || termsDraft
  const agreement = workspace.agreement || {}
  const contract = workspace.contract || {}
  const payment = workspace.payment || {}
  const tasks = workspace.tasks || []
  const files = workspace.files || []
  const deliverables = workspace.deliverables || []
  const activities = getActivity(workspace)
  const agreementLocked = Boolean(agreement.locked || workspace.agreementLocked)
  const agreementBusinessApproved = getApproval(agreement, 'business')
  const agreementCreatorApproved = getApproval(agreement, 'creator')
  const agreementApproved = agreementBusinessApproved && agreementCreatorApproved
  const contractBusinessApproved = getApproval(contract, 'business')
  const contractCreatorApproved = getApproval(contract, 'creator')
  const contractActive = Boolean(contract.active || contract.status === 'ACTIVE' || workspace.contractActive || (contractBusinessApproved && contractCreatorApproved))
  const paymentFunded = Boolean(payment.funded || ['FUNDED', 'RELEASED'].includes(payment.status) || workspace.paymentFunded)
  const allDeliverablesApproved = deliverables.length > 0 && deliverables.every((item) => String(item.status).toUpperCase() === 'APPROVED')
  const isCompleted = String(workspace.status).toUpperCase() === 'COMPLETED' || allDeliverablesApproved
  const reviews = workspace.reviews || {}
  const currentReview = reviews[role]
  const bothReviewsSubmitted = Boolean(reviews.creator && reviews.business)
  const currentRoleAgreementApproved = role === 'creator' ? agreementCreatorApproved : agreementBusinessApproved
  const currentRoleContractApproved = role === 'creator' ? contractCreatorApproved : contractBusinessApproved
  const completedTasks = tasks.filter((task) => task.completed || task.done || task.status === 'COMPLETED').length
  const nextDeadline = workspace.nextDeadline || terms.finalDeadline || termsDraft.finalDeadline

  const updateDraft = (key, value) => setTermsDraft((current) => ({ ...current, [key]: value }))

  const saveTerms = (event) => {
    event.preventDefault()
    runAction(
      'terms',
      () => updateTerms(workspaceId, { ...termsDraft, budget: termsDraft.budget === '' ? '' : Number(termsDraft.budget) || termsDraft.budget }, role),
      'Negotiation terms saved.',
    )
  }

  const uploadSharedFile = () => {
    if (!selectedFile) return
    runAction('file', () => addFile(workspaceId, selectedFile, role), `${selectedFile.name} added to workspace.`)
    setSelectedFile(null)
    setFileUploadVersion((current) => current + 1)
  }

  const uploadDeliverable = () => {
    if (!deliverableFile) return
    runAction(
      'deliverable',
      () => submitDeliverable(workspaceId, deliverableFile, role, deliverableNote.trim()),
      'Deliverable submitted for review.',
    )
    setDeliverableFile(null)
    setDeliverableNote('')
    setDeliverableUploadVersion((current) => current + 1)
  }

  const requestDeliverableRevision = (deliverableId) => {
    const note = reviewNotes[deliverableId]?.trim()
    if (!note) return
    runAction(
      `revision-${deliverableId}`,
      () => reviewDeliverable(workspaceId, deliverableId, 'REVISION_REQUESTED', note),
      'Revision request sent to the creator.',
    )
    setReviewNotes((current) => ({ ...current, [deliverableId]: '' }))
  }

  const renderOverview = () => (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Detail icon={Target} label="Campaign" value={campaignName} />
        <Detail icon={Building2} label="Business" value={businessName} />
        <Detail icon={UserRound} label="Creator" value={creatorName} />
        <Detail icon={CalendarDays} label="Next deadline" value={formatDate(nextDeadline)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,.85fr)]">
        <Panel title="Project progress" description="A live view of the collaboration from terms through final approval.">
          <div className="flex items-end justify-between gap-4">
            <div>
              <strong className="text-4xl tracking-[-.065em]">{progress}%</strong>
              <p className="mt-2 text-xs text-white/35">{status}</p>
            </div>
            <Badge variant={isCompleted ? 'mint' : accent}>{status}</Badge>
          </div>
          <div className="mt-6"><Progress value={progress} color={accent} /></div>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Agreement', agreementApproved],
              ['Contract', contractActive],
              ['Payment', paymentFunded],
              ['Delivery', allDeliverablesApproved],
            ].map(([label, done]) => (
              <div key={label} className={`rounded-xl border p-3 ${done ? 'border-mint/25 bg-mint/[.06]' : 'border-white/10'}`}>
                {done ? <CheckCircle2 size={16} className="text-mint" /> : <Circle size={16} className="text-white/20" />}
                <p className={`mt-2 text-[11px] font-semibold ${done ? 'text-mint' : 'text-white/38'}`}>{label}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Current focus" description={role === 'creator' ? 'Actions assigned to the creator channel.' : 'Actions assigned to the business channel.'}>
          <div className="space-y-2">
            {!agreementLocked && (
              <button type="button" onClick={() => setActiveTab('negotiation')} className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-3 text-left transition hover:bg-white/[.04]">
                <SlidersHorizontal size={16} className={accent === 'mint' ? 'text-mint' : 'text-pink'} />
                <span className="flex-1 text-xs font-semibold">Finalize collaboration terms</span><ChevronRight size={14} className="text-white/25" />
              </button>
            )}
            {agreementLocked && !currentRoleAgreementApproved && (
              <button type="button" onClick={() => setActiveTab('agreement')} className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-3 text-left transition hover:bg-white/[.04]">
                <FileCheck2 size={16} className={accent === 'mint' ? 'text-mint' : 'text-pink'} />
                <span className="flex-1 text-xs font-semibold">Review and approve agreement</span><ChevronRight size={14} className="text-white/25" />
              </button>
            )}
            {agreementApproved && !currentRoleContractApproved && (
              <button type="button" onClick={() => setActiveTab('contract')} className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-3 text-left transition hover:bg-white/[.04]">
                <FileSignature size={16} className={accent === 'mint' ? 'text-mint' : 'text-pink'} />
                <span className="flex-1 text-xs font-semibold">Review collaboration contract</span><ChevronRight size={14} className="text-white/25" />
              </button>
            )}
            {contractActive && !paymentFunded && (
              <button type="button" onClick={() => setActiveTab('payment')} className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-3 text-left transition hover:bg-white/[.04]">
                <CircleDollarSign size={16} className={accent === 'mint' ? 'text-mint' : 'text-pink'} />
                <span className="flex-1 text-xs font-semibold">{role === 'business' ? 'Fund the collaboration' : 'Track payment funding'}</span><ChevronRight size={14} className="text-white/25" />
              </button>
            )}
            {paymentFunded && !allDeliverablesApproved && (
              <button type="button" onClick={() => setActiveTab('deliverables')} className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-3 text-left transition hover:bg-white/[.04]">
                <PackageCheck size={16} className={accent === 'mint' ? 'text-mint' : 'text-pink'} />
                <span className="flex-1 text-xs font-semibold">{role === 'creator' ? 'Submit campaign deliverables' : 'Review campaign deliverables'}</span><ChevronRight size={14} className="text-white/25" />
              </button>
            )}
            {isCompleted && (
              <div className="flex items-center gap-3 rounded-xl border border-mint/20 bg-mint/[.06] p-3">
                <BadgeCheck size={17} className="text-mint" />
                <span className="text-xs font-semibold text-mint">Collaboration completed</span>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Tasks"
          description={`${completedTasks} of ${tasks.length} workspace tasks completed.`}
          action={<Button size="sm" variant="ghost" onClick={() => setActiveTab('tasks')}>View tasks</Button>}
        >
          {tasks.length ? (
            <div className="space-y-1">
              {tasks.slice(0, 4).map((task) => {
                const done = task.completed || task.done || task.status === 'COMPLETED'
                return (
                  <div key={task.id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-white/[.025]">
                    <span className={`grid size-6 shrink-0 place-items-center rounded-full border ${done ? 'border-mint bg-mint text-black' : 'border-white/15 text-white/25'}`}>{done && <Check size={12} />}</span>
                    <span className={`min-w-0 flex-1 truncate text-xs font-semibold ${done ? 'text-white/35 line-through' : ''}`}>{task.title || task.text}</span>
                    {(task.dueDate || task.due) && <small className="shrink-0 text-[10px] text-white/28">{formatDate(task.dueDate || task.due)}</small>}
                  </div>
                )
              })}
            </div>
          ) : <EmptyBlock icon={ListChecks} title="No tasks yet" copy="Tasks appear here as the agreement moves into production." />}
        </Panel>

        <Panel
          title="Recent activity"
          description="The latest decisions and updates across this workspace."
          action={<Button size="sm" variant="ghost" onClick={() => setActiveTab('activity')}>View all</Button>}
        >
          {activities.length ? (
            <div className="space-y-4">
              {activities.slice(0, 4).map((item, index) => (
                <div key={item.id || `${item.text}-${index}`} className="flex gap-3">
                  <span className={`mt-1 size-2 shrink-0 rounded-full ${getItemRole(item) === 'creator' ? 'bg-pink' : getItemRole(item) === 'business' ? 'bg-mint' : 'bg-white/25'}`} />
                  <span className="min-w-0">
                    <p className="text-xs leading-5 text-white/65">{item.text || item.title}</p>
                    <small className="mt-1 block text-[10px] text-white/25">{asText(item.actor || item.role, 'System')} · {item.time || formatDate(item.createdAt || item.date)}</small>
                  </span>
                </div>
              ))}
            </div>
          ) : <EmptyBlock icon={History} title="No activity yet" copy="Approvals, uploads and project notes will create a shared record here." />}
        </Panel>
      </div>

      {isCompleted && (
        <Panel title="Close the loop" description="Share feedback, then turn approved work into a public showcase case study.">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div>
              <p className="ui-label">Your rating</p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    type="button"
                    aria-label={`${value} stars`}
                    key={value}
                    onClick={() => setRating(value)}
                    disabled={Boolean(currentReview)}
                    className={`grid size-10 place-items-center rounded-full transition ${value <= (currentReview?.rating || rating) ? 'bg-pink text-black' : 'bg-white/[.05] text-white/25 hover:text-white'} disabled:cursor-default`}
                  >
                    <Star size={15} fill="currentColor" />
                  </button>
                ))}
              </div>
              {currentReview ? (
                <div className="mt-4 rounded-xl border border-mint/20 bg-mint/[.06] p-4">
                  <div className="flex items-center gap-2 text-mint"><CheckCircle2 size={16} /><strong className="text-xs">Your review is published</strong></div>
                  <p className="mt-2 text-xs leading-5 text-white/48">{currentReview.comment}</p>
                </div>
              ) : (
                <>
                  <Textarea className="mt-4" label="Collaboration review" value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="Share useful, professional feedback about the collaboration." />
                  <Button
                    className="mt-3"
                    variant={accent}
                    disabled={reviewComment.trim().length < 10}
                    loading={busyAction === 'review'}
                    onClick={() => runAction('review', () => submitReview(workspaceId, role, rating, reviewComment.trim()), 'Review published.')}
                  >
                    <Star size={15} /> Submit review
                  </Button>
                </>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
              <Sparkles className={accent === 'mint' ? 'text-mint' : 'text-pink'} size={22} />
              <h3 className="mt-4 font-bold">Publish to Showcase</h3>
              <p className="mt-2 text-xs leading-5 text-white/38">Feature the campaign, partners and final approved media in the public marketplace.</p>
              {role === 'business' ? (
                <Button
                  className="mt-5 w-full"
                  variant="mint"
                  disabled={workspace.showcasePublished || !bothReviewsSubmitted}
                  loading={busyAction === 'showcase'}
                  onClick={() => runAction('showcase', () => publishShowcase(workspaceId), 'Collaboration published to Showcase.')}
                >
                  <Globe2 size={15} /> {workspace.showcasePublished ? 'Already published' : bothReviewsSubmitted ? 'Publish showcase' : 'Waiting for reviews'}
                </Button>
              ) : <p className="mt-5 rounded-xl bg-white/[.04] p-3 text-xs text-white/40">The business channel controls public showcase publishing.</p>}
            </div>
          </div>
        </Panel>
      )}
    </div>
  )

  const renderNegotiation = () => (
    <Panel
      title="Structured negotiation"
      description="Edit the project scope as clear fields. Every save is recorded in Activity, so both parties see the same working version."
      action={<Badge variant={agreementLocked ? 'mint' : accent}>{agreementLocked ? 'Terms locked' : 'Open for edits'}</Badge>}
    >
      <form onSubmit={saveTerms}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            className="sm:col-span-2"
            label="Final budget (MNT)"
            type="text"
            value={termsDraft.budget}
            onChange={(event) => updateDraft('budget', event.target.value)}
            placeholder="MNT 1,500,000"
            disabled={agreementLocked}
          />
          {termFields.map((field) => (
            <Input
              key={field.key}
              className={field.span ? 'sm:col-span-2' : ''}
              label={field.label}
              type={field.type || 'text'}
              min={field.type === 'number' ? '0' : undefined}
              value={termsDraft[field.key]}
              onChange={(event) => updateDraft(field.key, event.target.value)}
              placeholder={field.placeholder}
              disabled={agreementLocked}
            />
          ))}
          <Textarea
            className="sm:col-span-2"
            rows={5}
            label="Additional requirements"
            value={termsDraft.additionalRequirements}
            onChange={(event) => updateDraft('additionalRequirements', event.target.value)}
            placeholder="Brand guidelines, disclosure language, file formats and any production constraints."
            disabled={agreementLocked}
          />
        </div>
        {!agreementLocked && (
          <div className="mt-6 flex flex-col justify-between gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center">
            <p className="text-xs leading-5 text-white/35">Saving updates the shared working terms. It does not approve the agreement.</p>
            <Button type="submit" variant={accent} loading={busyAction === 'terms'}><Save size={15} /> Save terms</Button>
          </div>
        )}
      </form>
      {agreementLocked && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-mint/20 bg-mint/[.06] p-4 text-xs text-mint">
          <LockKeyhole size={16} className="shrink-0" /> The working terms are locked. Continue to Agreement for both-party approval.
        </div>
      )}
    </Panel>
  )

  const agreementDetails = [
    ['Final budget', formatMoney(terms.budget ?? termsDraft.budget), CircleDollarSign],
    ['Deliverables', asText(terms.deliverables || termsDraft.deliverables), PackageCheck],
    ['Draft deadline', formatDate(terms.draftDeadline || termsDraft.draftDeadline), Clock3],
    ['Final deadline', formatDate(terms.finalDeadline || termsDraft.finalDeadline), CalendarDays],
    ['Revision limit', asText(terms.revisionLimit ?? termsDraft.revisionLimit), RotateCcw],
    ['Usage rights', asText(terms.usageRights || termsDraft.usageRights), ShieldCheck],
    ['Payment terms', asText(terms.paymentTerms || termsDraft.paymentTerms), ReceiptText],
    ['Requirements', asText(terms.additionalRequirements || termsDraft.additionalRequirements), FileText],
  ]

  const renderAgreement = () => (
    <div className="space-y-5">
      <Panel
        title="Collaboration agreement"
        description="A readable summary generated from the latest structured negotiation terms."
        action={<Badge variant={agreementApproved ? 'mint' : agreementLocked ? accent : 'outline'}>{agreementApproved ? 'Approved' : agreementLocked ? 'Awaiting approvals' : 'Draft'}</Badge>}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {agreementDetails.map(([label, value, Icon]) => <Detail key={label} label={label} value={value} icon={Icon} />)}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel title="Party approvals" description="Both channels must approve the same locked version before a contract becomes available.">
          <div className="grid gap-3 sm:grid-cols-2">
            <ApprovalState title={businessName} approved={agreementBusinessApproved} accent="mint" />
            <ApprovalState title={creatorName} approved={agreementCreatorApproved} accent="pink" />
          </div>
        </Panel>

        <Panel title="Your decision" description={`You are acting as ${titleCase(role)}.`}>
          {!agreementLocked && role === 'business' && (
            <Button
              className="w-full"
              variant="mint"
              loading={busyAction === 'lock'}
              onClick={() => runAction('lock', () => lockAgreement(workspaceId), 'Agreement locked for approval.')}
            >
              <LockKeyhole size={15} /> Lock final agreement
            </Button>
          )}
          {!agreementLocked && role === 'creator' && (
            <div className="rounded-xl border border-white/10 bg-white/[.025] p-4 text-xs leading-5 text-white/42">
              The business channel is preparing the final agreement. You can still update terms in Negotiation.
            </div>
          )}
          {agreementLocked && !currentRoleAgreementApproved && (
            <div className="space-y-3">
              <Button
                className="w-full"
                variant={accent}
                loading={busyAction === 'approve-agreement'}
                onClick={() => runAction('approve-agreement', () => approveAgreement(workspaceId, role), 'Agreement approved.')}
              >
                <CheckCircle2 size={15} /> Approve agreement
              </Button>
              <Textarea label="Change request" rows={3} value={agreementNote} onChange={(event) => setAgreementNote(event.target.value)} placeholder="Explain the exact term that needs to change." />
              <Button
                className="w-full"
                variant="outline"
                disabled={!agreementNote.trim()}
                loading={busyAction === 'change-agreement'}
                onClick={() => {
                  runAction('change-agreement', () => requestAgreementChanges(workspaceId, role, agreementNote.trim()), 'Agreement changes requested.')
                  setAgreementNote('')
                }}
              >
                <RotateCcw size={15} /> Request changes
              </Button>
            </div>
          )}
          {currentRoleAgreementApproved && (
            <div className="flex items-start gap-3 rounded-xl border border-mint/20 bg-mint/[.06] p-4">
              <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-mint" />
              <span><strong className="block text-xs text-mint">You approved this version</strong><small className="mt-1 block leading-5 text-white/35">Waiting for the other channel if their approval is still pending.</small></span>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )

  const renderTasks = () => (
    <Panel title="Production tasks" description={`${completedTasks} of ${tasks.length} complete. Every change is visible to both collaborators.`}>
      {tasks.length ? (
        <div className="divide-y divide-white/[.07]">
          {tasks.map((task) => {
            const done = task.completed || task.done || task.status === 'COMPLETED'
            return (
              <div key={task.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                <button
                  type="button"
                  aria-label={`${done ? 'Reopen' : 'Complete'} ${task.title || task.text}`}
                  disabled={isCompleted}
                  onClick={() => runAction(`task-${task.id}`, () => toggleTask(workspaceId, task.id), done ? 'Task reopened.' : 'Task completed.')}
                  className={`grid size-8 shrink-0 place-items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-55 ${done ? 'border-mint bg-mint text-black' : 'border-white/15 text-white/20 hover:border-white/35 hover:text-white'}`}
                >
                  {done && <Check size={14} />}
                </button>
                <div className="min-w-0 flex-1">
                  <strong className={`block text-sm ${done ? 'text-white/35 line-through' : ''}`}>{task.title || task.text}</strong>
                  {(task.description || task.assignee || task.owner) && <p className="mt-1 text-xs text-white/32">{task.description || `Assigned to ${titleCase(task.assignee || task.owner)}`}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {(task.assignee || task.owner) && <Badge variant={String(task.assignee || task.owner).toLowerCase() === 'creator' ? 'pink' : String(task.assignee || task.owner).toLowerCase() === 'business' ? 'mint' : 'outline'}>{task.assignee || task.owner}</Badge>}
                  {(task.dueDate || task.due) && <span className="text-[10px] text-white/30">{formatDate(task.dueDate || task.due)}</span>}
                </div>
              </div>
            )
          })}
        </div>
      ) : <EmptyBlock icon={ListChecks} title="No production tasks" copy="Tasks are generated from the approved scope when the collaboration advances." action={() => setActiveTab(agreementLocked ? 'agreement' : 'negotiation')} actionLabel={agreementLocked ? 'Review agreement' : 'Finalize terms'} />}
    </Panel>
  )

  const renderFiles = () => (
    <div className={`grid gap-5 ${isCompleted ? '' : 'xl:grid-cols-[minmax(0,1fr)_22rem]'}`}>
      <Panel title="Shared files" description="Briefs, references, contracts and working assets shared across the project.">
        {files.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {files.map((file, index) => (
              <article key={file.id || `${file.name}-${index}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.02] p-4">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${(file.role || file.addedBy) === 'creator' ? 'bg-pink/10 text-pink' : 'bg-mint/10 text-mint'}`}><FileIcon file={file} /></span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-xs">{file.name || file.file?.name || 'Workspace file'}</strong>
                  <small className="mt-1 block truncate text-[10px] text-white/28">{titleCase(file.role || file.addedBy || 'shared')} · {file.size || formatDate(file.createdAt)}</small>
                </span>
                {file.url && (
                  <a href={file.url} target="_blank" rel="noreferrer" aria-label={`Download ${file.name}`} className="grid size-8 shrink-0 place-items-center rounded-full text-white/35 transition hover:bg-white/[.06] hover:text-white"><Download size={15} /></a>
                )}
              </article>
            ))}
          </div>
        ) : <EmptyBlock icon={FolderOpen} title="No shared files" copy="Upload the first brief, reference or production asset from the panel beside this list." />}
      </Panel>
      {!isCompleted && <Panel title="Add a file" description={`This upload will be attributed to the ${role} channel.`}>
        <FileUpload key={fileUploadVersion} label="Workspace file" accept="image/*,video/*,.pdf,.doc,.docx" compact onChange={(items) => setSelectedFile(items[0] || null)} />
        <Button className="mt-4 w-full" variant={accent} disabled={!selectedFile} loading={busyAction === 'file'} onClick={uploadSharedFile}>
          <UploadCloud size={15} /> Add to workspace
        </Button>
      </Panel>}
    </div>
  )

  const renderTimeline = () => {
    const entries = workspace.timeline || activities
    return (
      <Panel title="Project timeline" description="Milestones, deadlines and decisions arranged as one chronological project record.">
        {entries.length ? (
          <ol className="relative ml-3 border-l border-white/10">
            {entries.map((item, index) => {
              const complete = item.completed || item.status === 'COMPLETED' || item.status === 'APPROVED'
              return (
                <li key={item.id || `${item.title}-${index}`} className="relative pb-7 pl-8 last:pb-0">
                  <span className={`absolute -left-[9px] top-0 grid size-[17px] place-items-center rounded-full border ${complete ? 'border-mint bg-mint text-black' : 'border-white/20 bg-[#111] text-white/25'}`}>
                    {complete ? <Check size={10} /> : <Circle size={7} fill="currentColor" />}
                  </span>
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div>
                      <strong className="text-sm">{item.title || item.text}</strong>
                      {item.description && <p className="mt-1.5 max-w-2xl text-xs leading-5 text-white/38">{item.description}</p>}
                    </div>
                    <span className="shrink-0 text-[10px] text-white/28">{item.time || formatDate(item.date || item.createdAt)}</span>
                  </div>
                </li>
              )
            })}
          </ol>
        ) : <EmptyBlock icon={CalendarDays} title="Timeline is being prepared" copy="Negotiation changes, agreement approvals and production milestones will appear here." />}
      </Panel>
    )
  }

  const renderContract = () => (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel
        title="Creator services contract"
        description="Generated from the agreement approved by both parties."
        action={agreementApproved && <div className="flex items-center gap-2"><Badge variant="outline">Version {contract.version || 1}</Badge><Button size="sm" variant="outline" onClick={() => downloadContractDocument({ campaign: campaignName, business: businessName, creator: creatorName, terms, version: contract.version || 1 })}><Download size={14} />Download</Button></div>}
      >
        {!agreementApproved ? (
          <EmptyBlock icon={LockKeyhole} title="Contract is locked" copy="Both the business and creator must approve the final agreement before the contract can be reviewed." />
        ) : (
          <div className="rounded-2xl bg-[#f2f0e8] p-6 text-[#171717] sm:p-10">
            <div className="flex items-center justify-between gap-4 border-b border-black/10 pb-5">
              <span>
                <small className="block text-[9px] font-bold uppercase tracking-[.14em] opacity-45">Creator services agreement</small>
                <strong className="mt-1 block">{campaignName}</strong>
              </span>
              <Badge variant={contractActive ? 'mint' : 'neutral'}>{contractActive ? 'Active' : 'Approval pending'}</Badge>
            </div>
            <div className="mt-7 space-y-6 text-sm leading-7">
              <section><b>1. Parties and scope</b><p className="mt-1 opacity-60">{businessName} engages {creatorName} to produce {asText(terms.deliverables || termsDraft.deliverables)} for {campaignName}.</p></section>
              <section><b>2. Compensation</b><p className="mt-1 opacity-60">The total collaboration value is {formatMoney(terms.budget ?? termsDraft.budget)} under the following schedule: {asText(terms.paymentTerms || termsDraft.paymentTerms)}.</p></section>
              <section><b>3. Delivery and revisions</b><p className="mt-1 opacity-60">Final delivery is due {formatDate(terms.finalDeadline || termsDraft.finalDeadline)} and includes {asText(terms.revisionLimit ?? termsDraft.revisionLimit, 'the agreed revision allowance')}.</p></section>
              <section><b>4. Usage rights</b><p className="mt-1 opacity-60">{asText(terms.usageRights || termsDraft.usageRights)}</p></section>
            </div>
          </div>
        )}
      </Panel>

      <div className="space-y-5">
        <Panel title="Contract approvals">
          <div className="space-y-3">
            <ApprovalState title={businessName} approved={contractBusinessApproved} accent="mint" />
            <ApprovalState title={creatorName} approved={contractCreatorApproved} accent="pink" />
          </div>
        </Panel>
        {agreementApproved && (
          <Panel title="Version & audit" description="Append-only browser history for frontend review.">
            <div className="space-y-2">
              {(contract.audit || []).slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-xl border border-white/[.08] p-3">
                  <strong className="block text-xs">{item.action}</strong>
                  <small className="mt-1 block text-[10px] text-white/30">{titleCase(item.actor)} · {formatDate(item.createdAt)}</small>
                  {item.note && <p className="mt-2 text-xs leading-5 text-white/40">{item.note}</p>}
                </div>
              ))}
              {!(contract.audit || []).length && <p className="text-xs leading-5 text-white/35">Version history starts when both parties approve the agreement.</p>}
            </div>
          </Panel>
        )}
        {agreementApproved && !currentRoleContractApproved && (
          <Panel title="Your decision">
            <Button
              className="w-full"
              variant={accent}
              loading={busyAction === 'approve-contract'}
              onClick={() => runAction('approve-contract', () => approveContract(workspaceId, role), 'Contract approved.')}
            >
              <FileSignature size={15} /> Approve contract
            </Button>
            <Textarea className="mt-4" label="Change request" rows={3} value={contractNote} onChange={(event) => setContractNote(event.target.value)} placeholder="Reference the exact clause that needs revision." />
            <Button
              className="mt-3 w-full"
              variant="outline"
              disabled={!contractNote.trim()}
              loading={busyAction === 'change-contract'}
              onClick={() => {
                runAction('change-contract', () => requestContractChanges(workspaceId, role, contractNote.trim()), 'Contract changes requested.')
                setContractNote('')
              }}
            >
              <RotateCcw size={15} /> Request changes
            </Button>
          </Panel>
        )}
        {currentRoleContractApproved && (
          <div className="flex gap-3 rounded-2xl border border-mint/20 bg-mint/[.06] p-4 text-xs leading-5">
            <CheckCircle2 size={17} className="shrink-0 text-mint" /> Your contract approval has been recorded.
          </div>
        )}
      </div>
    </div>
  )

  const renderPayment = () => (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel title="Payment protection" description="Funding is held for the collaboration and unlocks production after the contract is active.">
        <div className={`rounded-[1.25rem] border p-6 ${paymentFunded ? 'border-mint/25 bg-mint/[.055]' : 'border-white/10 bg-white/[.02]'}`}>
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <span>
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-white/30">Collaboration total</p>
              <strong className="mt-3 block text-4xl tracking-[-.055em]">{formatMoney(payment.amount || terms.budget || termsDraft.budget)}</strong>
              <small className="mt-2 block text-white/30">{asText(terms.paymentTerms || termsDraft.paymentTerms)}</small>
            </span>
            <span className={`grid size-14 place-items-center rounded-full ${paymentFunded ? 'bg-mint text-black' : 'bg-white/[.06] text-white/40'}`}>
              {paymentFunded ? <ShieldCheck size={23} /> : <Landmark size={23} />}
            </span>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <Detail label="Contract" value={contractActive ? 'Active' : 'Not active'} />
            <Detail label="Funding status" value={paymentFunded ? 'Funded' : 'Payment required'} />
            <Detail label="Release" value={payment.releaseTerms || 'After approval'} />
          </div>
        </div>
        <div className="mt-5 flex gap-3 rounded-xl border border-white/[.08] p-4 text-xs leading-5 text-white/40">
          <ShieldCheck size={17} className="shrink-0 text-mint" />
          Production begins after the contract is active and the business has funded the workspace.
        </div>
      </Panel>

      <Panel title={paymentFunded ? 'Funding complete' : 'Required action'} description={role === 'business' ? 'Business payment control' : 'Creator payment visibility'}>
        {!contractActive ? (
          <div className="rounded-xl border border-white/10 p-4 text-xs leading-5 text-white/40">Payment becomes available after both contract approvals.</div>
        ) : paymentFunded ? (
          <div className="text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-mint text-black"><Check size={20} /></span>
            <h3 className="mt-4 text-sm font-bold">Workspace funded</h3>
            <p className="mt-2 text-xs leading-5 text-white/35">Production and deliverable submission are now active.</p>
          </div>
        ) : role === 'business' ? (
          <Button className="w-full" variant="mint" loading={busyAction === 'fund'} onClick={() => runAction('fund', () => fundWorkspace(workspaceId), 'Workspace funded. Production is now active.')}>
            <CreditCard size={15} /> Fund {formatMoney(payment.amount || terms.budget || termsDraft.budget)}
          </Button>
        ) : (
          <div className="rounded-xl border border-white/10 p-4 text-xs leading-5 text-white/40">Waiting for {businessName} to fund the collaboration.</div>
        )}
      </Panel>
    </div>
  )

  const renderDeliverables = () => (
    <div className="space-y-5">
      {role === 'creator' && paymentFunded && !isCompleted && (
        <Panel title="Submit a deliverable" description="Upload a draft or final campaign asset with a concise review note.">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.65fr)]">
            <FileUpload key={deliverableUploadVersion} label="Content file" accept="image/*,video/*,.pdf" compact onChange={(items) => setDeliverableFile(items[0] || null)} />
            <div>
              <Textarea label="Submission note" rows={4} value={deliverableNote} onChange={(event) => setDeliverableNote(event.target.value)} placeholder="Version, concept and what the business should review." />
              <Button className="mt-3 w-full" variant="pink" disabled={!deliverableFile} loading={busyAction === 'deliverable'} onClick={uploadDeliverable}>
                <Send size={15} /> Submit for review
              </Button>
            </div>
          </div>
        </Panel>
      )}

      {!paymentFunded && (
        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-5 text-xs leading-5 text-white/40">
          <LockKeyhole size={17} className="mt-0.5 shrink-0" /> Deliverable submission opens after the contract is active and the workspace is funded.
        </div>
      )}

      <Panel title="Deliverable review" description={`${deliverables.filter((item) => String(item.status).toUpperCase() === 'APPROVED').length} of ${deliverables.length} approved.`}>
        {deliverables.length ? (
          <div className="space-y-4">
            {deliverables.map((deliverable, index) => {
              const deliverableId = deliverable.id || `deliverable-${index}`
              const deliverableStatus = String(deliverable.status || 'SUBMITTED').toUpperCase()
              const approved = deliverableStatus === 'APPROVED'
              const revisionRequested = deliverableStatus.includes('REVISION')
              return (
                <article key={deliverableId} className="rounded-2xl border border-white/10 bg-white/[.02] p-4 sm:p-5">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="flex min-w-0 gap-3">
                      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${approved ? 'bg-mint text-black' : revisionRequested ? 'bg-pink/10 text-pink' : 'bg-white/[.06] text-white/45'}`}><FileIcon file={deliverable.file || deliverable} /></span>
                      <span className="min-w-0">
                        <strong className="block truncate text-sm">{deliverable.name || deliverable.file?.name || `Campaign deliverable ${index + 1}`}</strong>
                        <p className="mt-1 text-xs leading-5 text-white/35">{deliverable.note || 'Submitted for campaign review.'}</p>
                        <small className="mt-1 block text-[10px] text-white/25">{formatDate(deliverable.createdAt || deliverable.submittedAt)}</small>
                      </span>
                    </div>
                    <Badge variant={approved ? 'mint' : revisionRequested ? 'pink' : 'outline'}>{titleCase(deliverableStatus)}</Badge>
                  </div>

                  {role === 'business' && !approved && paymentFunded && (
                    <div className="mt-5 border-t border-white/[.07] pt-4">
                      <Textarea
                        label="Review note"
                        rows={3}
                        value={reviewNotes[deliverableId] || ''}
                        onChange={(event) => setReviewNotes((current) => ({ ...current, [deliverableId]: event.target.value }))}
                        placeholder="Required when requesting a revision."
                      />
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <Button
                          variant="outline"
                          disabled={!reviewNotes[deliverableId]?.trim()}
                          loading={busyAction === `revision-${deliverableId}`}
                          onClick={() => requestDeliverableRevision(deliverableId)}
                        >
                          <RotateCcw size={15} /> Request revision
                        </Button>
                        <Button
                          variant="mint"
                          loading={busyAction === `approve-${deliverableId}`}
                          onClick={() => runAction(`approve-${deliverableId}`, () => reviewDeliverable(workspaceId, deliverableId, 'APPROVED', reviewNotes[deliverableId]?.trim() || ''), 'Deliverable approved.')}
                        >
                          <Check size={15} /> Approve
                        </Button>
                      </div>
                    </div>
                  )}
                  {revisionRequested && role === 'creator' && (deliverable.reviewNote || deliverable.note) && (
                    <div className="mt-4 flex gap-3 rounded-xl bg-pink/[.07] p-3 text-xs leading-5 text-white/55"><RotateCcw size={15} className="mt-0.5 shrink-0 text-pink" />{deliverable.reviewNote || deliverable.note}</div>
                  )}
                </article>
              )
            })}
          </div>
        ) : <EmptyBlock icon={PackageCheck} title="No deliverables submitted" copy={role === 'creator' ? 'Your submitted drafts and final assets will appear here.' : 'Creator submissions will appear here for structured review.'} />}
      </Panel>
    </div>
  )

  const renderActivity = () => (
    <div className={`grid gap-5 ${isCompleted ? '' : 'xl:grid-cols-[minmax(0,1fr)_22rem]'}`}>
      <Panel title="Activity log" description="A durable record of project changes, decisions, uploads and notes.">
        {activities.length ? (
          <div className="space-y-1">
            {activities.map((item, index) => (
              <div key={item.id || `${item.text}-${index}`} className="flex gap-4 rounded-xl p-3 transition hover:bg-white/[.025]">
                <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${getItemRole(item) === 'creator' ? 'bg-pink/10 text-pink' : getItemRole(item) === 'business' ? 'bg-mint/10 text-mint' : 'bg-white/[.06] text-white/40'}`}>
                  {getItemRole(item) === 'creator' ? <UserRound size={14} /> : getItemRole(item) === 'business' ? <Building2 size={14} /> : <Activity size={14} />}
                </span>
                <span className="min-w-0 flex-1">
                  <p className="text-xs leading-5 text-white/65">{item.text || item.title}</p>
                  <small className="mt-1 block text-[10px] text-white/25">{asText(item.actor || item.role, 'Workspace')} · {item.time || formatDate(item.createdAt || item.date)}</small>
                </span>
              </div>
            ))}
          </div>
        ) : <EmptyBlock icon={Activity} title="No activity recorded" copy="The first saved term, approval or project note will start this shared record." />}
      </Panel>
      {!isCompleted && <Panel title="Add project update" description="Use updates for decisions, blockers or production context—not casual chat.">
        <Textarea label="Update" rows={5} value={activityText} onChange={(event) => setActivityText(event.target.value)} placeholder="Example: Location confirmed for Tuesday at 10:00." />
        <Button
          className="mt-4 w-full"
          variant={accent}
          disabled={activityText.trim().length < 3}
          loading={busyAction === 'activity'}
          onClick={() => {
            runAction('activity', () => addActivity(workspaceId, activityText.trim(), role), 'Project update added.')
            setActivityText('')
          }}
        >
          <Send size={15} /> Add update
        </Button>
      </Panel>}
    </div>
  )

  const tabContent = {
    overview: renderOverview,
    negotiation: renderNegotiation,
    agreement: renderAgreement,
    tasks: renderTasks,
    files: renderFiles,
    timeline: renderTimeline,
    contract: renderContract,
    payment: renderPayment,
    deliverables: renderDeliverables,
    activity: renderActivity,
  }

  return (
    <DashboardPage className="max-w-[1600px]">
      <button type="button" onClick={() => navigate(`/${role}/dashboard`)} className="mb-6 flex items-center gap-2 text-xs text-white/38 transition hover:text-white">
        <ArrowLeft size={14} /> Back to dashboard
      </button>

      <header className="relative isolate mb-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[.035] p-5 shadow-[0_22px_80px_rgba(0,0,0,.22)] sm:p-7">
        <AuroraBackground tone={accent} className="opacity-45" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[.05] via-transparent to-black/45" />
        <div className={`pointer-events-none absolute -right-24 -top-32 size-72 rounded-full blur-3xl ${accent === 'mint' ? 'bg-mint/10' : 'bg-pink/10'}`} />
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={accent}>{role} workspace</Badge>
              <Badge variant={isCompleted ? 'mint' : 'outline'}>{status}</Badge>
              <span className="text-[10px] uppercase tracking-[.12em] text-white/25">#{workspaceId}</span>
            </div>
            <h1 className="mt-4 max-w-4xl break-words text-3xl font-bold tracking-[-.05em] sm:text-4xl lg:text-5xl">{workspace.title || campaignName}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/38">
              <span className="flex items-center gap-1.5"><Building2 size={13} />{businessName}</span>
              <span className="flex items-center gap-1.5"><Users size={13} />{creatorName}</span>
              <span className="flex items-center gap-1.5"><CalendarDays size={13} />Due {formatDate(nextDeadline)}</span>
            </div>
          </div>
          <div className="w-full max-w-sm shrink-0 rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="mb-3 flex items-center justify-between text-xs"><span className="text-white/38">Overall progress</span><b>{progress}%</b></div>
            <Progress value={progress} color={accent} />
          </div>
        </div>
      </header>

      <div className="workspace-layout grid items-start gap-6 xl:grid-cols-[17.5rem_minmax(0,1fr)]">
        <nav aria-label="Workspace sections" className="workspace-nav sticky top-[72px] z-30 rounded-[1.25rem] border border-white/10 bg-[#111]/95 p-2 shadow-[0_18px_70px_rgba(0,0,0,.2)] backdrop-blur-xl xl:top-[92px] xl:rounded-[1.55rem] xl:p-3">
          <div className="mb-3 hidden rounded-2xl border border-white/[.08] bg-black/15 p-4 xl:block">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/28">Project navigation</p>
            <h3 className="mt-2 truncate text-sm font-bold">{campaignName}</h3>
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[10px] text-white/35"><span>Progress</span><b className="text-white/70">{progress}%</b></div>
              <Progress value={progress} color={accent} />
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] xl:grid xl:grid-cols-1 xl:overflow-visible">
            {workspaceTabs.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.value
              return (
                <button
                  type="button"
                  key={tab.value}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex min-w-max items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition xl:w-full xl:gap-3 xl:py-3 ${active ? accent === 'mint' ? 'bg-mint text-black shadow-[0_10px_28px_rgba(187,247,208,.16)]' : 'bg-pink text-black shadow-[0_10px_28px_rgba(255,118,189,.18)]' : 'text-white/42 hover:bg-white/[.055] hover:text-white'}`}
                >
                  <Icon size={15} className="shrink-0" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        <div className="workspace-content min-w-0 rounded-[1.75rem] border border-white/[.08] bg-black/10 p-4 sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.13em] text-white/25">Workspace section</p>
              <h2 className="mt-1 text-xl font-bold">{workspaceTabs.find((tab) => tab.value === activeTab)?.label}</h2>
            </div>
            <span className="hidden items-center gap-2 text-[10px] text-white/25 sm:flex"><Eye size={13} /> Shared with both parties</span>
          </div>
          {tabContent[activeTab]?.()}
        </div>
      </div>
    </DashboardPage>
  )
}
