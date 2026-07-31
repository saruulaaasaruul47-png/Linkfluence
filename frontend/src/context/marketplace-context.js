import { createContext, useContext } from 'react'

export const MarketplaceContext = createContext(null)

export function useMarketplace() {
  const value = useContext(MarketplaceContext)
  if (!value) throw new Error('useMarketplace must be used inside MarketplaceProvider')
  return value
}
