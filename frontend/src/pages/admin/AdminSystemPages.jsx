import { useEffect, useState } from 'react'
import { AdminDataPage, StatusBadge } from '../../components/admin/AdminUI'
import { Drawer, Skeleton } from '../../components/ui'
import { adminApi } from '../../api/dashboard.api'

const titleCase = (value = '') => value.toLowerCase().replaceAll('_', ' ').replace(/(^|\s)\w/g, (match) => match.toUpperCase())

function mapAuditRow(item) {
  return {
    id: item.id,
    time: new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt)),
    actor: item.actor?.displayName || item.actor?.email || 'System',
    action: titleCase(item.action),
    target: `${item.targetType} · ${item.targetId}`,
    category: titleCase(item.targetType || ''),
    ip: item.ipAddress || 'internal',
    status: 'Success',
    reason: item.reason,
    before: item.before,
    after: item.after,
  }
}

export function AdminAuditLogsPage() {
  const [selected, setSelected] = useState(null)
  const [state, setState] = useState({ rows: [], loading: true, error: '' })
  useEffect(() => {
    let active = true
    adminApi.list('audit', { page: 1, limit: 100 })
      .then((data) => { if (active) setState({ rows: (data.items || []).map(mapAuditRow), loading: false, error: '' }) })
      .catch((error) => { if (active) setState({ rows: [], loading: false, error: error.response?.data?.error?.message || 'Audit logs could not be loaded.' }) })
    return () => { active = false }
  }, [])
  return <>
    <AdminDataPage
      eyebrow="System · Immutable activity trail"
      title="Audit logs"
      copy="Review administrative and system events with actor, target and source context."
      rows={state.rows}
      getId={(row) => row.id}
      onRow={setSelected}
      toolbar={state.loading ? <Skeleton className="mb-4 h-12" /> : state.error ? <p role="alert" className="mb-4 text-xs text-red-200">{state.error}</p> : null}
      columns={[
        { key: 'time', label: 'Time' }, { key: 'actor', label: 'Actor' }, { key: 'action', label: 'Action' }, { key: 'target', label: 'Target' }, { key: 'category', label: 'Category' }, { key: 'ip', label: 'IP address' }, { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
      ]}
    />
    <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title="Audit event detail">
      {selected && <div className="space-y-4 text-xs">
        {Object.entries(selected).filter(([key]) => !['before', 'after'].includes(key)).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-4 border-b border-white/10 pb-3"><span className="capitalize text-white/35">{key}</span><strong className="text-right">{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}</strong></div>
        ))}
        {(selected.before || selected.after) && <div className="rounded-xl border border-white/10 p-4">
          {selected.before && <p className="text-white/40"><b className="text-white/70">Before:</b> {JSON.stringify(selected.before)}</p>}
          {selected.after && <p className="mt-2 text-white/40"><b className="text-white/70">After:</b> {JSON.stringify(selected.after)}</p>}
        </div>}
      </div>}
    </Drawer>
  </>
}
