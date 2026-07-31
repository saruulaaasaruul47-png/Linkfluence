import {
  ArrowUpRight,
  BriefcaseBusiness,
  FilePlus2,
  FolderPlus,
  MessageSquare,
  Plus,
  Send,
  Star,
  UserPlus,
  WalletCards,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart,
  DashboardHeader,
  DashboardPage,
  DashboardPanel,
  DateFilter,
  DeadlineList,
  LineChart,
  MetricCard,
  Progress,
  QuickAction,
  StatusBadge,
} from '../../components/dashboard/DashboardUI'
import { Avatar, Badge, Button } from '../../components/ui'
import {
  businessMetrics,
  chartSeries,
  creatorMetrics,
  dashboardCampaigns,
  deadlines,
  invitations,
  messages,
  proposals,
  reviews,
} from '../../data/dashboard'
import { creators } from '../../data/marketplace'

function CampaignRows({ items = dashboardCampaigns.slice(0, 3), onOpen }) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onOpen(item.id)}
          className="w-full rounded-xl p-3 text-left transition hover:bg-white/[.04]"
        >
          <div className="flex items-center justify-between gap-3">
            <span>
              <strong className="block text-xs">{item.title}</strong>
              <small className="mt-1 block text-white/35">
                {item.business} · {item.deadline}
              </small>
            </span>
            <StatusBadge status={item.status} />
          </div>
          <div className="mt-3">
            <Progress value={item.progress} />
          </div>
        </button>
      ))}
    </div>
  )
}

function MessageRows() {
  return (
    <div className="space-y-1">
      {messages.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 rounded-xl p-3 hover:bg-white/[.04]"
        >
          <Avatar size="sm" fallback={item.avatar} />
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-xs">{item.name}</strong>
            <small className="mt-1 block truncate text-white/35">{item.preview}</small>
          </span>
          <span className="text-[9px] text-white/25">{item.time}</span>
          {item.unread > 0 && (
            <i className="grid size-5 place-items-center rounded-full bg-pink text-[9px] not-italic text-black">
              {item.unread}
            </i>
          )}
        </div>
      ))}
    </div>
  )
}

