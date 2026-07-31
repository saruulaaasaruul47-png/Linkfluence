import { useState } from 'react'
import { BadgeDollarSign, Download, ReceiptText, RotateCcw, WalletCards } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { AdminDataPage, AdminHeader, AdminPage, AdminPanel, AdminStat, DangerAction, StatusBadge } from '../../components/admin/AdminUI'
import { Badge, Button, Drawer } from '../../components/ui'
import { adminPayments } from '../../data/admin'

const paymentColumns=[
  {key:'id',label:'Payment'},{key:'user',label:'Payer'},{key:'contract',label:'Contract'},{key:'amount',label:'Amount'},{key:'method',label:'Method'},{key:'status',label:'Status',render:(row)=><StatusBadge status={row.status}/>},{key:'date',label:'Processed'},
]

const transactionRows=adminPayments.map((item,index)=>({
  ...item,
  type:['Escrow funding','Milestone release','Card attempt','Customer refund'][index],
  direction:index===3?'Debit':'Credit',
  destination:['Contract escrow','Creator wallet','Payment processor','Customer account'][index],
  reference:`LED-${8042-index*7}`,
}))
const transactionColumns=[
  {key:'reference',label:'Ledger ref'},{key:'type',label:'Movement'},{key:'direction',label:'Direction',render:(row)=><Badge variant={row.direction==='Credit'?'mint':'outline'}>{row.direction}</Badge>},{key:'user',label:'Source'},{key:'destination',label:'Destination'},{key:'amount',label:'Amount'},{key:'status',label:'State',render:(row)=><StatusBadge status={row.status}/>},{key:'date',label:'Posted'},
]

const commissionRows=adminPayments.map((item,index)=>({
  ...item,
  feeId:`FEE-${8042-index*7}`,
  rate:'10%',
  settlement:item.status==='Paid'?'Settled':item.status==='Escrow'?'Pending':item.status==='Failed'?'Void':'Reversed',
  net:['₮8.64M','₮5.175M','₮2.16M','₮5.76M'][index],
}))
const commissionColumns=[
  {key:'feeId',label:'Fee record'},{key:'id',label:'Source transaction'},{key:'user',label:'Account'},{key:'amount',label:'Gross value'},{key:'rate',label:'Rate'},{key:'commission',label:'Commission'},{key:'net',label:'Net to creator'},{key:'settlement',label:'Settlement',render:(row)=><StatusBadge status={row.settlement}/>},
]

const viewConfig={
  payments:{
    eyebrow:'Finance · Payment operations',
    title:'Payments',
    copy:'Monitor contract payment attempts, methods, escrow funding, failures and refund eligibility.',
    rows:adminPayments,
    columns:paymentColumns,
    filters:['All','Paid','Escrow','Failed','Refunded'],
    stats:[['Processed volume','₮24.15M','4 payment records','pink'],['In escrow','₮9.6M','Awaiting milestone approval','mint'],['Failed payments','1','Requires payer attention','danger'],['Success rate','75%','Excluding refunded records','mint']],
  },
  transactions:{
    eyebrow:'Finance · Immutable ledger',
    title:'Transactions',
    copy:'Trace every credit and debit movement between payer, escrow, creator wallet and customer account.',
    rows:transactionRows,
    columns:transactionColumns,
    filters:['All','Credit','Debit','Paid','Escrow','Failed'],
    stats:[['Ledger entries','4','All mock movements','pink'],['Credits','₮17.75M','3 recorded entries','mint'],['Debits','₮6.4M','1 refund movement','danger'],['Unreconciled','1','Failed processor attempt','danger']],
  },
  commissions:{
    eyebrow:'Finance · Platform revenue',
    title:'Commissions',
    copy:'Review platform fees earned from source transactions, commission rates and settlement state.',
    rows:commissionRows,
    columns:commissionColumns,
    filters:['All','Settled','Pending','Void','Reversed'],
    stats:[['Commission recorded','₮2.415M','10% blended rate','mint'],['Settled revenue','₮575K','Available to platform','mint'],['Pending revenue','₮960K','Held with escrow','pink'],['Reversed / void','₮880K','Failed or refunded','danger']],
  },
}

