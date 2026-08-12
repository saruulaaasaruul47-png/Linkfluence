import { useEffect, useState } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
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
import { DashboardPage } from '../../components/dashboard/DashboardUI'
import { WorkspaceTaskBoard } from '../../components/collaboration/WorkspaceTaskBoard'
import { Badge, Button, FileUpload, Input, Select, Textarea, useToast } from '../../components/ui'
import { useCollaboration } from '../../context/collaboration-context'
import { collaborationApi } from '../../api/collaboration.api'
import { parseMoneyAmount } from '../../utils/money'

const workspaceTabGroups = [
  {
    label: 'Workspace',
    tabs: [
      { value: 'overview', label: 'Overview', description: 'Status, next step and recent work.', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Setup',
    tabs: [
      { value: 'negotiation', label: 'Terms & budget', description: 'Agree on scope, dates and compensation.', icon: SlidersHorizontal },
      { value: 'agreement', label: 'Agreement', description: 'Lock and approve the shared terms.', icon: FileCheck2 },
      { value: 'contract', label: 'Contract', description: 'Review and approve the formal contract.', icon: FileSignature },
      { value: 'payment', label: 'Payment', description: 'View funding and payment status.', icon: CreditCard },
    ],
  },
  {
    label: 'Production',
    tabs: [
      { value: 'tasks', label: 'Tasks', description: 'Assign and complete production work.', icon: ListChecks },
      { value: 'files', label: 'Files', description: 'Share briefs and working assets.', icon: FolderOpen },
      { value: 'deliverables', label: 'Deliverables', description: 'Submit, review and approve final work.', icon: PackageCheck },
    ],
  },
  {
    label: 'Records',
    tabs: [
      { value: 'timeline', label: 'Timeline', description: 'See milestones in chronological order.', icon: CalendarDays },
      { value: 'activity', label: 'Updates', description: 'Read decisions and add project notes.', icon: Activity },
    ],
  },
]

const workspaceTabs = workspaceTabGroups.flatMap((group) => group.tabs)

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

function getActivity(workspace) {
  return workspace?.activity || workspace?.activities || []
}

function Panel({ title, description, action, children, className = '' }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6 ${className}`}>
      <header className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-[-.035em]">{title}</h2>
          {description && <p className="mt-1.5 max-w-2xl text-xs leading-5 text-white/38">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </section>
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
    refreshWorkspace,
    updateTerms,
    lockAgreement,
    approveAgreement,
    requestAgreementChanges,
    approveContract,
    requestContractChanges,
    fundWorkspace,
    createTask,
    updateTask,
    deleteTask,
    addFile,
    submitDeliverable,
    reviewDeliverable,
    submitReview,
    publishShowcase,
    declineShowcase,
    submitPublishProof,
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
  const [proofUrl, setProofUrl] = useState('')
  const [proofPlatform, setProofPlatform] = useState('INSTAGRAM')
  const [proofFile, setProofFile] = useState(null)
  const [proofDisclosure, setProofDisclosure] = useState(false)
  const [proofUploadVersion, setProofUploadVersion] = useState(0)
  const [financeSummary, setFinanceSummary] = useState(null)

  useEffect(() => {
    let active = true
    if (!workspaceId) return undefined
    collaborationApi.paymentSummary(workspaceId)
      .then((result) => { if (active) setFinanceSummary(result) })
      .catch(() => { if (active) setFinanceSummary(null) })
    return () => { active = false }
  }, [workspaceId, workspace?.payment?.status])

  useEffect(() => {
    if (!['PENDING', 'PROCESSING'].includes(String(workspace?.payment?.status).toUpperCase())) return undefined
    const timer = window.setInterval(() => refreshWorkspace(workspaceId), 5000)
    return () => window.clearInterval(timer)
  }, [refreshWorkspace, workspace?.payment?.status, workspaceId])

  const runAction = async (key, action, success) => {
    setBusyAction(key)
    try {
      const result = await action()
      toast(typeof success === 'function' ? success(result) : success, { type: 'success' })
    } catch (error) {
      toast(error?.message || 'That action could not be completed.', { type: 'error' })
    } finally {
      setBusyAction('')
    }
  }

  const startFunding = async () => {
    setBusyAction('fund')
    try {
      const result = await fundWorkspace(workspaceId)
      if (result?.intent?.checkoutUrl) {
        toast('Secure checkout is opening. Payment status will update after Stripe confirms it.', { type: 'success' })
        window.location.assign(result.intent.checkoutUrl)
        return
      }
      toast(result?.payment?.status === 'FUNDED' ? 'Workspace funded. Production is now active.' : 'Payment intent created. Complete the provider instructions.', { type: 'success' })
      setFinanceSummary(await collaborationApi.paymentSummary(workspaceId))
    } catch (error) {
      toast(error?.message || 'Payment could not be started.', { type: 'error' })
    } finally {
      setBusyAction('')
    }
  }

  const runTaskAction = async (key, action, success) => {
    setBusyAction(key)
    try {
      const result = await action()
      toast(success, { type: 'success' })
      return result
    } catch (error) {
      toast(error?.message || 'Task could not be changed.', { type: 'error' })
      throw error
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
  const terms = workspace.terms || workspace.agreement?.terms || termsDraft
  const agreement = workspace.agreement || {}
  const contract = workspace.contract || {}
  const payment = workspace.payment || {}
  const paymentType = financeSummary?.paymentType || workspace.paymentType || payment.paymentType || 'PAID'
  const barterDetails = financeSummary?.barterDetails || workspace.barterDetails || {}
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
  const fundingPending = ['PENDING', 'PROCESSING'].includes(String(payment.status).toUpperCase())
  const supersededDeliverableIds = new Set(deliverables.map((item) => item.revisionOfId).filter(Boolean))
  const latestDeliverables = deliverables.filter((item) => !supersededDeliverableIds.has(item.id))
  const allDeliverablesApproved = latestDeliverables.length > 0 && latestDeliverables.every((item) => String(item.status).toUpperCase() === 'APPROVED')
  const pendingDeliverableCount = latestDeliverables.filter((item) => String(item.status).toUpperCase() !== 'APPROVED').length
  const isCompleted = String(workspace.status).toUpperCase() === 'COMPLETED'
  const workspaceTerminal = ['COMPLETED', 'CANCELLED'].includes(String(workspace.status).toUpperCase())
  const reviews = workspace.reviews || {}
  const currentReview = reviews[role]
  const counterpartReview = reviews[role === 'creator' ? 'business' : 'creator']
  const bothReviewsSubmitted = Boolean(reviews.creator && reviews.business)
  const showcaseConsent = workspace.showcaseConsent || { mine: 'PENDING', counterpart: 'PENDING' }
  const currentRoleAgreementApproved = role === 'creator' ? agreementCreatorApproved : agreementBusinessApproved
  const currentRoleContractApproved = role === 'creator' ? contractCreatorApproved : contractBusinessApproved
  const completedTasks = tasks.filter((task) => task.completed || task.done || task.status === 'DONE' || task.status === 'COMPLETED').length
  const taskParticipants = [
    { id: workspace.business?.userId, name: businessName, role: 'Business' },
    { id: workspace.creator?.userId, name: creatorName, role: 'Creator' },
  ].filter((participant) => participant.id)
  const nextDeadline = workspace.nextDeadline || terms.finalDeadline || termsDraft.finalDeadline
  const workflowSteps = [
    { label: 'Terms', tab: 'negotiation', done: agreementLocked },
    { label: 'Agreement', tab: 'agreement', done: agreementApproved },
    { label: 'Contract', tab: 'contract', done: contractActive },
    { label: 'Funding', tab: 'payment', done: paymentFunded },
    { label: 'Delivery', tab: 'deliverables', done: allDeliverablesApproved },
  ]
  const nextAction = (() => {
    if (workspaceTerminal || isCompleted) return {
      label: 'Workflow complete',
      title: 'This collaboration is complete',
      description: 'Review the final activity, submit feedback or approve Showcase publishing.',
      tab: 'overview',
      button: 'View summary',
      icon: BadgeCheck,
      complete: true,
    }
    if (!agreementLocked) return {
      label: 'Step 1 · Terms',
      title: 'Confirm the scope and budget',
      description: role === 'business'
        ? 'Check the deliverables, dates and budget, then lock the agreement when both sides are ready.'
        : 'Review the shared terms and update anything that needs to change before they are locked.',
      tab: 'negotiation',
      button: 'Open terms',
      icon: SlidersHorizontal,
    }
    if (!agreementApproved) return {
      label: 'Step 2 · Agreement',
      title: currentRoleAgreementApproved ? 'Waiting for the other approval' : 'Review and approve the agreement',
      description: currentRoleAgreementApproved
        ? `Your approval is recorded. ${role === 'creator' ? businessName : creatorName} still needs to approve this version.`
        : 'Check the locked terms carefully. Approve them or request a specific change.',
      tab: 'agreement',
      button: 'View agreement',
      icon: currentRoleAgreementApproved ? Clock3 : FileCheck2,
      waiting: currentRoleAgreementApproved,
    }
    if (!contractActive) return {
      label: 'Step 3 · Contract',
      title: currentRoleContractApproved ? 'Waiting for the other contract approval' : 'Review the contract',
      description: currentRoleContractApproved
        ? `Your contract approval is recorded. ${role === 'creator' ? businessName : creatorName} still needs to approve.`
        : 'Review the generated contract and approve it before funding can begin.',
      tab: 'contract',
      button: 'View contract',
      icon: currentRoleContractApproved ? Clock3 : FileSignature,
      waiting: currentRoleContractApproved,
    }
    if (!paymentFunded) return {
      label: 'Step 4 · Funding',
      title: role === 'business' ? 'Fund the collaboration' : 'Waiting for business funding',
      description: role === 'business'
        ? `Fund ${formatMoney(financeSummary?.payableAmount ?? payment.amount ?? terms.budget)} to unlock production.`
        : `${businessName} must complete funding before production and deliverable submission begin.`,
      tab: 'payment',
      button: 'View payment',
      icon: role === 'business' ? CreditCard : Clock3,
      waiting: role !== 'business',
    }
    if (allDeliverablesApproved) return {
      label: 'Final acceptance',
      title: role === 'business' ? 'Complete the accepted collaboration' : 'Waiting for business completion',
      description: role === 'business'
        ? 'All final deliverables are approved. Confirm completion to finalize the workspace and release the funded payment.'
        : `${businessName} can now complete the collaboration. Publication proof is optional and does not block completion.`,
      tab: 'deliverables',
      button: role === 'business' ? 'Complete collaboration' : 'View delivery',
      icon: role === 'business' ? BadgeCheck : Clock3,
      waiting: role !== 'business',
    }
    if (completedTasks < tasks.length) return {
      label: 'Step 5 · Production',
      title: 'Complete the production tasks',
      description: `${completedTasks} of ${tasks.length} tasks are complete. Open the task board to see ownership and deadlines.`,
      tab: 'tasks',
      button: 'Open tasks',
      icon: ListChecks,
    }
    return {
      label: 'Step 5 · Delivery',
      title: role === 'creator' ? 'Submit the campaign deliverables' : 'Review the creator deliverables',
      description: role === 'creator'
        ? 'Upload the agreed work for business review.'
        : 'Approve the submitted work or request a clear revision.',
      tab: 'deliverables',
      button: 'Open deliverables',
      icon: PackageCheck,
    }
  })()
  const tabCompletion = {
    negotiation: agreementLocked,
    agreement: agreementApproved,
    contract: contractActive,
    payment: paymentFunded,
    tasks: tasks.length > 0 && completedTasks === tasks.length,
    deliverables: allDeliverablesApproved,
  }

  const updateDraft = (key, value) => setTermsDraft((current) => ({ ...current, [key]: value }))

  const saveTerms = (event) => {
    event.preventDefault()
    const parsedBudget = parseMoneyAmount(termsDraft.budget)
    runAction(
      'terms',
      () => updateTerms(workspaceId, { ...termsDraft, budget: termsDraft.budget === '' ? '' : parsedBudget ?? termsDraft.budget }, role),
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
  const submitProof = async () => {
    const approved = latestDeliverables.find((item) => String(item.status).toUpperCase() === 'APPROVED')
    if (!approved || !proofUrl.trim()) return
    setBusyAction('proof')
    try {
      await submitPublishProof(workspaceId, approved.id, proofUrl.trim(), proofPlatform, proofFile, proofDisclosure)
      setProofUrl(''); setProofFile(null); setProofDisclosure(false); setProofUploadVersion((value) => value + 1)
      toast('Publication proof submitted for verification.', { type: 'success' })
    } catch (error) { toast(error?.message || 'Publication proof could not be submitted.', { type: 'error' }) }
    finally { setBusyAction('') }
  }

  const renderOverview = () => (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Detail icon={Target} label="Campaign" value={campaignName} />
        <Detail icon={Building2} label="Business" value={businessName} />
        <Detail icon={UserRound} label="Creator" value={creatorName} />
        <Detail icon={CalendarDays} label="Next deadline" value={formatDate(nextDeadline)} />
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
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-mint/20 bg-mint/[.06] p-4">
                    <div className="flex items-center gap-2 text-mint"><CheckCircle2 size={16} /><strong className="text-xs">Your review is submitted</strong></div>
                    <p className="mt-2 text-xs leading-5 text-white/48">{currentReview.comment}</p>
                  </div>
                  {currentReview.revealed ? (
                    counterpartReview && (
                      <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
                        <div className="flex items-center gap-2"><Star size={14} className="text-white/40" /><strong className="text-xs">{role === 'creator' ? 'Business' : 'Creator'} review</strong></div>
                        <p className="mt-2 text-xs leading-5 text-white/48">{counterpartReview.comment}</p>
                      </div>
                    )
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-xs text-white/40">
                      <Clock3 size={14} className="mb-1 inline text-white/30" /> Hidden until the {role === 'creator' ? 'business' : 'creator'} also submits a review — reviews reveal to each other at the same time.
                    </div>
                  )}
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
              <p className="mt-2 text-xs leading-5 text-white/38">Both the business and the creator must approve before this collaboration appears in the public Showcase.</p>
              {workspace.showcasePublished ? (
                <div className="mt-5 flex items-center gap-2 rounded-xl bg-mint/[.08] p-3 text-xs text-mint"><Globe2 size={14} /> Published to Showcase</div>
              ) : !bothReviewsSubmitted ? (
                <p className="mt-5 rounded-xl bg-white/[.04] p-3 text-xs text-white/40">Both reviews must be submitted before Showcase consent can be given.</p>
              ) : showcaseConsent.mine === 'DECLINED' ? (
                <p className="mt-5 rounded-xl bg-white/[.04] p-3 text-xs text-white/40">You declined to share this collaboration on Showcase.</p>
              ) : showcaseConsent.counterpart === 'DECLINED' ? (
                <p className="mt-5 rounded-xl bg-white/[.04] p-3 text-xs text-white/40">The other participant declined to share this collaboration on Showcase.</p>
              ) : (
                <>
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between rounded-lg bg-white/[.03] px-3 py-2"><span className="text-white/40">You</span><Badge variant={showcaseConsent.mine === 'APPROVED' ? 'mint' : 'outline'}>{showcaseConsent.mine === 'APPROVED' ? 'Approved' : 'Pending'}</Badge></div>
                    <div className="flex items-center justify-between rounded-lg bg-white/[.03] px-3 py-2"><span className="text-white/40">{role === 'creator' ? 'Business' : 'Creator'}</span><Badge variant={showcaseConsent.counterpart === 'APPROVED' ? 'mint' : 'outline'}>{showcaseConsent.counterpart === 'APPROVED' ? 'Approved' : 'Pending'}</Badge></div>
                  </div>
                  {showcaseConsent.mine === 'APPROVED' ? (
                    <p className="mt-4 rounded-xl bg-white/[.04] p-3 text-xs text-white/40">Waiting for the other participant to approve.</p>
                  ) : (
                    <div className="mt-4 flex gap-2">
                      <Button
                        className="flex-1"
                        variant="mint"
                        loading={busyAction === 'showcase'}
                        onClick={() => runAction('showcase', () => publishShowcase(workspaceId), 'Showcase consent recorded.')}
                      >
                        <Globe2 size={15} /> Approve
                      </Button>
                      <Button
                        className="flex-1"
                        variant="outline"
                        loading={busyAction === 'showcase-decline'}
                        onClick={() => runAction('showcase-decline', () => declineShowcase(workspaceId), 'Showcase consent declined.')}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </>
              )}
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
      <WorkspaceTaskBoard
        tasks={tasks}
        participants={taskParticipants}
        disabled={workspaceTerminal}
        busyTaskId={busyAction.replace(/^task-/, '')}
        onCreate={(payload) => runTaskAction('task-create', () => createTask(workspaceId, payload), 'Task created.')}
        onUpdate={(task, payload) => runTaskAction(`task-${task.id}`, () => updateTask(workspaceId, task.id, payload), 'Task updated.')}
        onDelete={(task) => runTaskAction(`task-${task.id}`, () => deleteTask(workspaceId, task.id, task.version), 'Task deleted.')}
      />
    </Panel>
  )

  const renderFiles = () => (
    <div className={`grid gap-5 ${workspaceTerminal ? '' : 'xl:grid-cols-[minmax(0,1fr)_22rem]'}`}>
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
      {!workspaceTerminal && <Panel title="Add a file" description={`This upload will be attributed to the ${role} channel. Images, video and PDF up to 25 MB are supported.`}>
        <FileUpload key={fileUploadVersion} label="Workspace file" accept="image/*,video/*,.pdf" compact onChange={(items) => setSelectedFile(items[0] || null)} />
        <Button className="mt-4 w-full" variant={accent} disabled={!selectedFile} loading={busyAction === 'file'} onClick={uploadSharedFile}>
          <UploadCloud size={15} /> Add to workspace
        </Button>
      </Panel>}
    </div>
  )

  const renderTimeline = () => {
    const entries = activities
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
      <Panel title={`${paymentType} collaboration`} description="Wallet funding creates pending creator earnings and pending platform revenue. Nothing is earned until completion.">
        <div className={`rounded-[1.25rem] border p-6 ${paymentFunded ? 'border-mint/25 bg-mint/[.055]' : 'border-white/10 bg-white/[.02]'}`}>
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <span>
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-white/30">{paymentType === 'BARTER' ? 'Platform service fee' : 'Wallet funding required'}</p>
              <strong className="mt-3 block text-4xl tracking-[-.055em]">{formatMoney(financeSummary?.payableAmount ?? payment.amount ?? terms.budget ?? termsDraft.budget)}</strong>
              <small className="mt-2 block text-white/30">Paid from the business wallet · no hidden checkout fee</small>
            </span>
            <span className={`grid size-14 place-items-center rounded-full ${paymentFunded ? 'bg-mint text-black' : 'bg-white/[.06] text-white/40'}`}>
              {paymentFunded ? <ShieldCheck size={23} /> : <Landmark size={23} />}
            </span>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Detail label="Cash compensation" value={formatMoney(financeSummary?.cashAmount || 0)} />
            <Detail label="Creator earnings" value={formatMoney(financeSummary?.creatorAmount || 0)} />
            <Detail label={paymentType === 'BARTER' ? 'Fixed service fee' : `Commission · ${financeSummary?.commissionRate || 0}%`} value={formatMoney(financeSummary?.platformFee || 0)} />
            <Detail label="Wallet balance" value={formatMoney(financeSummary?.availableBalance || 0)} />
          </div>
          {paymentType !== 'PAID' && <div className="mt-3 rounded-xl border border-pink/15 bg-pink/[.04] p-4 text-xs leading-5 text-white/50"><b className="text-white">Business provides:</b> {barterDetails.providedItem || 'Product / service'} · estimated {formatMoney(financeSummary?.barterEstimatedValue ?? workspace.barterEstimatedValue ?? 0)}. This reference value is excluded from commission.</div>}
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
        ) : fundingPending && payment.intent ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-mint/20 bg-mint/[.06] p-4 text-xs leading-5 text-white/55">
              <b className="block text-mint">Payment is processing</b>
              {payment.intent.expiresAt && <span>Complete it before {new Date(payment.intent.expiresAt).toLocaleTimeString()}.</span>}
            </div>
            {payment.intent.qrImage && <img className="mx-auto max-h-44 rounded-xl bg-white p-2" alt="Payment QR code" src={payment.intent.qrImage.startsWith('data:') ? payment.intent.qrImage : `data:image/png;base64,${payment.intent.qrImage}`} />}
            {payment.intent.checkoutUrl && <a href={payment.intent.checkoutUrl} target="_blank" rel="noreferrer" className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-mint px-4 text-xs font-bold text-black"><CreditCard size={15}/>Open secure checkout</a>}
            <Button className="w-full" variant="outline" onClick={() => refreshWorkspace(workspaceId)}><Clock3 size={15}/>Check payment status</Button>
          </div>
        ) : role === 'business' && financeSummary?.missingAmount > 0 ? (
          <div className="space-y-3"><div className="rounded-xl border border-pink/20 bg-pink/[.06] p-4 text-xs leading-5"><b className="block text-pink">Insufficient balance</b>You need an additional {formatMoney(financeSummary.missingAmount)}.</div><Button className="w-full" variant="mint" onClick={() => navigate('/business/payments')}><CreditCard size={15}/>Add {formatMoney(financeSummary.missingAmount)}</Button></div>
        ) : role === 'business' ? (
          <Button className="w-full" variant="mint" loading={busyAction === 'fund'} onClick={startFunding}>
            <CreditCard size={15} /> {paymentType === 'BARTER' ? 'Pay platform fee' : 'Pay from balance'} · {formatMoney(financeSummary?.payableAmount ?? payment.amount ?? terms.budget ?? termsDraft.budget)}
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
                          onClick={() => runAction(
                            `approve-${deliverableId}`,
                            () => reviewDeliverable(workspaceId, deliverableId, 'APPROVED', reviewNotes[deliverableId]?.trim() || ''),
                            (result) => result?.completed
                              ? 'Accepted. The collaboration is complete and the funded payment was released.'
                              : 'Deliverable approved.',
                          )}
                        >
                          <Check size={15} /> {pendingDeliverableCount === 1 ? 'Accept & complete' : 'Accept'}
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
      {role === 'business' && allDeliverablesApproved && !isCompleted && <Panel title="Finish collaboration" description="All work is accepted. Complete it now without waiting for publication proof or a dispute window.">
        <Button variant="mint" loading={busyAction === 'complete-collaboration'} onClick={() => runAction('complete-collaboration', () => reviewDeliverable(workspaceId, latestDeliverables[0].id, 'APPROVED', ''), 'The collaboration is complete and the funded payment was released.')}>
          <BadgeCheck size={15} /> Complete collaboration
        </Button>
      </Panel>}
      {role === 'creator' && allDeliverablesApproved && <Panel title="Optional publication proof" description="Add a public post URL for reporting or portfolio verification. It does not delay collaboration completion.">
        {contract.disclosureRequired && <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-pink/25 bg-pink/[.06] p-4 text-xs leading-5"><input className="mt-1 accent-[#ff69b4]" type="checkbox" checked={proofDisclosure} onChange={(event) => setProofDisclosure(event.target.checked)}/><span><b className="block text-pink">Paid partnership disclosure required</b>Confirm that the public post visibly identifies the paid partnership. The API rejects proof without this confirmation.</span></label>}
        <div className="grid gap-4 lg:grid-cols-2"><div className="space-y-4"><Input type="url" label="Published post URL" value={proofUrl} onChange={(event) => setProofUrl(event.target.value)} placeholder="https://instagram.com/p/…"/><Select label="Platform" value={proofPlatform} onChange={(event) => setProofPlatform(event.target.value)} options={['INSTAGRAM','TIKTOK','YOUTUBE','FACEBOOK','X','OTHER']}/></div><div><FileUpload key={proofUploadVersion} label="Proof screenshot (optional)" accept="image/*" compact onChange={(items) => setProofFile(items[0] || null)}/><Button className="mt-3 w-full" variant="pink" disabled={!proofUrl.trim() || (contract.disclosureRequired && !proofDisclosure)} loading={busyAction === 'proof'} onClick={submitProof}><ShieldCheck size={15}/>Save publication proof</Button></div></div>
        {workspace.publishProofs?.length > 0 && <div className="mt-5 space-y-2">{workspace.publishProofs.map((proof) => <a key={proof.id} href={proof.postUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-white/10 p-3 text-xs hover:border-pink/40"><span>{proof.platform} · {new Date(proof.publishedAt || proof.createdAt).toLocaleDateString()}</span><Badge variant={proof.status === 'VERIFIED' ? 'mint' : 'outline'}>{titleCase(proof.status)}</Badge></a>)}</div>}
      </Panel>}
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
  const activeSection = workspaceTabs.find((tab) => tab.value === activeTab) || workspaceTabs[0]
  const NextActionIcon = nextAction.icon

  return (
    <DashboardPage className="max-w-[1600px]">
      <button type="button" onClick={() => navigate(`/${role}/dashboard`)} className="mb-4 flex items-center gap-2 text-xs text-white/50 hover:text-white">
        <ArrowLeft size={14} /> Back to dashboard
      </button>

      <header className="border-b border-white/10 pb-5">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={accent}>{role} workspace</Badge>
              <Badge variant={isCompleted ? 'mint' : 'outline'}>{status}</Badge>
            </div>
            <h1 className="mt-3 max-w-4xl break-words text-2xl font-bold tracking-[-.035em] sm:text-3xl">{workspace.title || campaignName}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/45">
              <span className="flex items-center gap-1.5"><Building2 size={13} />{businessName}</span>
              <span className="flex items-center gap-1.5"><Users size={13} />{creatorName}</span>
            </div>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:min-w-[24rem]">
            <div className="rounded-xl border border-white/10 px-4 py-3">
              <small className="text-[9px] font-bold uppercase tracking-[.12em] text-white/30">Final budget</small>
              <strong className="mt-1 block text-sm">{formatMoney(terms.budget ?? termsDraft.budget)}</strong>
            </div>
            <div className="rounded-xl border border-white/10 px-4 py-3">
              <small className="text-[9px] font-bold uppercase tracking-[.12em] text-white/30">Next deadline</small>
              <strong className="mt-1 block text-sm">{formatDate(nextDeadline)}</strong>
            </div>
          </div>
        </div>
      </header>

      <nav aria-label="Collaboration workflow" className="my-5 overflow-x-auto rounded-2xl border border-white/10 bg-white/[.018] p-2 [scrollbar-width:none]">
        <ol className="grid min-w-[38rem] grid-cols-5 gap-1">
          {workflowSteps.map((step, index) => {
            const current = !step.done && workflowSteps.slice(0, index).every((item) => item.done)
            return (
              <li key={step.label}>
                <button type="button" onClick={() => setActiveTab(step.tab)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left ${current ? 'bg-white/[.08] text-white' : 'text-white/40 hover:bg-white/[.04] hover:text-white/70'}`}>
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold ${step.done ? 'border-mint bg-mint text-black' : current ? 'border-white/45 text-white' : 'border-white/10 text-white/25'}`}>
                    {step.done ? <Check size={12} /> : index + 1}
                  </span>
                  <span className="truncate text-[11px] font-semibold">{step.label}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="workspace-layout grid items-start gap-5 xl:grid-cols-[15.5rem_minmax(0,1fr)]">
        <nav aria-label="Workspace sections" className="workspace-nav z-20 rounded-2xl border border-white/10 bg-[#111] p-3 xl:sticky xl:top-[92px]">
          <label className="block xl:hidden">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.12em] text-white/35">Workspace section</span>
            <select value={activeTab} onChange={(event) => setActiveTab(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#181818] px-3 text-sm text-white outline-none">
              {workspaceTabs.map((tab) => <option key={tab.value} value={tab.value}>{tab.label}</option>)}
            </select>
          </label>
          <div className="hidden space-y-5 xl:block">
            {workspaceTabGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-3 text-[9px] font-bold uppercase tracking-[.14em] text-white/25">{group.label}</p>
                <div className="space-y-0.5">
                  {group.tabs.map((tab) => {
                    const Icon = tab.icon
                    const active = activeTab === tab.value
                    const complete = tabCompletion[tab.value]
                    return (
                      <button type="button" key={tab.value} aria-current={active ? 'page' : undefined} onClick={() => setActiveTab(tab.value)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold ${active ? 'border-white/15 bg-white/[.08] text-white' : 'border-transparent text-white/45 hover:bg-white/[.04] hover:text-white/75'}`}>
                        <Icon size={15} className={active ? accent === 'mint' ? 'text-mint' : 'text-pink' : 'text-white/35'} />
                        <span className="min-w-0 flex-1 truncate">{tab.label}</span>
                        {complete && <Check size={13} className="text-mint" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <main className="workspace-content min-w-0">
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-xl font-bold">{activeSection.label}</h2>
              <p className="mt-1 text-xs leading-5 text-white/40">{activeSection.description}</p>
            </div>
            <span className="hidden shrink-0 items-center gap-2 text-[10px] text-white/30 sm:flex"><Eye size={13} /> Shared workspace</span>
          </div>

          <section className={`mb-5 flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center ${nextAction.complete ? 'border-mint/25 bg-mint/[.045]' : 'border-white/10 bg-white/[.025]'}`}>
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${nextAction.complete ? 'bg-mint text-black' : 'bg-white/[.07] text-white/70'}`}><NextActionIcon size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className={`text-[9px] font-bold uppercase tracking-[.14em] ${nextAction.complete ? 'text-mint' : nextAction.waiting ? 'text-white/35' : accent === 'mint' ? 'text-mint' : 'text-pink'}`}>{nextAction.label}</p>
              <h3 className="mt-1 text-sm font-bold">{nextAction.title}</h3>
              <p className="mt-1 text-xs leading-5 text-white/40">{nextAction.description}</p>
            </div>
            <Button size="sm" variant={nextAction.complete || nextAction.waiting ? 'outline' : accent} className="shrink-0" onClick={() => setActiveTab(nextAction.tab)}>{nextAction.button}</Button>
          </section>

          {tabContent[activeTab]?.()}
        </main>
      </div>
    </DashboardPage>
  )
}
