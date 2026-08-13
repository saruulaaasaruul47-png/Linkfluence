import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FolderKanban, Sparkles, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DashboardHeader, DashboardPage } from '../../components/dashboard/DashboardUI'
import { Avatar, Badge, EmptyState } from '../../components/ui'
import { useCollaboration } from '../../context/collaboration-context'

const statusMeta = {
  NEGOTIATION: { label: 'Negotiation', variant: 'pink' },
  AGREEMENT_REVIEW: { label: 'Agreement review', variant: 'pink' },
  CONTRACT_REVIEW: { label: 'Contract review', variant: 'pink' },
  PAYMENT_PENDING: { label: 'Payment pending', variant: 'pink' },
  IN_PROGRESS: { label: 'In progress', variant: 'mint' },
  COMPLETED: { label: 'Completed', variant: 'mint' },
}

function formatDate(value) {
  if (!value) return 'Not scheduled'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function formatMoney(value) {
  return typeof value === 'number' ? `${new Intl.NumberFormat('mn-MN').format(value)}₮` : (value || 'Not set')
}

function initials(name = '') {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2)
}

export function CollaborationListPage({ role }) {
  const { workspaces } = useCollaboration()
  const navigate = useNavigate()
  const accent = role === 'business' ? 'mint' : 'pink'

  return (
    <DashboardPage className="max-w-[1580px]">
      <DashboardHeader
        eyebrow={`${role} · Shared workspace`}
        title="Collaborations"
        copy="Approved partnerships live here from negotiation through delivery, review, and showcase."
        action={workspaces.length ? <Badge variant={accent}>{workspaces.length} workspace{workspaces.length === 1 ? '' : 's'}</Badge> : null}
      />

      {workspaces.length === 0 ? (
        <EmptyState
          title="No collaboration workspaces yet"
          description={role === 'business'
            ? 'A workspace appears after you approve an interested response or counter proposal.'
            : 'A workspace appears after the business approves your response.'}
          action={role === 'business' ? 'Review incoming responses' : 'Review work requests'}
          onAction={() => navigate(role === 'business' ? '/business/responses' : '/creator/work-requests')}
        />
      ) : (
        <section className="rounded-2xl border border-white/[.08] bg-white/[.012] p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {workspaces.map((workspace) => {
              const partner = role === 'business' ? workspace.creator : workspace.business
              const meta = statusMeta[workspace.status] || {
                label: workspace.status?.replaceAll('_', ' ') || 'Workspace',
                variant: 'outline',
              }
              const completedTasks = workspace.tasks?.filter((task) => task.done).length || 0
              const taskCount = workspace.tasks?.length || 0
              const accentColor = role === 'business' ? 'bg-mint' : 'bg-pink'
              const accentText = role === 'business' ? 'text-mint' : 'text-pink'
              const openWorkspace = () => navigate(`/${role}/collaborations/${workspace.id}`)

              return (
                <article
                  key={workspace.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${workspace.campaign.title} collaboration workspace`}
                  onClick={openWorkspace}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openWorkspace()
                    }
                  }}
                  className="relative min-w-0 cursor-pointer overflow-hidden rounded-2xl border border-white/[.1] bg-[#151515] outline-none focus-visible:border-white/35"
                >
                  <span className={`absolute inset-x-0 top-0 h-0.5 ${accentColor}`} aria-hidden="true" />

                  <div className="relative flex items-center justify-between gap-2 border-b border-white/[.07] px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar
                        src={partner?.avatar}
                        fallback={initials(partner?.name)}
                        className={`size-8 shrink-0 ${role === 'business' ? 'bg-pink' : 'bg-mint'} text-[10px] text-black`}
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[.12em] text-white/35">
                          <UserRound size={9} /> Partner
                        </span>
                        <strong className="block truncate text-xs">{partner?.name || 'Collaboration partner'}</strong>
                      </span>
                    </div>
                    <Badge variant={meta.variant} className="shrink-0 px-2 py-0.5 text-[8px]">{meta.label}</Badge>
                  </div>

                  <div className="relative p-3">
                    <p className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-[.14em] ${accentText}`}>
                      <Sparkles size={9} /> Shared project
                    </p>
                    <h2 className="mt-1 line-clamp-1 text-base font-black leading-tight tracking-[-.025em] text-white">
                      {workspace.campaign.title}
                    </h2>

                    <div className="mt-2.5 grid grid-cols-3 divide-x divide-white/[.08] border-y border-white/[.07] py-2">
                      <div className="min-w-0 pr-2">
                        <span className="block text-[7px] font-bold uppercase tracking-[.1em] text-white/35">Budget</span>
                        <strong className="mt-0.5 block truncate text-[10px] text-white/85">{formatMoney(workspace.terms?.budget)}</strong>
                      </div>
                      <div className="min-w-0 px-2">
                        <span className="block text-[7px] font-bold uppercase tracking-[.1em] text-white/35">Deadline</span>
                        <strong className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-white/85">
                          <CalendarDays size={9} className="shrink-0" /> {formatDate(workspace.nextDeadline)}
                        </strong>
                      </div>
                      <div className="min-w-0 pl-2">
                        <span className="block text-[7px] font-bold uppercase tracking-[.1em] text-white/35">Tasks</span>
                        <strong className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-white/85">
                          <CheckCircle2 size={9} className="shrink-0" /> {completedTasks}/{taskCount}
                        </strong>
                      </div>
                    </div>

                    <div className="mt-2.5">
                      <div className="mb-1 flex items-center justify-between text-[9px] font-bold">
                        <span className="flex items-center gap-1 text-white/40"><Clock3 size={9} /> Progress</span>
                        <strong className="text-white/75">{workspace.progress}%</strong>
                      </div>
                      <div className="h-0.5 overflow-hidden rounded-full bg-white/[.08]">
                        <div className={`h-full ${accentColor}`} style={{ width: `${workspace.progress}%` }} />
                      </div>
                    </div>

                    <div className="mt-2.5 flex min-w-0 items-center justify-between gap-2 border-t border-white/[.07] pt-2.5">
                      <span className="flex min-w-0 items-center gap-1 text-[9px] text-white/35">
                        <FolderKanban size={10} className="shrink-0" />
                        <span className="truncate">{workspace.activity?.[0]?.text || 'Workspace ready'}</span>
                      </span>
                      <span className={`flex shrink-0 items-center gap-1 text-[9px] font-bold ${accentText}`}>
                        Open <ArrowRight size={10} />
                      </span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </DashboardPage>
  )
}

export default CollaborationListPage
