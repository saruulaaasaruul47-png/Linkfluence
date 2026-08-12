export const marketplaceFilterNames = [
  'niche', 'platform', 'verified', 'available', 'rating', 'engagement', 'followers',
  'price', 'currency', 'location', 'language', 'skills', 'industry', 'completed',
  'open', 'goal', 'budget', 'deadline',
]

const booleanFilters = new Set(['verified', 'available', 'open'])

export function parseMarketplaceSearch(params) {
  const filters = marketplaceFilterNames.reduce((result, name) => {
    const value = params.get(name)
    if (value) result[name] = booleanFilters.has(name) ? value === 'true' : value
    return result
  }, {})
  return {
    query: params.get('q') || params.get('category') || '',
    sort: params.get('sort') || 'recommended',
    filters,
  }
}

export function buildMarketplaceSearch({ query, sort, filters }) {
  const params = new URLSearchParams()
  if (query.trim()) params.set('q', query.trim())
  if (sort !== 'recommended') params.set('sort', sort)
  Object.entries(filters).forEach(([name, value]) => {
    if (value) params.set(name, String(value))
  })
  return params
}

export function mergeUniqueById(current, incoming) {
  return [...new Map([...current, ...incoming].map((item) => [item.id, item])).values()]
}
