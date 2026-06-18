import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import './App.css'
import {
  getQuestionCount,
  mergeQuestionBanks,
  resetQuizProgress,
  scoreSubject,
} from './utils/storage'
import {
  listenToAnalytics,
  listenToQuestionBank,
  listenToQuizProgress,
  saveAnalyticsToDB,
  saveQuestionBankToDB,
  saveQuizProgressToDB,
} from './lib/firebase'
import {
  collectVisitorContext,
  createId,
  getBaseVisitorContext,
} from './utils/visitor'
import { parseImportedQuestionBank } from './utils/importParser'
import { sampleImportTemplate } from './data/seedData'
import type {
  AnalyticsStore,
  ImportMode,
  QuestionBank,
  QuizProgress,
  QuizSubject,
  VisitorContext,
} from './types'
import QuizPage from './pages/QuizPage'

const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))

const EMPTY_ANALYTICS: AnalyticsStore = {
  visits: [],
  submissions: [],
  imports: [],
}

const EMPTY_QUESTION_BANK: QuestionBank = {
  title: 'ExamHelp',
  tagline: 'Questions load from the database.',
  subjects: [],
  updatedAt: '',
}

const ADMIN_SESSION_KEY = 'examBuddy:adminSession'
const ADMIN_SESSION_DURATION_MS = 12 * 60 * 60 * 1000

function createDefaultQuizProgress(questionBank: QuestionBank) {
  return questionBank.subjects.length > 0 ? resetQuizProgress(questionBank) : {}
}

function hasActiveAdminSession() {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_SESSION_KEY)
    if (!raw) {
      return false
    }

    const session = JSON.parse(raw) as { expiresAt?: number }
    if (!session.expiresAt || session.expiresAt < Date.now()) {
      window.localStorage.removeItem(ADMIN_SESSION_KEY)
      return false
    }

    return true
  } catch {
    window.localStorage.removeItem(ADMIN_SESSION_KEY)
    return false
  }
}

function persistAdminSession() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify({
      expiresAt: Date.now() + ADMIN_SESSION_DURATION_MS,
    }),
  )
}

function clearAdminSession() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(ADMIN_SESSION_KEY)
}

function RouteLoadingFallback() {
  return (
    <div
      className="shell"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'white',
      }}
    >
      <h2>Loading ExamHelp...</h2>
    </div>
  )
}

