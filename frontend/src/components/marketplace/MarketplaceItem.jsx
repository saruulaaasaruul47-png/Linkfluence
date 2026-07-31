import { businesses, campaigns, creators, showcases } from '../../data/marketplace'
import { BusinessCard, CampaignCard, CreatorCard, ShowcaseCard } from './cards'

export function MarketplaceItem({ itemKey, compact=false }) {
  const [type,id]=itemKey.split(':')
  if(type==='creator'){const item=creators.find((value)=>value.id===id);return item?<CreatorCard creator={item} compact={compact}/>:null}
  if(type==='business'){const item=businesses.find((value)=>value.id===id);return item?<BusinessCard business={item}/>:null}
  if(type==='showcase'){const item=showcases.find((value)=>value.id===id);return item?<ShowcaseCard item={item}/>:null}
  if(type==='campaign'){const item=campaigns.find((value)=>value.id===id);return item?<CampaignCard campaign={item}/>:null}
  return null
}
