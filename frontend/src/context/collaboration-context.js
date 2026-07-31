import { createContext, useContext } from 'react'

export const CollaborationContext = createContext(null)

export function useCollaboration() {
  const value = useContext(CollaborationContext)
  if (!value) throw new Error('useCollaboration must be used inside CollaborationProvider')
  return value
}
