import { useEffect, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, FileSignature, Gauge, ShieldCheck, Star, UserRoundCheck, Users } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { AdminDataPage, AdminHeader, AdminPage, AdminPanel, AdminStat, DangerAction, StatusBadge } from '../../components/admin/AdminUI'
import { Avatar, Badge, Button, EmptyState, Skeleton, Switch, useToast } from '../../components/ui'
import { adminApi } from '../../api/dashboard.api'

const titleCase=(value='')=>value.toLowerCase().replace(/(^|_|\s)\w/g,(match)=>match.replace('_','').toUpperCase())
const money=(value,currency='MNT')=>new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:0}).format(Number(value||0))
const date=(value)=>value?new Intl.DateTimeFormat('en',{dateStyle:'medium'}).format(new Date(value)):'—'
const mapAdminRows=(resource,items)=>items.map((item)=>{
  if(resource==='users') return {...item,name:item.displayName||item.username||item.email,type:item.roles?.join(' · ')||'Viewer',channels:Number(Boolean(item.creatorProfile))+Number(Boolean(item.businessProfile)),status:titleCase(item.status),joined:date(item.createdAt),active:item.lastSeenAt?date(item.lastSeenAt):'Never'}
  if(resource==='channels') return {...item,userId:item.user?.id,type:titleCase(item.type),owner:item.user?.email||'—',category:item.categories?.join(', ')||item.industry||'—',followers:item.followerCount||'—',rating:item.ratingAverage?Number(item.ratingAverage).toFixed(1):null,verified:titleCase(item.verificationStatus),status:titleCase(item.user?.status),reports:item.reportCount||0}
  if(resource==='campaigns') return {...item,business:item.business?.companyName||'—',status:titleCase(item.status),budget:`${money(item.budgetMin,item.currency)} – ${money(item.budgetMax,item.currency)}`,applications:item._count?.proposals||0,creators:item._count?.collaborations||0,deadline:date(item.deadline),reports:0}
  if(resource==='contracts') return {...item,campaign:item.collaboration?.campaign?.title||'Direct collaboration',creator:item.collaboration?.creator?.channelName||'—',business:item.collaboration?.business?.companyName||'—',amount:money(item.collaboration?.payments?.reduce((sum,payment)=>sum+Number(payment.amount||0),0)),status:titleCase(item.status),payment:item.collaboration?.payments?.at(-1)?.status?titleCase(item.collaboration.payments.at(-1).status):'Pending',deadline:date(item.publishBy),dispute:'None'}
  return item
})

function useAdminResource(section){
  const resource=['creators','businesses','channels'].includes(section)?'channels':section
  const [state,setState]=useState({rows:[],loading:true,error:''})
  useEffect(()=>{
    let active=true
    adminApi.list(resource,{page:1,limit:100}).then((data)=>{
      if(active)setState({rows:mapAdminRows(resource,data.items||[]),loading:false,error:''})
    }).catch((error)=>{
      if(active)setState({rows:[],loading:false,error:error.response?.data?.error?.message||error.response?.data?.message||'Admin records could not be loaded.'})
    })
    return()=>{active=false}
  },[resource])
  return state
}

// Detail pages don't have a dedicated single-record endpoint, so they fetch a generous page of the
// same list resource used elsewhere in admin and find the record client-side — admin volumes are
// low enough that this is a reasonable trade-off against adding a new backend endpoint per resource.
function useAdminRecord(resource, id) {
  const [state, setState] = useState({ record: null, audit: [], loading: true })
  useEffect(() => {
    let active = true
    Promise.all([
      adminApi.list(resource, { page: 1, limit: 300 }),
      adminApi.list('audit', { q: id, page: 1, limit: 10 }),
    ]).then(([listResult, auditResult]) => {
      if (!active) return
      const found = (listResult.items || []).find((item) => item.id === id)
      setState({ record: found ? mapAdminRows(resource, [found])[0] : null, audit: auditResult.items || [], loading: false })
    }).catch(() => { if (active) setState({ record: null, audit: [], loading: false }) })
    return () => { active = false }
  }, [resource, id])
  return state
}

const identity=(value)=><div className="flex items-center gap-3"><Avatar size="sm" fallback={value.slice(0,2).toUpperCase()}/><span><strong className="block text-xs">{value}</strong><small className="text-white/30">Verified platform record</small></span></div>
const detailRow=(label,value)=><div className="flex items-center justify-between gap-4 border-b border-white/[.07] py-3 text-xs"><span className="text-white/35">{label}</span><strong className="text-right">{value}</strong></div>
const auditPanel = (audit) => <AdminPanel title="Recent audit activity">{audit.length ? audit.map((log) => <div key={log.id} className="flex justify-between border-b border-white/[.07] py-3 text-xs"><span><b className="block">{titleCase(log.action)}</b><small className="text-white/30">{log.actor?.displayName || log.actor?.email || 'System'}</small></span><time className="text-white/25">{date(log.createdAt)}</time></div>) : <p className="text-xs text-white/35">No audit events reference this record yet.</p>}</AdminPanel>

