import type { VisitorContext } from '../types'

const LOCATION_CACHE_KEY = 'examBuddy:visitorLocationCache'
const LOCATION_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000
const SESSION_ID_KEY = 'examBuddy:sessionId'

export function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function getSessionId() {
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem(SESSION_ID_KEY)
    if (saved) {
      return saved
    }
  }

  const newId = createId()

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SESSION_ID_KEY, newId)
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
    id: getSessionId(),
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
  const cached = readCachedLocation()

  if (cached) {
    return {
      ...base,
      location: cached.location,
      source: cached.source,
    }
  }

  try {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 1200)
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

    if (location) {
      writeCachedLocation(location, 'ipwho.is')
    }

    return {
      ...base,
      location: location || base.location,
      source: location ? 'ipwho.is' : base.source,
    }
  } catch {
    return base
  }
}

function readCachedLocation() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(LOCATION_CACHE_KEY)
    if (!raw) {
      return null
    }

    const cached = JSON.parse(raw) as {
      location?: string
      source?: string
      savedAt?: number
    }

    if (
      !cached.location ||
      !cached.savedAt ||
      Date.now() - cached.savedAt > LOCATION_CACHE_MAX_AGE_MS
    ) {
      window.localStorage.removeItem(LOCATION_CACHE_KEY)
      return null
    }

    return {
      location: cached.location,
      source: cached.source || 'ipwho.is (cached)',
    }
  } catch {
    return null
  }
}

function writeCachedLocation(location: string, source: string) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      LOCATION_CACHE_KEY,
      JSON.stringify({
        location,
        source,
        savedAt: Date.now(),
      }),
    )
  } catch {
    // Ignore storage failures; location enrichment is optional.
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
