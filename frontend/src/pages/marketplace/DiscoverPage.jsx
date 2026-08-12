import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { marketplaceApi } from '../../api/marketplace.api'
import {
  toBusinessCard,
  toCampaignCard,
  toCreatorCard,
  toShowcaseCard,
} from '../../api/marketplace.mapper'
import { SectionHeader } from '../../components/marketplace/MarketplaceLayout'
import {
  FeaturedSection,
  HeroSearch,
  RecommendationSection,
  TrendingSection,
} from '../../components/marketplace/DiscoverySections'
import {
  BusinessCard,
  CampaignCard,
  CategoryCard,
  CollectionCard,
  CreatorCard,
  ShowcaseCard,
} from '../../components/marketplace/cards'
import { MarketplaceItem } from '../../components/marketplace/MarketplaceItem'
import { useMarketplace } from '../../context/marketplace-context'
import { useAuth } from '../../context/auth-context'
import { EmptyState } from '../../components/ui'

const categoryFallbackImage = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=700&q=85'
const categoryImages = {
  Fashion: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&q=85',
  Beauty: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=700&q=85',
  Travel: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=85',
  Food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=700&q=85',
  Technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=700&q=85',
  Sport: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=700&q=85',
  Gaming: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=700&q=85',
  Music: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=700&q=85',
}

export default function DiscoverPage() {
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const { collections, recent, saved, following } = useMarketplace()
  const [discovery, setDiscovery] = useState(null)
  const [state, setState] = useState({ loading: true, error: '' })
  useEffect(() => {
    let active = true
    marketplaceApi.discover({ limit: 8 })
      .then((result) => { if (active) { setDiscovery(result); setState({ loading: false, error: '' }) } })
      .catch(() => { if (active) setState({ loading: false, error: 'Discovery content could not be loaded right now.' }) })
    return () => { active = false }
  }, [])
  const creatorItems = useMemo(() => discovery?.creators?.map(toCreatorCard) || [], [discovery])
  const businessItems = useMemo(() => discovery?.businesses?.map(toBusinessCard) || [], [discovery])
  const campaignItems = hasRole('creator') ? discovery?.campaigns?.map(toCampaignCard) || [] : []
  const showcaseItems = useMemo(() => discovery?.showcase?.map(toShowcaseCard) || [], [discovery])
  const categoryItems = discovery?.categories?.map((item) => ({
    ...item,
    count: item.creatorCount,
    image: categoryImages[item.name] || categoryFallbackImage,
  })) || []
  const search = (query) => navigate(`/search?q=${encodeURIComponent(query)}`)
  const recommendedCreators = useMemo(() => {
    const signals = new Set([...saved, ...following, ...recent])
    const categoryWords = [...signals].flatMap((key) => {
      const [, id] = key.split(':')
      const creator = creatorItems.find((item) => item.id === id)
      const business = businessItems.find((item) => item.id === id)
      const work = showcaseItems.find((item) => item.id === id)
      return `${creator?.niche || ''} ${business?.industry || ''} ${work?.category || ''}`.toLowerCase().split(/\W+/)
    })
    return [...creatorItems].sort((a, b) => {
      const score = (item) => categoryWords.filter((word) => word.length > 3 && item.niche.toLowerCase().includes(word)).length + (signals.has(`creator:${item.id}`) ? 4 : 0)
      return score(b) - score(a)
    }).slice(0, 4)
  }, [businessItems, creatorItems, following, recent, saved, showcaseItems])

  if (state.loading) {
    return <main className="mx-auto grid min-h-[60vh] max-w-[1500px] place-items-center px-5 py-28"><p className="text-sm text-white/40">Loading discovery…</p></main>
  }
  if (state.error) {
    return <main className="mx-auto max-w-[1500px] px-5 py-28"><EmptyState title="Discovery is unavailable" description={state.error} /></main>
  }

  return (
    <main>
      <HeroSearch
        onSearch={search}
        image={creatorItems[0]?.cover || creatorItems[0]?.avatar || ''}
        suggestions={['Fashion creators', 'Verified businesses', 'Editorial film', 'Travel creators']}
        trending={['Fashion voices', 'Creator work', 'Travel film', 'Verified creators']}
      />

      <div className="mx-auto max-w-[1500px] space-y-20 px-5 py-14 lg:px-8 lg:py-16">
        {categoryItems.length > 0 && (
          <section>
            <SectionHeader eyebrow="Browse your way" title="Category navigation" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categoryItems.slice(0, 4).map((item) => (
                <CategoryCard key={item.id} category={item} />
              ))}
            </div>
          </section>
        )}

        {creatorItems.length > 0 && (
          <FeaturedSection
            eyebrow="Talent radar"
            title="Featured creators"
            link="Explore all"
            onLink={() => navigate('/search/creators')}
          >
            {creatorItems.slice(0, 4).map((item) => (
              <CreatorCard key={item.id} creator={item} compact />
            ))}
          </FeaturedSection>
        )}

        {businessItems.length > 0 && (
          <FeaturedSection
            eyebrow="Trusted partners"
            title="Featured businesses"
            link="View businesses"
            onLink={() => navigate('/search/businesses')}
          >
            {businessItems.slice(0, 4).map((item) => (
              <BusinessCard key={item.id} business={item} />
            ))}
          </FeaturedSection>
        )}

        {campaignItems.length > 0 && (
          <FeaturedSection
            eyebrow="Now accepting"
            title="Featured campaigns"
            link="Search campaigns"
            onLink={() => navigate('/search/campaigns')}
          >
            {campaignItems.slice(0, 4).map((item) => (
              <CampaignCard key={item.id} campaign={item} />
            ))}
          </FeaturedSection>
        )}

        {showcaseItems.length > 0 && (
          <TrendingSection onLink={() => navigate('/showcase')}>
            {showcaseItems.slice(0, 4).map((item) => (
              <ShowcaseCard key={item.id} item={item} />
            ))}
          </TrendingSection>
        )}

        {recommendedCreators.length > 0 && (
          <RecommendationSection>
            {recommendedCreators.map((item) => (
              <CreatorCard key={item.id} creator={item} compact />
            ))}
          </RecommendationSection>
        )}

        {collections.length > 0 && (
          <section>
            <SectionHeader
              eyebrow="Curated by the community"
              title="Popular collections"
              link="Explore collections"
              onLink={() => navigate('/collections')}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {collections.slice(0, 4).map((item) => (
                <CollectionCard key={item.id} collection={item} />
              ))}
            </div>
          </section>
        )}

        {recent.length > 0 && (
          <section>
            <SectionHeader eyebrow="Pick up where you left off" title="Recently viewed" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recent.map((key) => (
                <MarketplaceItem key={key} itemKey={key} compact />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
