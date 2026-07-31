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
import { businesses, campaigns, categories, creators, showcases } from '../../data/marketplace'
import { useMarketplace } from '../../context/marketplace-context'

export default function DiscoverPage() {
  const navigate = useNavigate()
  const { collections, recent, saved, following } = useMarketplace()
  const [discovery, setDiscovery] = useState(null)
  useEffect(() => {
    let active = true
    marketplaceApi.discover({ limit: 8 })
      .then((result) => { if (active) setDiscovery(result) })
      .catch(() => {})
    return () => { active = false }
  }, [])
  const creatorItems = discovery?.creators?.map(toCreatorCard) || creators
  const businessItems = discovery?.businesses?.map(toBusinessCard) || businesses
  const campaignItems = discovery?.campaigns?.map(toCampaignCard) || campaigns
  const showcaseItems = discovery?.showcase?.map(toShowcaseCard) || showcases
  const categoryItems = discovery?.categories?.map((item) => ({
    ...item,
    count: item.creatorCount,
    image: categories.find((value) => value.name === item.name)?.image || categories[0].image,
  })) || categories
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

  return (
    <main>
      <HeroSearch
        onSearch={search}
        image={(creatorItems[0]?.avatar || creators[0].avatar).replace('w=300', 'w=1600')}
        suggestions={[
          'Fashion creators',
          'Open travel campaigns',
          'Verified businesses',
          'Editorial film',
        ]}
        trending={['Fashion voices', 'Open campaigns', 'Travel film', 'Verified creators']}
      />

      <div className="mx-auto max-w-[1500px] space-y-20 px-5 py-14 lg:px-8 lg:py-16">
        <section>
          <SectionHeader
            eyebrow="Browse your way"
            title="Category navigation"
            link="All categories"
            onLink={() => navigate('/categories')}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categoryItems.slice(0, 4).map((item) => (
              <CategoryCard key={item.id} category={item} />
            ))}
          </div>
        </section>

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

        <TrendingSection onLink={() => navigate('/showcase')}>
          {showcaseItems.slice(0, 4).map((item) => (
            <ShowcaseCard key={item.id} item={item} />
          ))}
        </TrendingSection>

        <RecommendationSection>
          {recommendedCreators.map((item) => (
            <CreatorCard key={item.id} creator={item} compact />
          ))}
        </RecommendationSection>

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
