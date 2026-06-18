import type { AnalyticsStore, QuestionBank, QuizProgress } from '../types'

const API_BASE = '/api'
const POLL_INTERVAL_MS = 4000

async function getJson<T>(path: string): Promise<T | null> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

async function putJson(path: string, body: unknown) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
}

function createPollingSubscription<T>(
  path: string,
  callback: (value: T | null) => void,
) {
  let disposed = false
  let lastSnapshot = ''

  const poll = async () => {
    try {
      const value = await getJson<T>(path)
      if (disposed) {
        return
      }

      const serialized = JSON.stringify(value)
      if (serialized !== lastSnapshot) {
        lastSnapshot = serialized
        callback(value)
      }
    } catch (error) {
      if (!disposed) {
        console.error(`Polling failed for ${path}`, error)
      }
    }
  }

  void poll()
  const interval = window.setInterval(() => {
    void poll()
  }, POLL_INTERVAL_MS)

  return () => {
    disposed = true
    window.clearInterval(interval)
  }
}

export function listenToQuestionBank(callback: (bank: QuestionBank | null) => void) {
  return createPollingSubscription<QuestionBank>('/question-bank', callback)
}

export function listenToAnalytics(
  callback: (analytics: AnalyticsStore | null) => void,
) {
  return createPollingSubscription<AnalyticsStore>('/analytics', callback)
}

export function listenToQuizProgress(
  visitorId: string,
  callback: (progress: QuizProgress | null) => void,
) {
  return createPollingSubscription<QuizProgress>(
    `/quiz-progress/${encodeURIComponent(visitorId)}`,
    callback,
  )
}

export async function saveQuestionBankToDB(questionBank: QuestionBank) {
  await putJson('/question-bank', questionBank)
}

export async function saveAnalyticsToDB(analyticsStore: AnalyticsStore) {
  await putJson('/analytics', analyticsStore)
}

export async function saveQuizProgressToDB(visitorId: string, progress: QuizProgress) {
  await putJson(`/quiz-progress/${encodeURIComponent(visitorId)}`, progress)
}
