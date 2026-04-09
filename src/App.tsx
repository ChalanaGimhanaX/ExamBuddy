import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import './App.css'
import {
  getQuestionCount,
  getUnlockedSubjectIds,
  mergeQuestionBanks,
  resetQuizProgress,
  scoreSubject,
} from './utils/storage'
import {
  listenToQuestionBank, listenToAnalytics, listenToQuizProgress,
  saveQuestionBankToDB, saveAnalyticsToDB, saveQuizProgressToDB
} from './lib/firebase'
import {
  collectVisitorContext,
  createId,
} from './utils/visitor'
import { parseImportedQuestionBank } from './utils/importParser'
import { sampleImportTemplate, seedQuestionBank } from './data/seedData'
import type {
  AnalyticsStore,
  ImportMode,
  QuestionBank,
  QuizProgress,
  QuizSubject,
  VisitorContext,
} from './types'
import QuizPage from './pages/QuizPage'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'

function App() {
  const [questionBank, setQuestionBank] = useState<QuestionBank | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsStore | null>(null)
  const [quizProgress, setQuizProgress] = useState<QuizProgress | null>(null)
  const [activeSubjectId, setActiveSubjectId] = useState<string>('')
  const [visitorContext, setVisitorContext] = useState<VisitorContext | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  // Auth State
  const [isAdminAuth, setIsAdminAuth] = useState(false)

  // UI State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('examBuddy:darkMode')
    return saved === 'true'
  })

  // Data & Messaging State
  const [importText, setImportText] = useState(sampleImportTemplate)
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [quizMessage, setQuizMessage] = useState(
    'Pick a subject, answer every question, and submit to unlock the next round.',
  )
  const [adminMessage, setAdminMessage] = useState(
    'Upload a file or paste questions to import them into the quiz bank.',
  )

  useEffect(() => {
    let unsubBank = () => {}
    let unsubAnalytics = () => {}
    let unsubProgress = () => {}

    const setupFirebase = async () => {
      const context = await collectVisitorContext()
      setVisitorContext(context)

      unsubBank = listenToQuestionBank((bank) => {
        if (bank) {
          setQuestionBank(bank)
          setActiveSubjectId((current) => current || bank.subjects[0]?.id || '')
        } else {
          saveQuestionBankToDB(seedQuestionBank)
        }
      })

      unsubAnalytics = listenToAnalytics((stats) => {
        if (stats) setAnalytics(stats)
        else saveAnalyticsToDB({ visits: [], submissions: [], imports: [] })
      })

      unsubProgress = listenToQuizProgress(context.id, (prog) => {
        if (prog) setQuizProgress(prog)
        else setQuizProgress({})
      })
    }
    
    setupFirebase()

    return () => {
      unsubBank()
      unsubAnalytics()
      unsubProgress()
    }
  }, [])

  useEffect(() => {
    if (analytics && visitorContext) {
      const visitFlag = 'examBuddy:visitLogged'
      if (!sessionStorage.getItem(visitFlag) && analytics.visits) {
        sessionStorage.setItem(visitFlag, '1')
        saveAnalyticsToDB({
          ...analytics,
          visits: [
            ...analytics.visits,
            { id: visitorContext.id, timestamp: new Date().toISOString(), context: visitorContext }
          ]
        })
      }
    }
  }, [analytics, visitorContext])

  const updateQuizProgress = (updater: (current: QuizProgress) => QuizProgress) => {
    if (!quizProgress || !visitorContext) return
    const next = updater(quizProgress)
    setQuizProgress(next) // Optimistic update
    saveQuizProgressToDB(visitorContext.id, next)
  }

  const updateAnalytics = (updater: (current: AnalyticsStore) => AnalyticsStore) => {
    if (!analytics) return
    const next = updater(analytics)
    setAnalytics(next)
    saveAnalyticsToDB(next)
  }

  const updateQuestionBank = (next: QuestionBank) => {
    setQuestionBank(next)
    saveQuestionBankToDB(next)
  }

  const handleLogin = (user: string, pass: string) => {
    if (user === 'chalana' && pass === 'demo-only') {
      setIsAdminAuth(true)
      return true
    }
    return false
  }

  const handleLogout = () => {
    setIsAdminAuth(false)
  }

  const handleToggleDark = () => setIsDarkMode((prev) => !prev)

  // ── Learners Methods ──
  if (!questionBank || !analytics || !quizProgress || !visitorContext) {
    return (
      <div className="shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'white' }}>
        <h2>Loading ExamBuddy Quiz...</h2>
      </div>
    )
  }

  const unlockedSubjectIds = getUnlockedSubjectIds(questionBank, quizProgress)
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
    setQuizMessage('Question checked! Explore the explanation below.')
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
          id: visitorContext.id + '-' + createId(), // simple unique id fallback since createId might reuse session id
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
      `${subject.title} submitted! You scored ${result.correctCount}/${result.totalQuestions}. Review answers or continue to the next subject.`,
    )
  }

  const handleGoToNextSubject = (subjectId: string) => {
    const currentIndex = questionBank.subjects.findIndex(
      (subject) => subject.id === subjectId,
    )
    const nextSubject = questionBank.subjects[currentIndex + 1]
    if (!nextSubject) {
      setQuizMessage(
        'You have completed all available subjects! 🎉 Head to the admin panel to import more.',
      )
      return
    }

    setActiveSubjectId(nextSubject.id)
    setCurrentQuestionIndex(0)
    setQuizMessage(
      `${nextSubject.title} is now open. Keep going!`,
    )
  }

  // ── Admin Methods ──
  const handleImportQuestions = () => {
    try {
      const importedBank = parseImportedQuestionBank(importText)
      const nextBank =
        importMode === 'replace'
          ? importedBank
          : mergeQuestionBanks(questionBank, importedBank)

      updateQuestionBank(nextBank)
      updateQuizProgress(() => resetQuizProgress(nextBank))
      setActiveSubjectId(nextBank.subjects[0]?.id ?? '')
      setCurrentQuestionIndex(0)
      updateAnalytics((current) => ({
        ...current,
        imports: [
          ...current.imports,
          {
            id: createId(),
            timestamp: new Date().toISOString(),
            source: importMode,
            questionCount: getQuestionCount(importedBank),
            subjectCount: importedBank.subjects.length,
          },
        ],
      }))
      setAdminMessage(
        `✅ Imported ${importedBank.subjects.length} subjects and ${getQuestionCount(importedBank)} questions using ${importMode} mode.`,
      )
      setQuizMessage(
        'The quiz bank has been refreshed. Current learner progress was reset so the new content starts cleanly.',
      )
    } catch (error) {
      setAdminMessage(
        error instanceof Error
          ? error.message
          : 'The import could not be processed. Check the format and try again.',
      )
    }
  }

  const handleClearQuestions = () => {
    const emptyBank: QuestionBank = {
      title: 'Empty Question Bank',
      tagline: 'No questions currently available.',
      updatedAt: new Date().toISOString(),
      subjects: [],
    }
    updateQuestionBank(emptyBank)
    updateQuizProgress(() => ({}))
    setActiveSubjectId('')
    setCurrentQuestionIndex(0)
    setAdminMessage('All questions have been removed. The question bank is now empty.')
  }

  const handleResetQuestionBank = () => {
    updateQuestionBank(seedQuestionBank)
    updateQuizProgress(() => resetQuizProgress(seedQuestionBank))
    setActiveSubjectId(seedQuestionBank.subjects[0]?.id ?? '')
    setCurrentQuestionIndex(0)
    setImportText(sampleImportTemplate)
    setAdminMessage('The demo question bank is back in place.')
  }

  const handleClearAnalytics = () => {
    updateAnalytics(() => ({
      visits: [],
      submissions: [],
      imports: [],
    }))
    sessionStorage.removeItem('examBuddy:visitLogged')
    setAdminMessage('Analytics were cleared. Refresh once to start a fresh visit trail.')
  }

  // Sync methods (since we are fully live-remote, we can remove the Push/Pull internals or leave them as no-op info messages)
  const handlePushToCloud = async () => {
    setAdminMessage('Everything happens in real-time now! Your data is already safely stored in Firebase.')
  }

  const handlePullFromCloud = async () => {
    setAdminMessage('You are looking at live Firebase data. No need to pull.')
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
            quizMessage={quizMessage}
            isDarkMode={isDarkMode}
            onToggleDark={handleToggleDark}
            unlockedSubjectIds={unlockedSubjectIds}
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
          <AdminLogin
            isAuth={isAdminAuth}
            onLogin={handleLogin}
            isDarkMode={isDarkMode}
            onToggleDark={handleToggleDark}
          />
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <AdminDashboard
            isAuth={isAdminAuth}
            questionBank={questionBank}
            analytics={analytics}
            quizProgress={quizProgress}
            importText={importText}
            importMode={importMode}
            adminMessage={adminMessage}
            isDarkMode={isDarkMode}
            onToggleDark={handleToggleDark}
            onChangeImportText={setImportText}
            onChangeImportMode={setImportMode}
            onImport={handleImportQuestions}
            onClearQuestions={handleClearQuestions}
            onReset={handleResetQuestionBank}
            onClearAnalytics={handleClearAnalytics}
            onLogout={handleLogout}
            onPushToCloud={handlePushToCloud}
            onPullFromCloud={handlePullFromCloud}
          />
        }
      />
    </Routes>
  )
}

export default App
