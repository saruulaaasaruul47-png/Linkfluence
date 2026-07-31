import { useEffect, useState } from 'react'

function readDraft(key, initialValue, lastStep) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(key))
    if (!stored) return { data: initialValue, current: 0, maxStep: 0 }
    return {
      data: { ...initialValue, ...stored.data },
      current: Math.min(Math.max(Number(stored.current) || 0, 0), lastStep),
      maxStep: Math.min(Math.max(Number(stored.maxStep) || 0, 0), lastStep),
    }
  } catch {
    return { data: initialValue, current: 0, maxStep: 0 }
  }
}

export function useOnboardingDraft(type, initialValue, stepCount) {
  const key = `vyra:onboarding-draft:${type}`
  const [draft] = useState(() => readDraft(key, initialValue, stepCount - 1))
  const [data, setData] = useState(draft.data)
  const [current, setCurrent] = useState(draft.current)
  const [maxStep, setMaxStep] = useState(Math.max(draft.maxStep, draft.current))

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify({
        data,
        current,
        maxStep,
        updatedAt: new Date().toISOString(),
      }))
    } catch {
      // Draft persistence is progressive enhancement.
    }
  }, [current, data, key, maxStep])

  const clearDraft = () => {
    try { window.localStorage.removeItem(key) } catch { /* Nothing else to clear. */ }
  }

  return { data, setData, current, setCurrent, maxStep, setMaxStep, clearDraft }
}
