import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import FileImporter from '../components/FileImporter'
import type {
  AnalyticsStore,
  ImportMode,
  QuestionBank,
  QuizProgress,
} from '../types'
import { getQuestionCount, getSubmissionCount } from '../utils/storage'

interface AdminDashboardProps {
  isAuth: boolean
  questionBank: QuestionBank
  analytics: AnalyticsStore
  quizProgress: QuizProgress
  importText: string
  importMode: ImportMode
  adminMessage: string
  isDarkMode: boolean
  isImportSubmitting: boolean
  hasQuestionBankHydrated: boolean
  onToggleDark: () => void
  onChangeImportText: (text: string) => void
  onChangeImportMode: (mode: ImportMode) => void
  onImport: () => Promise<void>
  onClearQuestions: () => void
  onClearAnalytics: () => void
  onLogout: () => void
}

function buildDistribution(items: string[]) {
  const counts = new Map<string, number>()
  items.forEach((item) => {
    const label = item || 'Unknown'
    counts.set(label, (counts.get(label) ?? 0) + 1)
  })

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function AdminDashboard({
  isAuth,
  questionBank,
  analytics,
  quizProgress,
  importText,
  importMode,
  adminMessage,
  isDarkMode,
  isImportSubmitting,
  hasQuestionBankHydrated,
  onToggleDark,
  onChangeImportText,
  onChangeImportMode,
  onImport,
  onClearQuestions,
  onClearAnalytics,
  onLogout,
}: AdminDashboardProps) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuth) {
      navigate('/admin', { replace: true })
    }
  }, [isAuth, navigate])

  if (!isAuth) return null

  const totalVisits = analytics.visits.length
  const totalSubmissions = analytics.submissions.length
  const averageScore = totalSubmissions
    ? (
        analytics.submissions.reduce(
          (sum, submission) => sum + submission.scorePercent,
          0,
        ) / totalSubmissions
      ).toFixed(1)
    : '0.0'
  const averageDuration = totalSubmissions
    ? Math.round(
        analytics.submissions.reduce(
          (sum, submission) => sum + submission.durationSeconds,
          0,
        ) / totalSubmissions,
      )
    : 0
  const totalImportedQuestions = analytics.imports.reduce(
    (sum, record) => sum + record.questionCount,
    0,
  )

  const subjectPerformance = questionBank.subjects.map((subject) => {
    const subjectSubmissions = analytics.submissions.filter(
      (submission) => submission.subjectId === subject.id,
    )
    const attempts = subjectSubmissions.length
    const average =
      attempts === 0
        ? 0
        : Math.round(
            subjectSubmissions.reduce(
              (sum, submission) => sum + submission.scorePercent,
              0,
            ) / attempts,
          )

    return {
      id: subject.id,
      title: subject.title,
      attempts,
      average,
      questions: subject.questions.length,
    }
  })

  const topDevices = buildDistribution(
    analytics.visits.map((visit) => visit.context.deviceType),
  )
  const topBrowsers = buildDistribution(
    analytics.visits.map((visit) => visit.context.browser),
  )
  const topLocations = buildDistribution(
    analytics.visits.map((visit) => visit.context.location),
  )
  const recentAttempts = [...analytics.submissions]
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, 6)

  return (
    <div className="shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      {/* ── Admin Header ── */}
      <header className="topbar panel admin-topbar">
        <div className="admin-topbar-left">
          <div className="admin-logo-mark">
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="url(#adminGrad)" />
              <path d="M15 20L24 14L33 20V28L24 34L15 28V20Z" stroke="white" strokeWidth="2" fill="none" />
              <defs>
                <linearGradient id="adminGrad" x1="0" y1="0" x2="48" y2="48">
                  <stop stopColor="#6c5ce7" />
                  <stop offset="1" stopColor="#a29bfe" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <p className="eyebrow">ExamHelp</p>
            <h1 className="admin-title">Admin Dashboard</h1>
          </div>
        </div>

        <div className="admin-topbar-right">
          <div className="admin-quick-stats">
            <div className="quick-stat">
              <span>{getQuestionCount(questionBank)}</span>
              <small>Questions</small>
            </div>
            <div className="quick-stat">
              <span>{questionBank.subjects.length}</span>
              <small>Subjects</small>
            </div>
            <div className="quick-stat">
              <span>{getSubmissionCount(quizProgress)}</span>
              <small>Done</small>
            </div>
          </div>
          <button
            type="button"
            className={`theme-toggle ${isDarkMode ? 'dark' : ''}`}
            onClick={onToggleDark}
            aria-label="Toggle dark mode"
          >
            <span className="theme-toggle-knob">
              {isDarkMode ? '🌙' : '☀️'}
            </span>
          </button>
          <button
            type="button"
            className="secondary-button admin-nav-btn"
            onClick={() => navigate('/')}
          >
            Quiz View
          </button>
          <button
            type="button"
            className="ghost-button admin-logout-btn"
            onClick={onLogout}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* ── Dashboard Grid ── */}
      <main className="admin-grid">
        {/* Import Section - Full Width */}
        <section className="panel import-panel admin-import-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">Content Management</p>
              <h2>Import Questions</h2>
              <p style={{ color: 'var(--muted)', marginTop: '4px', fontSize: '0.9rem' }}>
                Upload files, paste content, then submit directly to Firebase
              </p>
            </div>
            <span className="pill">
              {hasQuestionBankHydrated ? 'Firebase synced' : 'Syncing Firebase'}
            </span>
          </div>

          <FileImporter
            importText={importText}
            importMode={importMode}
            onChangeText={onChangeImportText}
            onChangeMode={onChangeImportMode}
            onImport={onImport}
            submitLabel={isImportSubmitting ? 'Submitting...' : 'Submit'}
            isSubmitting={isImportSubmitting}
            message={adminMessage}
          />

          <div className="admin-danger-zone">
            <button className="ghost-button" type="button" onClick={onClearQuestions}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                <line x1="18" y1="9" x2="12" y2="15" />
                <line x1="12" y1="9" x2="18" y2="15" />
              </svg>
              Clear Questions
            </button>
            <button className="ghost-button" type="button" onClick={onClearAnalytics}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Clear Analytics
            </button>
          </div>
        </section>

        {/* Metrics */}
        <section className="panel metrics-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Overview</p>
              <h2>Admin Pulse</h2>
            </div>
            <span className="pill">{totalVisits} visits</span>
          </div>

          <div className="metric-grid">
            <article className="metric-card">
              <span>Total Visits</span>
              <strong>{totalVisits}</strong>
            </article>
            <article className="metric-card">
              <span>Submissions</span>
              <strong>{totalSubmissions}</strong>
            </article>
            <article className="metric-card">
              <span>Avg Score</span>
              <strong>{averageScore}%</strong>
            </article>
            <article className="metric-card">
              <span>Avg Duration</span>
              <strong>{averageDuration}s</strong>
            </article>
            <article className="metric-card">
              <span>Imported Q's</span>
              <strong>{totalImportedQuestions}</strong>
            </article>
            <article className="metric-card">
              <span>Locations</span>
              <strong>{topLocations.length}</strong>
            </article>
          </div>
        </section>

        {/* Subject Performance */}
        <section className="panel performance-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Subject Performance</p>
              <h2>Attempts & Score Health</h2>
            </div>
          </div>

          <div className="bar-list">
            {subjectPerformance.map((subject) => (
              <article className="bar-card" key={subject.id}>
                <div>
                  <strong>{subject.title}</strong>
                  <span>
                    {subject.attempts} attempts • {subject.questions} questions
                  </span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.max(subject.average, 8)}%` }}
                  />
                </div>
                <strong>{subject.average}%</strong>
              </article>
            ))}
          </div>
        </section>

        {/* Traffic Insights */}
        <section className="panel insights-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Traffic Insights</p>
              <h2>Device, Browser & Location</h2>
            </div>
          </div>

          <div className="insight-columns">
            <div>
              <h3>Devices</h3>
              <ul className="stat-list">
                {topDevices.map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3>Browsers</h3>
              <ul className="stat-list">
                {topBrowsers.map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3>Locations</h3>
              <ul className="stat-list">
                {topLocations.slice(0, 6).map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Recent Attempts */}
        <section className="panel attempts-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Recent Activity</p>
              <h2>Latest Quiz Attempts</h2>
            </div>
          </div>

          <div className="attempt-list">
            {recentAttempts.length === 0 ? (
              <div className="empty-state">
                <h3>No submissions yet</h3>
                <p>Complete a subject from the learner view to start filling this board.</p>
              </div>
            ) : (
              recentAttempts.map((attempt) => (
                <article className="attempt-card" key={attempt.id}>
                  <div>
                    <strong>{attempt.subjectTitle}</strong>
                    <span>{formatTimestamp(attempt.timestamp)}</span>
                  </div>
                  <div>
                    <span>{attempt.context.location}</span>
                    <span>
                      {attempt.context.deviceType} • {attempt.context.browser}
                    </span>
                  </div>
                  <strong>
                    {attempt.correctCount}/{attempt.totalQuestions} ({attempt.scorePercent}%)
                  </strong>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