function ManagementTabs({active}){
  const navigate=useNavigate()
  const tabs=[['users','Users','/admin/users',Users],['channels','Channels','/admin/channels',UserRoundCheck],['creators','Creators','/admin/creators',Star],['businesses','Businesses','/admin/businesses',BriefcaseBusiness],['campaigns','Campaigns','/admin/campaigns',Gauge],['contracts','Contracts','/admin/contracts',FileSignature]]
  return <div className="mb-5 flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-[#151515] p-1.5 [scrollbar-width:none]">{tabs.map(([value,label,to,Icon])=><button ref={(node)=>{if(active===value)node?.scrollIntoView({block:'nearest',inline:'center'})}} type="button" key={value} onClick={()=>navigate(to)} className={`flex min-h-10 min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-4 text-[11px] font-bold transition ${active===value?'bg-pink text-black':'text-white/40 hover:bg-white/[.05] hover:text-white'}`}><Icon size={14}/>{label}</button>)}</div>
}

export function AdminManagementPage({section='users'}){
  const navigate=useNavigate()
  const channelType=section==='creators'?'Creator':section==='businesses'?'Business':null
  const {rows:apiRows,loading,error}=useAdminResource(section)
  const loadState=<>{loading&&<div className="mb-4 rounded-xl border border-white/10 bg-white/[.03] p-3 text-xs text-white/45">Loading live admin records…</div>}{error&&<div role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{error}</div>}</>

  if(section==='users'){
    return <AdminDataPage eyebrow="Management · Account directory" title="Management center" copy="Search, review and manage viewer accounts and their channel access." toolbar={<><ManagementTabs active={section}/>{loadState}</>} rows={apiRows} getId={(row)=>row.id} onRow={(row)=>navigate(`/admin/users/${row.id}`)} columns={[
      {key:'name',label:'User',render:(row)=>identity(row.name)},{key:'email',label:'Email'},{key:'type',label:'Account type'},{key:'channels',label:'Channels'},{key:'status',label:'Status',render:(row)=><StatusBadge status={row.status}/>},{key:'joined',label:'Joined'},{key:'active',label:'Last active'},
    ]}/>
  }

  if(section==='channels'||channelType){
    const rows=channelType?apiRows.filter((item)=>item.type===channelType):apiRows
    return <AdminDataPage eyebrow="Management · Channel directory" title="Management center" copy={`Review ${channelType?channelType.toLowerCase():'creator and business'} identity, verification, visibility and trust status.`} toolbar={<><ManagementTabs active={section}/>{loadState}</>} rows={rows} getId={(row)=>row.id} onRow={(row)=>navigate(`/admin/channels/${row.id}`)} filters={['All','Active','Restricted','Suspended','Verified','Unverified']} columns={[
      {key:'name',label:'Channel',render:(row)=>identity(row.name)},{key:'type',label:'Type',render:(row)=><Badge variant={row.type==='Creator'?'pink':'mint'}>{row.type}</Badge>},{key:'owner',label:'Owner'},{key:'category',label:'Category'},{key:'followers',label:'Followers'},{key:'verified',label:'Verification',render:(row)=><StatusBadge status={row.verified}/>},{key:'status',label:'Status',render:(row)=><StatusBadge status={row.status}/>},{key:'reports',label:'Reports'},
    ]}/>
  }

  if(section==='campaigns'){
    return <AdminDataPage eyebrow="Management · Campaign governance" title="Management center" copy="Monitor campaign state, budget, creator participation and report signals." toolbar={<><ManagementTabs active={section}/>{loadState}</>} rows={apiRows} getId={(row)=>row.id} onRow={(row)=>navigate(`/admin/campaigns/${row.id}`)} filters={['All','Open','In progress','Draft','Paused']} columns={[
      {key:'title',label:'Campaign'},{key:'business',label:'Business'},{key:'status',label:'Status',render:(row)=><StatusBadge status={row.status}/>},{key:'budget',label:'Budget'},{key:'applications',label:'Applications'},{key:'creators',label:'Creators'},{key:'deadline',label:'Deadline'},
    ]}/>
  }

  return <AdminDataPage eyebrow="Management · Agreement oversight" title="Management center" copy="Review parties, milestones, escrow status and disputes across active agreements." toolbar={<><ManagementTabs active="contracts"/>{loadState}</>} rows={apiRows} getId={(row)=>row.id} onRow={(row)=>navigate(`/admin/contracts/${row.id}`)} filters={['All','In progress','Completed','Disputed','Payment required']} columns={[
    {key:'id',label:'Contract'},{key:'campaign',label:'Campaign'},{key:'creator',label:'Creator'},{key:'business',label:'Business'},{key:'amount',label:'Value'},{key:'status',label:'Status',render:(row)=><StatusBadge status={row.status}/>},{key:'payment',label:'Payment'},{key:'deadline',label:'Deadline'},
  ]}/>
}

