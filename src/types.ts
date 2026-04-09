export type QuizOption = {
  id: string
  text: string
}

export type QuizQuestion = {
  id: string
  prompt: string
  options: QuizOption[]
  correctOptionId: string
  explanation: string
}

export type QuizSubject = {
  id: string
  title: string
  description: string
  accent: string
  questions: QuizQuestion[]
}

export type QuestionBank = {
  title: string
  tagline: string
  subjects: QuizSubject[]
  updatedAt: string
}

export type SubjectResult = {
  totalQuestions: number
  correctCount: number
  scorePercent: number
}

export type SubjectProgress = {
  answers: Record<string, string>
  submittedQuestions?: Record<string, boolean>
  startedAt: string | null
  submittedAt: string | null
  submitted: boolean
  reviewed: boolean
  result?: SubjectResult
}

export type QuizProgress = Record<string, SubjectProgress>

export type VisitorContext = {
  id: string
  deviceType: string
  browser: string
  platform: string
  language: string
  timezone: string
  location: string
  source: string
}

export type VisitRecord = {
  id: string
  timestamp: string
  context: VisitorContext
}

export type QuizSubmission = {
  id: string
  timestamp: string
  subjectId: string
  subjectTitle: string
  correctCount: number
  totalQuestions: number
  scorePercent: number
  durationSeconds: number
  context: VisitorContext
}

export type ImportRecord = {
  id: string
  timestamp: string
  source: 'merge' | 'replace'
  subjectCount: number
  questionCount: number
}

export type AnalyticsStore = {
  visits: VisitRecord[]
  submissions: QuizSubmission[]
  imports: ImportRecord[]
}

export type ImportMode = 'merge' | 'replace'