export function CreatorDashboardPage() {
  const navigate = useNavigate()
  const activeCampaigns = dashboardCampaigns
    .filter((item) => item.status === 'Active' || item.status === 'Review')
    .slice(0, 2)

  return (
    <DashboardPage>
      <DashboardHeader
        eyebrow="Creator overview · Thursday, July 23"
        title="Good morning, Amara."
        copy="Your channel is growing and two campaign milestones need your attention today."
        action={
          <Button variant="pink" onClick={() => navigate('/creator/portfolio')}>
            <Plus size={15} />
            Add portfolio work
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {creatorMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
        <DashboardPanel title="Profile completion" eyebrow="Channel health" className="h-full">
          <div className="flex items-end justify-between">
            <strong className="text-5xl tracking-[-.07em]">84%</strong>
            <span className="text-xs text-mint">Strong profile</span>
          </div>
          <div className="mt-5">
            <Progress value={84} />
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {['Add media kit', 'Connect TikTok', 'Set availability'].map((item) => (
              <button
                key={item}
                className="rounded-xl border border-white/10 p-3 text-left text-xs text-white/50 transition hover:border-white/20 hover:text-white"
              >
                + {item}
              </button>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Today's overview" eyebrow="Thursday" className="h-full">
          <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
            <div>
              <strong className="block text-2xl">2</strong>
              <small className="text-white/35">Due today</small>
            </div>
            <div>
              <strong className="block text-2xl">5</strong>
              <small className="text-white/35">New saves</small>
            </div>
            <div>
              <strong className="block text-2xl">3</strong>
              <small className="text-white/35">Messages</small>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Work requests"
          className="h-full"
          action={
            <Button size="sm" variant="ghost" onClick={() => navigate('/creator/work-requests')}>
              View all
            </Button>
          }
        >
          {invitations.slice(0, 2).map((item) => (
            <button
              key={item.id}
              onClick={() => navigate('/creator/work-requests')}
              className="flex w-full items-center justify-between rounded-xl p-3 text-left transition hover:bg-white/[.04]"
            >
              <span>
                <strong className="block text-xs">{item.title}</strong>
                <small className="mt-1 block text-white/35">
                  {item.brand} · {item.budget}
                </small>
              </span>
              <Badge variant="pink">{item.status}</Badge>
            </button>
          ))}
        </DashboardPanel>

        <DashboardPanel title="Active campaigns" className="h-full">
          <CampaignRows
            items={activeCampaigns}
            onOpen={(id) => navigate(`/creator/campaigns/${id}`)}
          />
        </DashboardPanel>

        <DashboardPanel title="Upcoming deadlines" className="h-full">
          <DeadlineList items={deadlines.slice(0, 2)} />
        </DashboardPanel>

        <DashboardPanel
          title="Portfolio performance"
          eyebrow="Last 30 days"
          action={<DateFilter />}
          className="h-full"
        >
          <LineChart data={chartSeries.reach} area />
          <div className="mt-4 flex gap-8 text-xs">
            <span>
              <b className="block text-lg">8.6M</b>
              <i className="not-italic text-white/35">Total reach</i>
            </span>
            <span>
              <b className="block text-lg">142K</b>
              <i className="not-italic text-white/35">Saves</i>
            </span>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Followers growth" eyebrow="Audience" className="h-full">
          <LineChart data={chartSeries.engagement} color="#bbf7d0" />
          <div className="mt-4 flex items-center justify-between">
            <span>
              <b className="block text-lg">+12.8K</b>
              <i className="text-xs not-italic text-white/35">New followers</i>
            </span>
            <Badge variant="mint">+18.4%</Badge>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Engagement overview" className="h-full">
          <BarChart data={chartSeries.engagement.slice(-8)} height={150} />
        </DashboardPanel>

        <DashboardPanel title="Wallet summary" className="h-full">
          <strong className="text-4xl tracking-[-.06em]">₮12.8M</strong>
          <p className="mt-2 text-xs text-white/35">Available balance</p>
          <div className="mt-6 flex justify-between border-t border-white/10 pt-4 text-xs">
            <span className="text-white/40">In escrow</span>
            <b>₮9.6M</b>
          </div>
          <Button
            className="mt-4 w-full"
            variant="outline"
            onClick={() => navigate('/creator/wallet')}
          >
            Open wallet
          </Button>
        </DashboardPanel>

        <DashboardPanel title="Recent reviews" className="h-full">
          {reviews.map((item) => (
            <div key={item.name} className="border-b border-white/10 py-3 last:border-0">
              <div className="flex justify-between">
                <strong className="text-xs">{item.name}</strong>
                <span className="flex items-center gap-1 text-xs text-pink">
                  <Star size={11} fill="currentColor" />
                  {item.rating}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-white/40">{item.text}</p>
            </div>
          ))}
        </DashboardPanel>

        <DashboardPanel
          title="Recent messages"
          className="h-full"
          action={
            <Button size="sm" variant="ghost" onClick={() => navigate('/creator/messages')}>
              Inbox
            </Button>
          }
        >
          <MessageRows />
        </DashboardPanel>

        <DashboardPanel title="Quick actions" className="h-full">
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              icon={FolderPlus}
              label="Add portfolio"
              onClick={() => navigate('/creator/portfolio')}
            />
            <QuickAction
              icon={Send}
              label="Work requests"
              onClick={() => navigate('/creator/work-requests')}
            />
            <QuickAction
              icon={MessageSquare}
              label="Messages"
              onClick={() => navigate('/creator/messages')}
            />
            <QuickAction
              icon={WalletCards}
              label="Wallet"
              onClick={() => navigate('/creator/wallet')}
            />
          </div>
        </DashboardPanel>
      </div>
    </DashboardPage>
  )
}

export function BusinessDashboardPage() {
  const navigate = useNavigate()

  return (
    <DashboardPage>
      <DashboardHeader
        eyebrow="Business overview · Northstar Studio"
        title="Campaign command."
        copy="A focused view of performance, spend and creator collaboration across your active work."
        action={
          <Button variant="pink" onClick={() => navigate('/business/campaigns/new')}>
            <FilePlus2 size={15} />
            Create campaign
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {businessMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} accent="mint" />
        ))}
      </div>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <DashboardPanel title="Campaign performance" eyebrow="Combined reach" action={<DateFilter />}>
          <LineChart data={chartSeries.reach} area color="#bbf7d0" />
          <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
            <span>
              <b className="block text-lg">8.6M</b>
              <i className="not-italic text-white/35">Reach</i>
            </span>
            <span>
              <b className="block text-lg">7.2%</b>
              <i className="not-italic text-white/35">Engagement</i>
            </span>
            <span>
              <b className="block text-lg">3.8x</b>
              <i className="not-italic text-white/35">ROAS</i>
            </span>
          </div>
        </DashboardPanel>

        <div className="grid gap-5">
          <DashboardPanel title="Current spend">
            <strong className="text-4xl tracking-[-.06em]">₮48.2M</strong>
            <p className="mt-2 text-xs text-white/35">of ₮67M monthly budget</p>
            <div className="mt-5">
              <Progress value={72} color="mint" />
            </div>
          </DashboardPanel>
          <DashboardPanel title="Escrow summary">
            <div className="flex justify-between">
              <span className="text-white/40">Funded</span>
              <strong>₮28.4M</strong>
            </div>
            <div className="mt-3 flex justify-between">
              <span className="text-white/40">Releasable</span>
              <strong className="text-mint">₮9.6M</strong>
            </div>
          </DashboardPanel>
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Creators hired', '18', '+5 this month'],
          ['Open campaigns', '6', '3 accepting proposals'],
          ['Pending proposals', '14', '6 new today'],
          ['Contracts awaiting review', '3', '2 need signature'],
        ].map(([title, value, copy]) => (
          <DashboardPanel key={title} title={title}>
            <strong className="text-3xl">{value}</strong>
            <p className="mt-2 text-xs text-white/35">{copy}</p>
          </DashboardPanel>
        ))}
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <DashboardPanel title="Open campaigns">
          <CampaignRows onOpen={(id) => navigate(`/business/campaigns/${id}`)} />
        </DashboardPanel>
        <DashboardPanel title="Upcoming deadlines">
          <DeadlineList items={deadlines} />
        </DashboardPanel>
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <DashboardPanel
          title="Recommended creators"
          action={
            <Button size="sm" variant="ghost" onClick={() => navigate('/business/creators')}>
              Browse all
            </Button>
          }
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {creators.slice(0, 4).map((creator) => (
              <button
                key={creator.id}
                type="button"
                onClick={() => navigate(`/creators/${creator.id}`)}
                aria-label={`View ${creator.name} profile`}
                className="group flex items-center gap-3 rounded-xl p-3 text-left transition hover:bg-white/[.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
              >
                <Avatar src={creator.avatar} size="md" />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-xs">{creator.name}</strong>
                  <small className="text-white/35">{creator.niche}</small>
                </span>
                <ArrowUpRight size={14} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            ))}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Wallet summary">
          <strong className="text-4xl tracking-[-.06em]">₮32.6M</strong>
          <p className="mt-2 text-xs text-white/35">Available campaign funds</p>
          <Button
            className="mt-6 w-full"
            variant="outline"
            onClick={() => navigate('/business/payments')}
          >
            Payments
          </Button>
        </DashboardPanel>
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_.8fr]">
        <DashboardPanel title="Recent messages">
          <MessageRows />
        </DashboardPanel>
        <DashboardPanel title="Quick actions">
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              icon={FilePlus2}
              label="New campaign"
              onClick={() => navigate('/business/campaigns/new')}
            />
            <QuickAction
              icon={UserPlus}
              label="Find creators"
              onClick={() => navigate('/business/creators')}
            />
            <QuickAction
              icon={BriefcaseBusiness}
              label="Proposals"
              onClick={() => navigate('/business/campaigns')}
            />
            <QuickAction
              icon={MessageSquare}
              label="Messages"
              onClick={() => navigate('/business/messages')}
            />
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel title="Pending proposals" className="mt-5">
        {proposals.slice(0, 3).map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(`/business/proposals/${item.id}`)}
            className="grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b border-white/10 px-2 py-4 text-left last:border-0 sm:grid-cols-[1fr_1fr_auto_auto]"
          >
            <span>
              <strong className="block text-xs">{item.creator}</strong>
              <small className="text-white/35">{item.campaign}</small>
            </span>
            <span className="hidden text-xs sm:block">{item.amount}</span>
            <Badge variant="mint">{item.score} fit</Badge>
            <StatusBadge status={item.status} />
          </button>
        ))}
      </DashboardPanel>
    </DashboardPage>
  )
}
