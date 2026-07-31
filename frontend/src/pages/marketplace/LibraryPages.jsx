import { useState } from 'react'
import { ArrowUpRight, Bookmark, Edit3, FolderPlus, Layers3, Plus, Share2, Trash2, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHero, SectionHeader } from '../../components/marketplace/MarketplaceLayout'
import { CategoryCard, CollectionCard, ShowcaseCard } from '../../components/marketplace/cards'
import { MarketplaceItem } from '../../components/marketplace/MarketplaceItem'
import { ShowcaseFeed } from '../../components/marketplace/ShowcaseFeed'
import { Button, Dialog, EmptyState, Input, Select, Textarea, useToast } from '../../components/ui'
import { categories, showcases } from '../../data/marketplace'
import { useMarketplace } from '../../context/marketplace-context'
import { useCollaboration } from '../../context/collaboration-context'

export function ShowcasePage() {
  return <ShowcaseFeed />
}

export function ShowcaseDetailPage() {
  const { id }=useParams()
  const navigate=useNavigate()
  const { publishedShowcases }=useCollaboration()
  const { saved,toggleSaved,share,openCollection,markViewed }=useMarketplace()
  const allShowcases=[...publishedShowcases,...showcases]
  const item=allShowcases.find((value)=>value.id===id)
  if(!item)return <main className="mx-auto max-w-[1500px] px-5 py-28"><EmptyState title="Showcase not found"/></main>
  const key=`showcase:${item.id}`
  const isSaved=saved.includes(key)
  const metrics=[
    ...Object.entries(item.statistics||{}).map(([label,value])=>({ label,value })),
    ...(item.likes!==undefined?[{ label:'Likes',value:item.likes.toLocaleString() }]:[]),
    ...(item.saves!==undefined?[{ label:'Saves',value:item.saves.toLocaleString() }]:[]),
    ...(item.shares!==undefined?[{ label:'Shares',value:item.shares.toLocaleString() }]:[]),
  ]
  return <main onMouseEnter={()=>markViewed(key)}><section className="mx-auto grid max-w-[1500px] gap-8 px-5 pb-16 pt-12 lg:grid-cols-[1.35fr_.65fr] lg:px-8 lg:pt-20"><div className="overflow-hidden rounded-[2rem] border border-white/10"><img src={item.image} alt={item.title} loading="lazy" decoding="async" className="max-h-[78vh] w-full object-cover"/></div><aside className="flex flex-col justify-between py-3"><div><p className="eyebrow text-white/35">{item.category} · Completed campaign</p><h1 className="mt-5 break-words text-4xl font-extrabold uppercase leading-[.86] tracking-[-.07em] md:text-5xl xl:text-6xl">{item.title}</h1><p className="mt-7 text-sm leading-6 text-white/50">A creator-led collaboration built around a clear cultural insight, distinctive execution and measurable audience response.</p><div className="mt-8 border-y border-white/10 py-5"><button onClick={()=>navigate(`/creators/${item.creatorId}`)} className="flex w-full items-center justify-between py-2 text-left"><span><small className="block uppercase tracking-[.12em] text-white/30">Creator</small><strong className="mt-1 block">{item.creator}</strong></span><ArrowUpRight size={16}/></button><div className="flex items-center justify-between py-2"><span><small className="block uppercase tracking-[.12em] text-white/30">Business</small><strong className="mt-1 block">{item.business}</strong></span></div></div><div className="mt-6 rounded-2xl bg-mint-soft p-5 text-black"><small className="uppercase tracking-[.12em] opacity-50">Performance summary</small><strong className="mt-2 block text-xl">{item.performance}</strong></div>{metrics.length>0&&<dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{metrics.map(({ label,value })=><div key={label} className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><dt className="text-[10px] uppercase tracking-[.12em] text-white/30">{label}</dt><dd className="mt-2 text-lg font-bold">{value}</dd></div>)}</dl>}</div><div className="mt-8 grid grid-cols-2 gap-2"><Button variant={isSaved?'pink':'outline'} onClick={()=>toggleSaved(key)}><Bookmark size={15}/>{isSaved?'Saved':'Save'}</Button><Button variant="outline" onClick={()=>share(item.title,window.location.href,key)}><Share2 size={15}/>Share</Button><Button className="col-span-2" variant="secondary" onClick={()=>openCollection(key)}><Layers3 size={15}/>Add to collection</Button></div></aside></section><section className="mx-auto max-w-[1500px] border-t border-white/10 px-5 py-16 lg:px-8"><SectionHeader eyebrow="More standout work" title="Continue exploring"/><div className="columns-1 gap-5 md:columns-2 xl:columns-3">{allShowcases.filter((value)=>value.id!==id).slice(0,3).map((value)=><ShowcaseCard key={value.id} item={value}/>)}</div></section></main>
}

export function CategoriesPage() { return <main><PageHero eyebrow="Explore the network" title="BROWSE BY" script="culture." copy="Move through the marketplace by creative world, audience interest and visual language." /><div className="mx-auto grid max-w-[1500px] gap-5 px-5 py-14 sm:grid-cols-2 lg:grid-cols-3 lg:px-8">{categories.map((item, index) => <CategoryCard key={item.id} category={item} large={index === 0 || index === 4} />)}</div></main> }

export function CollectionsPage() { const { collections, createEmptyCollection } = useMarketplace(); return <main><PageHero eyebrow="Curated references" title="COLLECT WHAT" script="inspires you." copy="Keep creators, businesses and standout work together for the moments that matter."><Button variant="pink" size="lg" onClick={createEmptyCollection}><FolderPlus size={16} /> New collection</Button></PageHero><div className="mx-auto max-w-[1500px] px-5 py-14 lg:px-8">{collections.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{collections.map((item) => <CollectionCard key={item.id} collection={item} />)}</div> : <EmptyState title="No collections yet" onAction={createEmptyCollection} />}</div></main> }