function FinanceTabs({active,onChange}){
  const tabs=[['payments','Payments',ReceiptText],['transactions','Transactions',WalletCards],['commissions','Commissions',BadgeDollarSign]]
  return <div className="mb-5 flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-[#151515] p-2 [scrollbar-width:none]">{tabs.map(([value,label,Icon])=><button ref={(node)=>{if(active===value)node?.scrollIntoView({block:'nearest',inline:'center'})}} key={value} onClick={()=>onChange(value)} className={`flex min-h-11 min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-5 text-xs font-bold transition ${active===value?'bg-pink text-black':'text-white/40 hover:bg-white/[.05] hover:text-white'}`}><Icon size={15}/>{label}</button>)}</div>
}

export function AdminPaymentsPage({mode}){
  const [params,setParams]=useSearchParams()
  const requested=mode||params.get('view')||'payments'
  const active=viewConfig[requested]?requested:'payments'
  const config=viewConfig[active]
  const [selected,setSelected]=useState(null)
  const change=(value)=>{setSelected(null);setParams(value==='payments'?{}:{view:value})}
  const summary=<div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{config.stats.map(([label,value,changeText,tone])=><AdminStat key={label} label={label} value={value} change={changeText} tone={tone}/>)}</div>
  return <><AdminDataPage eyebrow={config.eyebrow} title="Finance center" copy={config.copy} rows={config.rows} columns={config.columns} getId={(row)=>row.feeId||row.reference||row.id} onRow={setSelected} filters={config.filters} toolbar={<FinanceTabs active={active} onChange={change}/>} summary={summary} actions={<Button variant="outline"><Download size={14}/>Export {config.title.toLowerCase()}</Button>}/><Drawer open={Boolean(selected)} onClose={()=>setSelected(null)} title={`${config.title} detail`}>{selected&&<div className="space-y-5 text-xs"><div className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><small className="text-white/30">{selected.feeId||selected.reference||selected.id}</small><strong className="mt-2 block text-3xl">{active==='commissions'?selected.commission:selected.amount}</strong><div className="mt-3"><StatusBadge status={selected.settlement||selected.status}/></div></div>{Object.entries(selected).filter(([key])=>!['feeId','reference'].includes(key)).map(([key,value])=><div key={key} className="flex justify-between gap-4 border-b border-white/10 pb-3"><span className="capitalize text-white/35">{key.replaceAll(/([A-Z])/g,' $1')}</span><b className="text-right">{value}</b></div>)}{active==='payments'&&<DangerAction label="Issue refund" title="Confirm mock refund" description="This updates frontend feedback only. No money will move."/>}</div>}</Drawer></>
}

export function AdminRefundsPage(){
  const rows=adminPayments.filter((item)=>item.status==='Refunded')
  return <AdminDataPage eyebrow="Finance · Refund operations" title="Refunds" copy="Review returned payments and their original contract references." rows={rows} columns={paymentColumns} getId={(row)=>row.id} filters={['All','Refunded']} actions={<Button variant="outline"><RotateCcw size={14}/>Export refunds</Button>}/>
}

export function AdminFinanceOverviewPage(){return <AdminPage><AdminHeader eyebrow="Finance · Platform ledger" title="Financial operations" copy="Commission, transaction and refund health across the mock marketplace." action={<Button variant="outline"><Download size={14}/>Export report</Button>}/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><AdminStat label="Gross transaction volume" value="₮2.84B" change="+18.7% this month"/><AdminStat label="Commission earned" value="₮284M" change="10% blended rate" tone="mint"/><AdminStat label="Escrow balance" value="₮468M" change="72 active contracts"/><AdminStat label="Refunded" value="₮18.2M" change="0.64% refund rate" tone="danger"/></div><div className="mt-5 grid gap-5 xl:grid-cols-2"><AdminPanel title="Settlement health"><div className="space-y-3">{[['Settled','₮1.92B','68%'],['In escrow','₮468M','17%'],['Pending','₮384M','13%'],['Failed','₮68M','2%']].map(([label,value,width])=><div key={label}><div className="mb-2 flex justify-between text-xs"><span>{label}</span><b>{value}</b></div><div className="h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-mint" style={{width}}/></div></div>)}</div></AdminPanel><AdminPanel title="Finance controls"><div className="grid grid-cols-2 gap-3"><Button variant="outline" className="min-h-20">Reconcile ledger</Button><Button variant="outline" className="min-h-20">Export statement</Button><Button variant="outline" className="min-h-20"><RotateCcw size={14}/>Refund queue</Button><DangerAction label="Pause payouts"/></div></AdminPanel></div></AdminPage>}