function App() {
  const [questionBank, setQuestionBank] = useState<QuestionBank>(EMPTY_QUESTION_BANK)
  const [analytics, setAnalytics] = useState<AnalyticsStore>(EMPTY_ANALYTICS)
  const [quizProgress, setQuizProgress] = useState<QuizProgress>({})
  const [activeSubjectId, setActiveSubjectId] = useState('')
  const [visitorContext, setVisitorContext] = useState<VisitorContext>(() =>
    getBaseVisitorContext(),
  )
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [hasQuestionBankHydrated, setHasQuestionBankHydrated] = useState(false)
  const [hasAnalyticsHydrated, setHasAnalyticsHydrated] = useState(false)
  const [isImportSubmitting, setIsImportSubmitting] = useState(false)
  const questionBankRef = useRef(questionBank)
  const pendingAnalyticsUpdatersRef = useRef<
    Array<(current: AnalyticsStore) => AnalyticsStore>
  >([])

  const [isAdminAuth, setIsAdminAuth] = useState(() => hasActiveAdminSession())
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('examBuddy:darkMode')
    return saved === 'true'
  })

  const [importText, setImportText] = useState(sampleImportTemplate)
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [quizMessage, setQuizMessage] = useState(
    'Pick any subject, answer the questions, and submit when you are ready.',
  )
  const [adminMessage, setAdminMessage] = useState(
    'Upload a file or paste questions to save them to the database.',
  )

  useEffect(() => {
    questionBankRef.current = questionBank
  }, [questionBank])

  useEffect(() => {
    if (questionBank.subjects.length === 0) {
      return
    }

    setQuizProgress((current) => {
      if (Object.keys(current).length > 0) {
        return current
      }

      return createDefaultQuizProgress(questionBank)
    })
  }, [questionBank])

  useEffect(() => {
    localStorage.setItem('examBuddy:darkMode', String(isDarkMode))
    document.body.classList.toggle('theme-dark', isDarkMode)
  }, [isDarkMode])

  useEffect(() => {
    const syncAdminSession = () => {
      setIsAdminAuth(hasActiveAdminSession())
    }

    window.addEventListener('storage', syncAdminSession)
    return () => window.removeEventListener('storage', syncAdminSession)
  }, [])

  useEffect(() => {
    let unsubBank = () => {}
    let unsubAnalytics = () => {}
    let unsubProgress = () => {}

    unsubBank = listenToQuestionBank((bank) => {
      if (!bank) {
        setQuestionBank(EMPTY_QUESTION_BANK)
        setActiveSubjectId('')
        setHasQuestionBankHydrated(true)
        return
      }

      setQuestionBank(bank)
      setHasQuestionBankHydrated(true)
      setActiveSubjectId((current) => {
        if (!current) {
          return bank.subjects[0]?.id || ''
        }

        const stillExists = bank.subjects.some((subject) => subject.id === current)
        return stillExists ? current : bank.subjects[0]?.id || ''
      })
    })

    unsubAnalytics = listenToAnalytics((stats) => {
      const baseAnalytics = stats ?? EMPTY_ANALYTICS
      const queuedUpdaters = pendingAnalyticsUpdatersRef.current
      const nextAnalytics = queuedUpdaters.reduce(
        (current, updater) => updater(current),
        baseAnalytics,
      )

      pendingAnalyticsUpdatersRef.current = []
      setAnalytics(nextAnalytics)
      setHasAnalyticsHydrated(true)

      if (!stats || queuedUpdaters.length > 0) {
        saveAnalyticsToDB(nextAnalytics)
      }
    })

    unsubProgress = listenToQuizProgress(visitorContext.id, (progress) => {
      if (progress) {
        setQuizProgress(progress)
        return
      }

      setQuizProgress(createDefaultQuizProgress(questionBankRef.current))
    })

    void collectVisitorContext().then((context) => {
      setVisitorContext((current) =>
        current.id === context.id ? context : current,
      )
    })

    return () => {
      unsubBank()
      unsubAnalytics()
      unsubProgress()
    }
  }, [visitorContext.id])

  function updateQuizProgress(updater: (current: QuizProgress) => QuizProgress) {
    const next = updater(quizProgress)
    setQuizProgress(next)
    saveQuizProgressToDB(visitorContext.id, next)
  }

  function updateAnalytics(updater: (current: AnalyticsStore) => AnalyticsStore) {
    const next = updater(analytics)
    setAnalytics(next)

    if (!hasAnalyticsHydrated) {
      pendingAnalyticsUpdatersRef.current.push(updater)
      return
    }

    saveAnalyticsToDB(next)
  }

  function updateQuestionBank(next: QuestionBank) {
    setQuestionBank(next)
    saveQuestionBankToDB(next)
  }

  useEffect(() => {
    if (!hasAnalyticsHydrated) {
      return
    }

    const visitFlag = 'examBuddy:visitLogged'
    if (sessionStorage.getItem(visitFlag)) {
      return
    }

    sessionStorage.setItem(visitFlag, '1')

    const timeout = window.setTimeout(() => {
      const next = {
        ...analytics,
        visits: [
          ...analytics.visits,
          {
            id: visitorContext.id,
            timestamp: new Date().toISOString(),
            context: visitorContext,
          },
        ],
      }

      setAnalytics(next)
      saveAnalyticsToDB(next)
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [analytics, hasAnalyticsHydrated, visitorContext])

  const handleLogin = (user: string, pass: string) => {
    if (user === 'chalana' && pass === 'demo-only') {
      persistAdminSession()
      setIsAdminAuth(true)
      return true
    }

    return false
  }

  const handleLogout = () => {
    clearAdminSession()
    setIsAdminAuth(false)
  }

  const handleToggleDark = () => setIsDarkMode((prev) => !prev)

  const activeSubject =
    questionBank.subjects.find((subject) => subject.id === activeSubjectId) ??
    questionBank.subjects[0]

  const handleSelectAnswer = (
    subjectId: string,
    questionId: string,
    optionId: string,
  ) => {
    setQuizMessage('Answer saved. Submit when every question in this subject is done.')
    updateQuizProgress((current) => {
      const subjectState = current[subjectId]
      if (!subjectState || subjectState.submitted) {
        return current
      }

      return {
        ...current,
        [subjectId]: {
          ...subjectState,
          startedAt: subjectState.startedAt ?? new Date().toISOString(),
          answers: {
            ...subjectState.answers,
            [questionId]: optionId,
          },
        },
      }
    })
  }

  const handleSubmitQuestion = (subjectId: string, questionId: string) => {
    updateQuizProgress((current) => {
      const subjectState = current[subjectId]
      if (!subjectState || !subjectState.answers[questionId]) {
        return current
      }

      return {
        ...current,
        [subjectId]: {
          ...subjectState,
          submittedQuestions: {
            ...(subjectState.submittedQuestions || {}),
            [questionId]: true,
          },
        },
      }
    })

    setQuizMessage('Question checked. Review the explanation below.')
  }

  const handleSubmitSubject = (subject: QuizSubject) => {
    const subjectState = quizProgress[subject.id]
    if (!subjectState) {
      return
    }

    const answeredCount = Object.keys(subjectState.answers).length
    if (answeredCount !== subject.questions.length) {
      setQuizMessage(
        `Answer all ${subject.questions.length} questions in ${subject.title} before submitting.`,
      )
      return
    }

    if (subjectState.submitted) {
      setQuizMessage(
        `${subject.title} is already submitted. Review the answers below or move to the next subject.`,
      )
      return
    }

    const result = scoreSubject(subject, subjectState.answers)
    const startedAt = subjectState.startedAt ?? new Date().toISOString()
    const submittedAt = new Date().toISOString()
    const durationSeconds = Math.max(
      1,
      Math.round(
        (new Date(submittedAt).getTime() - new Date(startedAt).getTime()) / 1000,
      ),
    )

    updateQuizProgress((current) => ({
      ...current,
      [subject.id]: {
        ...current[subject.id],
        submitted: true,
        reviewed: true,
        submittedAt,
        result,
      },
    }))

    updateAnalytics((current) => ({
      ...current,
      submissions: [
        ...current.submissions,
        {
          id: `${visitorContext.id}-${createId()}`,
          timestamp: submittedAt,
          subjectId: subject.id,
          subjectTitle: subject.title,
          totalQuestions: result.totalQuestions,
          correctCount: result.correctCount,
          scorePercent: result.scorePercent,
          durationSeconds,
          context: visitorContext,
        },
      ],
    }))

    setQuizMessage(
      `${subject.title} submitted. You scored ${result.correctCount}/${result.totalQuestions}.`,
    )
  }

  const handleGoToNextSubject = (subjectId: string) => {
    const currentIndex = questionBank.subjects.findIndex(
      (subject) => subject.id === subjectId,
    )
    const nextSubject = questionBank.subjects[currentIndex + 1]
    if (!nextSubject) {
      setQuizMessage(
        'You have completed all available subjects. Head to the admin panel to import more.',
      )
      return
    }

    setActiveSubjectId(nextSubject.id)
    setCurrentQuestionIndex(0)
    setQuizMessage(`${nextSubject.title} is now open. Keep going.`)
  }

  const handleImportQuestions = async () => {
    try {
      setIsImportSubmitting(true)
      const importedBank = parseImportedQuestionBank(importText)
      const nextBank =
        importMode === 'replace'
          ? importedBank
          : mergeQuestionBanks(questionBank, importedBank)
      const nextProgress = createDefaultQuizProgress(nextBank)
      const nextAnalytics = {
        ...analytics,
        imports: [
          ...analytics.imports,
          {
            id: createId(),
            timestamp: new Date().toISOString(),
            source: importMode,
            questionCount: getQuestionCount(importedBank),
            subjectCount: importedBank.subjects.length,
          },
        ],
      }

      await Promise.all([
        saveQuestionBankToDB(nextBank),
        saveQuizProgressToDB(visitorContext.id, nextProgress),
        saveAnalyticsToDB(nextAnalytics),
      ])

      setQuestionBank(nextBank)
      setQuizProgress(nextProgress)
      setAnalytics(nextAnalytics)
      setHasQuestionBankHydrated(true)
      setActiveSubjectId(nextBank.subjects[0]?.id ?? '')
      setCurrentQuestionIndex(0)
      setAdminMessage(
        `Submitted ${importedBank.subjects.length} subjects and ${getQuestionCount(importedBank)} questions to the database.`,
      )
      setQuizMessage('Questions were saved and the quiz bank was refreshed.')
    } catch (error) {
      setAdminMessage(
        error instanceof Error
          ? error.message
          : 'The import could not be processed. Check the format and try again.',
      )
    } finally {
      setIsImportSubmitting(false)
    }
  }

  const handleClearQuestions = () => {
    const emptyBank: QuestionBank = {
      title: 'ExamHelp',
      tagline: 'No questions currently available.',
      updatedAt: new Date().toISOString(),
      subjects: [],
    }

    updateQuestionBank(emptyBank)
    updateQuizProgress(() => ({}))
    setActiveSubjectId('')
    setCurrentQuestionIndex(0)
    setAdminMessage('All questions were cleared from the database.')
    setQuizMessage('No questions are currently available.')
  }

  const handleClearAnalytics = () => {
    updateAnalytics(() => ({
      visits: [],
      submissions: [],
      imports: [],
    }))
    sessionStorage.removeItem('examBuddy:visitLogged')
    setAdminMessage('Analytics were cleared.')
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <QuizPage
            questionBank={questionBank}
            quizProgress={quizProgress}
            activeSubjectId={activeSubjectId}
            setActiveSubjectId={setActiveSubjectId}
            currentQuestionIndex={currentQuestionIndex}
            setCurrentQuestionIndex={setCurrentQuestionIndex}
            quizMessage={
              !hasQuestionBankHydrated && questionBank.subjects.length === 0
                ? 'Syncing questions from the database...'
                : quizMessage
            }
            isDarkMode={isDarkMode}
            onToggleDark={handleToggleDark}
            activeSubject={activeSubject}
            handleSelectAnswer={handleSelectAnswer}
            handleSubmitQuestion={handleSubmitQuestion}
            handleSubmitSubject={handleSubmitSubject}
            handleGoToNextSubject={handleGoToNextSubject}
          />
        }
      />
      <Route
        path="/admin"
        element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <AdminLogin
              isAuth={isAdminAuth}
              onLogin={handleLogin}
              isDarkMode={isDarkMode}
              onToggleDark={handleToggleDark}
            />
          </Suspense>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <AdminDashboard
              isAuth={isAdminAuth}
              questionBank={questionBank}
              analytics={analytics}
              quizProgress={quizProgress}
              importText={importText}
              importMode={importMode}
              adminMessage={adminMessage}
              isDarkMode={isDarkMode}
              isImportSubmitting={isImportSubmitting}
              hasQuestionBankHydrated={hasQuestionBankHydrated}
              onToggleDark={handleToggleDark}
              onChangeImportText={setImportText}
              onChangeImportMode={setImportMode}
              onImport={handleImportQuestions}
              onClearQuestions={handleClearQuestions}
              onClearAnalytics={handleClearAnalytics}
              onLogout={handleLogout}
            />
          </Suspense>
        }
      />
    </Routes>
  )
}

export default App