export function CollectionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { collections, updateCollection, deleteCollection, removeCollectionItem, share } = useMarketplace()
  const collection = collections.find((item) => item.id === id)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [draft, setDraft] = useState({ name: '', description: '', cover: '', visibility: 'private' })
  if (!collection) return <main className="mx-auto max-w-[1500px] px-5 py-28"><EmptyState title="Collection not found" /></main>
  const openEdit = () => {
    setDraft({ name: collection.name, description: collection.description, cover: collection.cover, visibility: collection.visibility })
    setEditOpen(true)
  }
  const saveEdit = (event) => {
    event.preventDefault()
    if (!draft.name.trim()) return
    updateCollection(collection.id, { ...draft, name: draft.name.trim(), description: draft.description.trim() })
    setEditOpen(false)
    toast('Collection updated.', { type: 'success' })
  }
  const confirmDelete = () => {
    deleteCollection(collection.id)
    setDeleteOpen(false)
    toast('Collection deleted.', { type: 'success' })
    navigate('/collections', { replace: true })
  }
  return <main><section className="relative min-h-[26rem] overflow-hidden border-b border-white/10"><img src={collection.cover} alt="" decoding="async" className="absolute inset-0 size-full object-cover opacity-30" /><div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30" /><div className="relative mx-auto max-w-[1500px] px-5 py-16 lg:px-8"><p className="eyebrow text-white/35">Collection · {collection.items.length} items · {collection.visibility}</p><h1 className="mt-5 max-w-4xl break-words text-4xl font-extrabold uppercase leading-[.86] tracking-[-.07em] md:text-5xl xl:text-6xl">{collection.name}</h1><p className="mt-6 max-w-xl text-sm leading-6 text-white/50">{collection.description}</p><div className="mt-8 flex flex-wrap gap-2"><Button variant="pink" onClick={() => navigate('/saved')}><Plus size={15} />Add from saved</Button><Button variant="outline" onClick={openEdit}><Edit3 size={15} />Edit</Button><Button variant="outline" onClick={() => share(collection.name, window.location.href)}><Share2 size={15} />Share</Button><Button variant="ghost" onClick={() => setDeleteOpen(true)}><Trash2 size={15} />Delete</Button></div></div></section><div className="mx-auto max-w-[1500px] px-5 py-14 lg:px-8">{collection.items.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{collection.items.map((key) => <div key={key} className="relative"><MarketplaceItem itemKey={key} /><button type="button" aria-label="Remove from collection" onClick={() => { removeCollectionItem(collection.id, key); toast('Removed from collection.', { type: 'success' }) }} className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full border border-white/15 bg-black/70 text-white transition hover:bg-pink hover:text-black"><X size={14} /></button></div>)}</div> : <EmptyState title="This collection is empty" description="Open Saved items, then choose Add to collection on a creator, business or showcase." onAction={() => navigate('/saved')} action="Browse saved items" />}</div>
    <Dialog dark open={editOpen} onClose={() => setEditOpen(false)} title="Edit collection" description="Update how this collection appears and who can access it."><form onSubmit={saveEdit} className="space-y-4"><Input label="Collection name" value={draft.name} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} required /><Textarea label="Description" value={draft.description} onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))} /><Input label="Cover image URL" type="url" value={draft.cover} onChange={(event) => setDraft((value) => ({ ...value, cover: event.target.value }))} /><Select label="Visibility" value={draft.visibility} onChange={(event) => setDraft((value) => ({ ...value, visibility: event.target.value }))} options={[{ label: 'Private — only you', value: 'private' }, { label: 'Shareable — anyone with link', value: 'shareable' }, { label: 'Public — visible on profile', value: 'public' }]} /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button><Button type="submit" variant="pink">Save changes</Button></div></form></Dialog>
    <Dialog dark open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete this collection?" description="The collection will be removed from this browser. Saved items themselves will stay saved."><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button><Button variant="pink" onClick={confirmDelete}><Trash2 size={15} />Delete collection</Button></div></Dialog>
  </main>
}

export function SavedPage() { const { saved, openCollection } = useMarketplace(); return <main><PageHero eyebrow="Your private library" title="SAVED FOR" script="later." copy="Everything you bookmarked, ready to organize into a working collection." /><div className="mx-auto max-w-[1500px] px-5 py-14 lg:px-8"><SectionHeader eyebrow={`${saved.length} saved items`} title="All saves" />{saved.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{saved.map((key) => <div key={key} className="space-y-2"><MarketplaceItem itemKey={key} /><Button variant="outline" className="w-full" onClick={() => openCollection(key)}><Layers3 size={14} /> Add to collection</Button></div>)}</div> : <EmptyState title="Nothing saved yet" description="Use the bookmark action on creators, businesses and showcase work." />}</div></main> }

export function FollowingPage() { const { following } = useMarketplace(); return <main><PageHero eyebrow="Channels you follow" title="KEEP UP WITH" script="good work." copy="A focused view of creators and businesses you want to hear from." /><div className="mx-auto max-w-[1500px] px-5 py-14 lg:px-8">{following.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{following.map((key) => <MarketplaceItem key={key} itemKey={key} />)}</div> : <EmptyState title="You are not following any channels" description="Follow channels to build a more relevant discovery experience." />}</div></main> }
