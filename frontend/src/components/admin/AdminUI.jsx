import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Dialog, EmptyState, Select, Skeleton, useToast } from '../ui'
import { DateFilter, StatusBadge } from '../dashboard/DashboardUI'

export function AdminPage({ children }) {
  return (
    <main className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
      {children}
    </main>
  )
}

export function AdminHeader({ eyebrow, title, copy, action, date = true }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div className="min-w-0">
        <p className="eyebrow text-white/25">{eyebrow}</p>
        <h1 className="mt-2.5 break-words text-3xl font-bold tracking-[-.05em] sm:text-4xl">
          {title}
        </h1>
        {copy && <p className="mt-2.5 max-w-2xl text-xs leading-5 text-white/40 sm:text-sm">{copy}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {date && <DateFilter />}
        {action}
      </div>
    </div>
  )
}

export function AdminStat({ label, value, change, tone = 'pink' }) {
  return (
    <article className="min-w-0 rounded-2xl border border-white/10 bg-[#151515] p-4 transition hover:border-white/20">
      <div className="flex justify-between gap-3">
        <p className="truncate text-[11px] text-white/40">{label}</p>
        <i
          className={`size-2 shrink-0 rounded-full ${
            tone === 'mint' ? 'bg-mint' : tone === 'danger' ? 'bg-[#ef5c76]' : 'bg-pink'
          }`}
        />
      </div>
      <strong className="mt-5 block truncate text-2xl tracking-[-.045em]" title={value}>
        {value}
      </strong>
      <small
        className={`mt-1 block truncate ${
          change?.includes('urgent') ? 'text-[#ef7189]' : 'text-white/30'
        }`}
      >
        {change}
      </small>
    </article>
  )
}

export function AdminPanel({ title, action, children, className = '' }) {
  return (
    <section
      className={`min-w-0 rounded-[1.25rem] border border-white/10 bg-[#151515] p-4 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-sm font-bold">{title}</h2>
        {action || <MoreHorizontal size={16} className="shrink-0 text-white/30" />}
      </div>
      {children}
    </section>
  )
}

export function AdminDataPage({
  eyebrow,
  title,
  copy,
  rows,
  columns,
  getId,
  onRow,
  filters = ['All', 'Active', 'Pending', 'Suspended'],
  actions,
  toolbar,
  summary,
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          JSON.stringify(row).toLowerCase().includes(query.toLowerCase()) &&
          (!filter ||
            filter === 'All' ||
            JSON.stringify(row).toLowerCase().includes(filter.toLowerCase())),
      ),
    [rows, query, filter],
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / 6))
  const visible = filtered.slice((page - 1) * 6, page * 6)
  const simulate = () => {
    setLoading(true)
    window.setTimeout(() => setLoading(false), 500)
  }

  return (
    <AdminPage>
      <AdminHeader eyebrow={eyebrow} title={title} copy={copy} action={actions} date={false} />
      {toolbar}
      {summary}
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-[#151515] p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_12rem_auto] xl:items-center">
        <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            aria-label={`Search ${title}`}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder={`Search ${title.toLowerCase()}...`}
            className="h-10 w-full rounded-xl border border-white/10 bg-white/[.035] pl-9 pr-3 text-xs outline-none focus:border-pink"
          />
        </div>
        <DateFilter />
        <Select
          aria-label="Filter status"
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value)
            setPage(1)
          }}
          options={filters.map((item) => ({ label: item, value: item }))}
          placeholder="Filter status"
          className="w-full"
        />
        <Button variant="outline" onClick={simulate}>
          <SlidersHorizontal size={14} />
          Refresh
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No results found"
              description="Try changing your search or filter state."
            />
          </div>
        ) : (
          <>
          <div className="divide-y divide-white/[.07] md:hidden">
            {visible.map((row) => (
              <div
                key={getId(row)}
                role={onRow ? 'button' : undefined}
                tabIndex={onRow ? 0 : undefined}
                onKeyDown={(event) => {
                  if (onRow && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault()
                    onRow(row)
                  }
                }}
                onClick={() => onRow?.(row)}
                className={`p-4 outline-none transition ${
                  onRow ? 'cursor-pointer hover:bg-white/[.035] focus-visible:bg-white/[.05]' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-[.12em] text-white/25">
                      {columns[0]?.label}
                    </p>
                    <div className="min-w-0 text-sm font-semibold">
                      {columns[0]?.render ? columns[0].render(row) : row[columns[0]?.key]}
                    </div>
                  </div>
                  <MoreHorizontal size={16} className="mt-1 shrink-0 text-white/35" />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                  {columns.slice(1, 5).map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-[9px] font-bold uppercase tracking-[.1em] text-white/25">
                        {column.label}
                      </dt>
                      <dd className="mt-1 min-w-0 truncate text-xs text-white/75">
                        {column.render ? column.render(row) : row[column.key]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[780px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[9px] uppercase tracking-[.12em] text-white/30">
                  {columns.map((column) => (
                    <th scope="col" key={column.key} className="px-4 py-3 font-medium">
                      {column.label}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr
                    key={getId(row)}
                    tabIndex={onRow ? 0 : undefined}
                    onKeyDown={(event) => {
                      if (onRow && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault()
                        onRow(row)
                      }
                    }}
                    onClick={() => onRow?.(row)}
                    className={`${
                      onRow ? 'cursor-pointer focus-visible:bg-white/[.04]' : ''
                    } border-b border-white/[.065] outline-none transition hover:bg-white/[.025]`}
                  >
                    {columns.map((column) => (
                      <td key={column.key} className="max-w-64 px-4 py-4">
                        <div className="truncate">
                          {column.render ? column.render(row) : row[column.key]}
                        </div>
                      </td>
                    ))}
                    <td className="px-4">
                      <button aria-label={`Actions for ${getId(row)}`}>
                        <MoreHorizontal size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
          <span className="text-[10px] text-white/30">
            Showing {filtered.length} results · Page {page} of {pageCount}
          </span>
          <div className="flex gap-1">
            <button
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="grid size-8 place-items-center rounded-lg border border-white/10 disabled:opacity-30"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              aria-label="Next page"
              disabled={page >= pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              className="grid size-8 place-items-center rounded-lg border border-white/10 disabled:opacity-30"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </AdminPage>
  )
}

export function DangerAction({
  label = 'Suspend',
  title = 'Confirm admin action',
  description,
  onConfirm,
  variant = 'danger',
  size = 'md',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog
        dark
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description || 'This mock action changes frontend state only.'}
      >
        <div className="flex gap-3 rounded-xl border border-[#ef5c76]/25 bg-[#ef5c76]/5 p-4 text-xs leading-5 text-white/55">
          <AlertTriangle size={17} className="shrink-0 text-[#ef7189]" />
          Review the target carefully. This confirmation is shown for destructive or restrictive
          admin actions.
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm?.()
              setOpen(false)
              toast(`${label} mock action completed.`, { type: 'success' })
            }}
          >
            Confirm {label.toLowerCase()}
          </Button>
        </div>
      </Dialog>
    </>
  )
}

export function AdminToolbar() {
  const navigate = useNavigate()
  return (
    <div className="flex gap-2">
      <Button variant="outline">
        <CalendarDays size={14} />
        Date range
      </Button>
      <Button variant="pink" onClick={() => navigate('/admin/notifications')}>
        Quick action
      </Button>
    </div>
  )
}

export { StatusBadge }
