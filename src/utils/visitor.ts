import type { VisitorContext } from '../types'

export function createId() {
  if (typeof window !== 'undefined') {
    const saved = window.sessionStorage.getItem('examBuddy:sessionId')
    if (saved) return saved
  }

  let newId = ''
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    newId = crypto.randomUUID()
  } else {
    newId = `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }

  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('examBuddy:sessionId', newId)
  }
  return newId
}

export function getBaseVisitorContext(): VisitorContext {
  const userAgent =
    typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown agent'
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown timezone'
  const language =
    typeof navigator !== 'undefined' ? navigator.language : 'Unknown language'

  return {
    id: createId(),
    deviceType: getDeviceType(userAgent),
    browser: getBrowser(userAgent),
    platform: getPlatform(),
    language,
    timezone,
    location: `${timezone} • ${language}`,
    source: 'browser signals',
  }
}

export async function collectVisitorContext() {
  const base = getBaseVisitorContext()

  try {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 2500)
    const response = await fetch('https://ipwho.is/', {
      signal: controller.signal,
    })
    window.clearTimeout(timeout)

    if (!response.ok) {
      return base
    }

    const data = (await response.json()) as {
      success?: boolean
      city?: string
      region?: string
      country?: string
    }

    if (data.success === false) {
      return base
    }

    const location = [data.city, data.region, data.country]
      .filter(Boolean)
      .join(', ')

    return {
      ...base,
      location: location || base.location,
      source: location ? 'ipwho.is' : base.source,
    }
  } catch {
    return base
  }
}

function getDeviceType(userAgent: string) {
  if (/tablet|ipad/i.test(userAgent)) {
    return 'Tablet'
  }

  if (/mobi|android|iphone/i.test(userAgent)) {
    return 'Mobile'
  }

  return 'Desktop'
}

function getBrowser(userAgent: string) {
  if (/edg/i.test(userAgent)) {
    return 'Edge'
  }

  if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) {
    return 'Chrome'
  }

  if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    return 'Safari'
  }

  if (/firefox/i.test(userAgent)) {
    return 'Firefox'
  }

  return 'Other'
}

function getPlatform() {
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string }
  }

  return nav.userAgentData?.platform || navigator.platform || 'Unknown platform'
}