export function AdminUserDetailPage(){
  const {userId}=useParams()
  const navigate=useNavigate()
  const {toast}=useToast()
  const {record:user,audit,loading}=useAdminRecord('users',userId)
  const suspend=async()=>{
    await adminApi.setUserStatus(userId,{status:'SUSPENDED',reason:'Suspended from admin user detail review.'})
    toast('User suspended.',{type:'success'})
    navigate('/admin/users')
  }
  if(loading)return <AdminPage><Skeleton className="h-64"/></AdminPage>
  if(!user)return <AdminPage><EmptyState title="User not found"/><Button variant="outline" onClick={()=>navigate('/admin/users')}>Back</Button></AdminPage>
  return <AdminPage>
    <button onClick={()=>navigate('/admin/users')} className="mb-5 flex items-center gap-2 text-xs text-white/40 hover:text-white"><ArrowLeft size={14}/>Back to users</button>
    <AdminHeader eyebrow={`User record · ${user.id}`} title={user.name} copy={`${user.email} · Joined ${user.joined}`} date={false} action={<DangerAction label="Suspend user" description={`Suspend ${user.name} and restrict access to every connected channel?`} onConfirm={suspend}/>}/>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminStat label="Account status" value={user.status} change={user.type} tone={user.status==='Active'?'mint':'danger'}/>
      <AdminStat label="Connected channels" value={String(user.channels)} change={user.channels?'Creator/business channel active':'No channel yet'}/>
      <AdminStat label="Last active" value={user.active} change="Session activity"/>
      <AdminStat label="Joined" value={user.joined} change="Account created"/>
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <AdminPanel title="Account information">{detailRow('Email',user.email)}{detailRow('Account type',user.type)}{detailRow('Status',user.status)}{detailRow('Last active',user.active)}</AdminPanel>
      {auditPanel(audit)}
    </div>
  </AdminPage>
}

export function AdminChannelDetailPage(){
  const {channelId}=useParams()
  const navigate=useNavigate()
  const {toast}=useToast()
  const {record:channel,audit,loading}=useAdminRecord('channels',channelId)
  const [featured,setFeatured]=useState(false)
  const verify=async()=>{
    await adminApi.verifyChannel(channel.type.toLowerCase(),channelId,{status:'VERIFIED',reason:'Verified from admin channel review.'})
    toast('Verification approved.',{type:'success'})
  }
  const restrict=async()=>{
    if(!channel.userId)return toast('This channel has no linked account to restrict.',{type:'error'})
    await adminApi.setUserStatus(channel.userId,{status:'SUSPENDED',reason:`Restricted channel ${channelId} from admin review.`})
    toast('Channel restricted.',{type:'success'})
    navigate('/admin/channels')
  }
  if(loading)return <AdminPage><Skeleton className="h-64"/></AdminPage>
  if(!channel)return <AdminPage><EmptyState title="Channel not found"/><Button variant="outline" onClick={()=>navigate('/admin/channels')}>Back</Button></AdminPage>
  return <AdminPage>
    <button onClick={()=>navigate('/admin/channels')} className="mb-5 flex items-center gap-2 text-xs text-white/40 hover:text-white"><ArrowLeft size={14}/>Back to channels</button>
    <AdminHeader eyebrow={`${channel.type} channel · ${channel.id}`} title={channel.name} copy={`${channel.category} · Owned by ${channel.owner}`} date={false} action={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={verify}><ShieldCheck size={14}/>Verify</Button><DangerAction label="Restrict" description={`Restrict publishing and marketplace actions for ${channel.name}?`} onConfirm={restrict}/></div>}/>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminStat label="Followers" value={String(channel.followers)} change="Reported by connected socials" tone="mint"/>
      <AdminStat label="Rating" value={channel.rating || 'Not rated'} change="Average from completed collaborations"/>
      <AdminStat label="Verification" value={channel.verified} change="Channel trust signal"/>
      <AdminStat label="Status" value={channel.status} change={channel.status==='Active'?'No restriction':'Restricted'} tone={channel.status==='Active'?'mint':'danger'}/>
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <AdminPanel title="Identity & visibility">{detailRow('Channel type',channel.type)}{detailRow('Owner',channel.owner)}{detailRow('Category',channel.category)}{detailRow('Verification',channel.verified)}{detailRow('Status',channel.status)}<div className="mt-5"><Switch label="Featured channel" description="Local preview only — featured placement is not yet wired to a backend flag." checked={featured} onChange={()=>setFeatured(!featured)}/></div></AdminPanel>
      {auditPanel(audit)}
    </div>
  </AdminPage>
}

