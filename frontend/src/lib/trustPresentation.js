export const availabilityOptions = [
  { value: 'AVAILABLE_NOW', label: 'Available now' },
  { value: 'AVAILABLE_THIS_MONTH', label: 'Available this month' },
  { value: 'LIMITED', label: 'Limited availability' },
  { value: 'NOT_ACCEPTING', label: 'Not accepting work' },
]

export function socialTrustPresentation(connection = {}) {
  if (connection.connectionType === 'MANUAL' || connection.syncStatus === 'MANUAL') {
    return {
      badge: 'Manual · unverified',
      detail: 'Self-reported profile. Audience statistics are not provider verified.',
      tone: 'outline',
      canRefresh: false,
      needsReconnect: false,
    }
  }
  if (connection.syncStatus === 'REAUTH_REQUIRED') {
    return { badge: 'Reconnect required', detail: connection.syncError || 'Provider access expired. Reconnect to verify new statistics.', tone: 'pink', canRefresh: false, needsReconnect: true }
  }
  if (connection.syncStatus === 'ERROR') {
    return { badge: 'Sync failed', detail: connection.syncError || 'The last provider refresh failed.', tone: 'pink', canRefresh: true, needsReconnect: false }
  }
  if (connection.isStale || connection.syncStatus === 'STALE') {
    return { badge: 'Stats are stale', detail: 'Statistics are older than 24 hours. Refresh before using them in a decision.', tone: 'outline', canRefresh: true, needsReconnect: false }
  }
  return {
    badge: connection.verified ? 'OAuth verified' : 'OAuth connected',
    detail: connection.lastSyncAt ? `Last synced ${formatTrustDate(connection.lastSyncAt)}` : 'Waiting for the first provider sync.',
    tone: connection.verified ? 'mint' : 'outline',
    canRefresh: true,
    needsReconnect: false,
  }
}

export function formatTrustDate(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Not captured'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function verifiedPayerCopy(verified) {
  return verified
    ? 'Verified Payer · at least one funded collaboration without an active dispute or refund.'
    : 'Payment history has not met the Verified Payer requirements yet.'
}
