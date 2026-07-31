import { useState } from 'react'
import { AdminDataPage, StatusBadge } from '../../components/admin/AdminUI'
import { Drawer } from '../../components/ui'
import { auditLogs } from '../../data/admin'

export function AdminAuditLogsPage(){const [selected,setSelected]=useState(null);return <><AdminDataPage eyebrow="System · Immutable activity trail" title="Audit logs" copy="Review administrative and system events with actor, target and source context." rows={auditLogs} getId={(row)=>row.id} onRow={setSelected} filters={['All','Moderation','User management','Payment','Campaign','Success']} columns={[
  {key:'time',label:'Time'},{key:'actor',label:'Actor'},{key:'action',label:'Action'},{key:'target',label:'Target'},{key:'category',label:'Category'},{key:'ip',label:'IP address'},{key:'status',label:'Status',render:(row)=><StatusBadge status={row.status}/>},
]}/><Drawer open={Boolean(selected)} onClose={()=>setSelected(null)} title="Audit event detail">{selected&&<div className="space-y-4 text-xs">{Object.entries(selected).map(([key,value])=><div key={key} className="flex justify-between border-b border-white/10 pb-3"><span className="capitalize text-white/35">{key}</span><strong>{value}</strong></div>)}<div className="rounded-xl border border-white/10 p-4 text-white/40">Metadata payload is read-only mock data. Audit events cannot be modified.</div></div>}</Drawer></>}
