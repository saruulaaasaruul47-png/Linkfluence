const CURRENCY_PATTERN = /\b(?:MNT|USD|EUR)\b|[₮$€]/gi
const RANGE_PATTERN = /\s*(?:[-–—]|\bto\b)\s*/i
const SCALE = { K: 1_000, M: 1_000_000, B: 1_000_000_000 }

function numericToken(value) {
  const normalized = String(value ?? '')
    .toUpperCase()
    .replace(CURRENCY_PATTERN, ' ')
    .trim()
  return normalized.match(/\d[\d\s\u00a0'’.,]*(?:\s*[KMB])?/i)?.[0]?.trim() || ''
}

function normalizedDecimal(token, compact) {
  let value = token.replace(/[\s\u00a0'’]/g, '')
  const commaCount = (value.match(/,/g) || []).length
  const dotCount = (value.match(/\./g) || []).length

  if (commaCount && dotCount) {
    if (value.lastIndexOf('.') > value.lastIndexOf(',')) {
      return value.replaceAll(',', '')
    }
    return value.replaceAll('.', '').replace(',', '.')
  }

  if (commaCount) {
    const groups = value.split(',')
    if (commaCount > 1 || (!compact && groups.at(-1).length === 3)) return groups.join('')
    return value.replace(',', '.')
  }

  if (dotCount) {
    const groups = value.split('.')
    if (dotCount > 1 && groups.slice(1).every((group) => group.length === 3)) return groups.join('')
    if (!compact && dotCount === 1 && groups[1].length === 3) return groups.join('')
  }

  return value
}

export function parseMoneyAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  const token = numericToken(value)
  if (!token) return undefined
  const suffix = token.match(/([KMB])$/i)?.[1]?.toUpperCase()
  const raw = suffix ? token.slice(0, -1) : token
  const parsed = Number(normalizedDecimal(raw, Boolean(suffix)))
  if (!Number.isFinite(parsed)) return undefined
  return parsed * (SCALE[suffix] || 1)
}

export function parseMoneyRange(value) {
  if (typeof value === 'number') {
    const amount = parseMoneyAmount(value)
    return { budgetMin: amount, budgetMax: amount }
  }

  const parts = String(value ?? '')
    .split(RANGE_PATTERN)
    .map(parseMoneyAmount)
    .filter((amount) => amount !== undefined)

  return {
    budgetMin: parts[0],
    budgetMax: parts[1] ?? parts[0],
  }
}