export function AdminCampaignDetailPage(){
  const {campaignId}=useParams()
  const navigate=useNavigate()
  const {toast}=useToast()
  const {record:item,audit,loading}=useAdminRecord('campaigns',campaignId)
  const setStatus=async(status)=>{
    await adminApi.setCampaignStatus(campaignId,{status,reason:`Campaign ${status.toLowerCase()} from admin review.`})
    toast(`Campaign ${status.toLowerCase()}.`,{type:'success'})
    navigate('/admin/campaigns')
  }
  if(loading)return <AdminPage><Skeleton className="h-64"/></AdminPage>
  if(!item)return <AdminPage><EmptyState title="Campaign not found"/><Button variant="outline" onClick={()=>navigate('/admin/campaigns')}>Back</Button></AdminPage>
  return <AdminPage>
    <button onClick={()=>navigate('/admin/campaigns')} className="mb-5 flex items-center gap-2 text-xs text-white/40"><ArrowLeft size={14}/>Back to campaigns</button>
    <AdminHeader eyebrow={`Campaign · ${item.id}`} title={item.title} copy={`${item.business} · Created ${date(item.createdAt)}`} date={false} action={<div className="flex gap-2"><Button variant="outline" onClick={()=>setStatus('OPEN')}>Approve / reopen</Button><DangerAction label="Pause campaign" onConfirm={()=>setStatus('PAUSED')}/></div>}/>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminStat label="Budget" value={item.budget} change="Budget disclosed by business"/>
      <AdminStat label="Applications" value={String(item.applications)} change="Proposals submitted" tone="mint"/>
      <AdminStat label="Hired creators" value={String(item.creators)} change="Active collaborations"/>
      <AdminStat label="Deadline" value={item.deadline} change="Application deadline"/>
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <AdminPanel title="Campaign information">{detailRow('Business',item.business)}{detailRow('Status',item.status)}{detailRow('Deadline',item.deadline)}{detailRow('Platforms',(item.platforms||[]).join(', ')||'—')}{detailRow('Goal',item.goal||'—')}</AdminPanel>
      {auditPanel(audit)}
    </div>
  </AdminPage>
}

export function AdminContractDetailPage(){
  const {contractId}=useParams()
  const navigate=useNavigate()
  const {toast}=useToast()
  const {record:item,audit,loading}=useAdminRecord('contracts',contractId)
  const freeze=async()=>{
    await adminApi.freezeContract(contractId,{reason:'Contract frozen from admin review.'})
    toast('Contract payments frozen for review.',{type:'success'})
  }
  if(loading)return <AdminPage><Skeleton className="h-64"/></AdminPage>
  if(!item)return <AdminPage><EmptyState title="Contract not found"/><Button variant="outline" onClick={()=>navigate('/admin/contracts')}>Back</Button></AdminPage>
  return <AdminPage>
    <button onClick={()=>navigate('/admin/contracts')} className="mb-5 flex items-center gap-2 text-xs text-white/40"><ArrowLeft size={14}/>Back to contracts</button>
    <AdminHeader eyebrow="Contract oversight" title={item.id} copy={`${item.campaign} · ${item.creator} × ${item.business}`} date={false} action={<DangerAction label="Freeze contract" onConfirm={freeze}/>}/>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminStat label="Contract value" value={item.amount} change="10% platform commission"/>
      <AdminStat label="Contract status" value={item.status} change={`Deadline ${item.deadline}`}/>
      <AdminStat label="Payment state" value={item.payment} change="Latest payment record" tone="mint"/>
      <AdminStat label="Dispute" value={item.dispute} change="Administrative review"/>
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <AdminPanel title="Agreement summary">{detailRow('Creator',item.creator)}{detailRow('Business',item.business)}{detailRow('Campaign',item.campaign)}{detailRow('Creator signed',date(item.creatorSignedAt))}{detailRow('Business signed',date(item.businessSignedAt))}{detailRow('Activated',date(item.activatedAt))}</AdminPanel>
      {auditPanel(audit)}
    </div>
  </AdminPage>
}
