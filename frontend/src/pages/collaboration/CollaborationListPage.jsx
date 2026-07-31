import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FolderKanban, Sparkles, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DashboardHeader, DashboardPage } from '../../components/dashboard/DashboardUI'
import { Avatar, AuroraBackground, Badge, Button, EmptyState, SpotlightCard } from '../../components/ui'
import { useCollaboration } from '../../context/collaboration-context'
import { campaigns, creators } from '../../data/marketplace'

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
  return typeof value === 'number' ? `${new Intl.NumberFormat('mn-MN').format(value)}₮` : value
}

function initials(name = '') {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2)
}

function workspaceCover(workspace) {
  const campaign = campaigns.find((item) => item.id === workspace.campaign?.id || item.title === workspace.campaign?.title)
  const creator = creators.find((item) => item.id === workspace.creator?.id || item.name === workspace.creator?.name)
  return campaign?.image || creator?.cover || workspace.creator?.avatar
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
        copy="Approved partnerships live here from detailed negotiation through delivery, review, and showcase."
        action={workspaces.length ? <Badge variant={accent}>{workspaces.length} workspace{workspaces.length === 1 ? '' : 's'}</Badge> : null}
      />

      {workspaces.length === 0 ? (
        <EmptyState
          title="No collaboration workspaces yet"
          description={role === 'business'
            ? 'A workspace appears only after you approve an interested response or counter proposal.'
            : 'A workspace appears only after the business approves your response.'}
          action={role === 'business' ? 'Review incoming responses' : 'Review work requests'}
          onAction={() => navigate(role === 'business' ? '/business/responses' : '/creator/work-requests')}
        />
      ) : (
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.018] p-3 sm:p-4">
          <AuroraBackground tone={accent} className="opacity-55" />
          <div className="relative grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(30rem,100%),1fr))]">
            {workspaces.map((workspace) => {
              const partner = role === 'business' ? workspace.creator : workspace.business
              const meta = statusMeta[workspace.status] || { label: workspace.status.replaceAll('_', ' '), variant: 'outline' }
              const completedTasks = workspace.tasks.filter((task) => task.done).length
              const cover = workspaceCover(workspace)
              const panelTint = role === 'business'
                ? 'from-mint/90 via-mint/75 to-mint/55'
                : 'from-pink/90 via-pink/75 to-pink/55'
              const openWorkspace = () => navigate(`/${role}/collaborations/${workspace.id}`)

              return (
                <SpotlightCard
                  as="article"
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
                  className="group relative min-h-[23.5rem] min-w-0 cursor-pointer overflow-hidden rounded-[1.65rem] border border-white/15 bg-[#171717] shadow-[0_22px_80px_rgba(0,0,0,.34)] transition duration-500 hover:-translate-y-1 hover:border-white/35"
                >
                  {cover && (
                    <img
                      src={cover}
                      alt=""
                      className="absolute inset-x-0 top-0 h-[68%] w-full object-cover opacity-78 transition duration-700 group-hover:scale-[1.045] group-hover:opacity-90"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/8 to-black/80" />
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/55 to-transparent" />

                  <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3 rounded-full border border-white/20 bg-black/30 p-1.5 pr-4 backdrop-blur-xl">
                      <Avatar
                        src={partner.avatar}
                        fallback={initials(partner.name)}
                        className={`size-11 shrink-0 ${role === 'business' ? 'bg-pink' : 'bg-mint'}`}
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-white/45">
                          <UserRound size={12} />
                          Partner
                        </span>
                        <strong className="block max-w-44 truncate text-sm">{partner.name}</strong>
                      </span>
                    </div>
                    <Badge variant={meta.variant} className="shrink-0 shadow-[0_10px_30px_rgba(0,0,0,.22)]">{meta.label}</Badge>
                  </div>

                  <div className={`absolute inset-x-0 bottom-0 rounded-t-[1.35rem] border-t border-white/30 bg-gradient-to-br ${panelTint} p-4 text-black shadow-[0_-24px_70px_rgba(0,0,0,.28)] backdrop-blur-2xl sm:p-5`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.15em] text-black/45">
                          <Sparkles size={12} />
                          Shared project
                        </p>
                        <h2 className="mt-1 line-clamp-2 max-w-xl text-[clamp(1.55rem,3vw,2.5rem)] font-black leading-[.92] tracking-[-.06em]">
                          {workspace.campaign.title}
                        </h2>
                      </div>
                      <Button
                        size="sm"
                        className="min-h-10 shrink-0 border border-black/10 bg-black/85 px-4 text-white shadow-[0_14px_34px_rgba(0,0,0,.25)] hover:bg-black"
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation()
                          openWorkspace()
                        }}
                      >
                        Open
                        <ArrowRight size={14} />
                      </Button>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-2xl border border-black/10 bg-white/[.18] p-3">
                        <span className="text-[10px] font-black uppercase tracking-[.12em] text-black/45">Budget</span>
                        <strong className="mt-1.5 block truncate text-sm">{formatMoney(workspace.terms.budget)}</strong>
                      </div>
                      <div className="rounded-2xl border border-black/10 bg-white/[.18] p-3">
                        <span className="text-[10px] font-black uppercase tracking-[.12em] text-black/45">Deadline</span>
                        <strong className="mt-1.5 flex items-center gap-1.5 truncate text-sm"><CalendarDays size={13} />{formatDate(workspace.nextDeadline)}</strong>
                      </div>
                      <div className="rounded-2xl border border-black/10 bg-white/[.18] p-3">
                        <span className="text-[10px] font-black uppercase tracking-[.12em] text-black/45">Tasks</span>
                        <strong className="mt-1.5 flex items-center gap-1.5 truncate text-sm"><CheckCircle2 size={13} />{completedTasks}/{workspace.tasks.length}</strong>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
                        <span className="flex items-center gap-1.5 text-black/50"><Clock3 size={12} />Workspace progress</span>
                        <strong>{workspace.progress}%</strong>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-black/20">
                        <div className="h-full rounded-full bg-black shadow-[0_0_18px_rgba(0,0,0,.28)]" style={{ width: `${workspace.progress}%` }} />
                      </div>
                    </div>

                    <div className="mt-4 flex min-w-0 items-center gap-2 border-t border-black/10 pt-3 text-xs font-semibold text-black/55">
                      <FolderKanban size={14} className="shrink-0" />
                      <span className="truncate">{workspace.activity[0]?.text || 'Workspace ready'}</span>
                    </div>
                  </div>
                </SpotlightCard>
              )
            })}
          </div>
        </section>
      )}
    </DashboardPage>
  )
}

export default CollaborationListPage
