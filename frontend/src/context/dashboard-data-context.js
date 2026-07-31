import { createContext, useContext } from 'react'

export const DashboardDataContext = createContext(null)

export function useDashboardData() {
  const value = useContext(DashboardDataContext)
  if (!value) throw new Error('useDashboardData must be used inside DashboardDataProvider')
  return value
}
