import type {
  QuestionBank,
  QuizProgress,
  QuizSubject,
  SubjectProgress,
} from '../types'
import { createId } from './visitor'



const accentPalette = ['#ff7749', '#00bdd6', '#7a5cff', '#10b981', '#ff4d8d']

export function resetQuizProgress(questionBank: QuestionBank): QuizProgress {
  return questionBank.subjects.reduce<QuizProgress>((accumulator, subject) => {
    accumulator[subject.id] = createSubjectProgress()
    return accumulator
  }, {})
}

export function createSubjectProgress(): SubjectProgress {
  return {
    answers: {},
    startedAt: null,
    submittedAt: null,
    submitted: false,
    reviewed: false,
  }
}

export function scoreSubject(
  subject: QuizSubject,
  answers: Record<string, string>,
) {
  const correctCount = subject.questions.reduce((sum, question) => {
    return sum + Number(answers[question.id] === question.correctOptionId)
  }, 0)

  return {
    totalQuestions: subject.questions.length,
    correctCount,
    scorePercent: Math.round((correctCount / subject.questions.length) * 100),
  }
}

export function getUnlockedSubjectIds(
  questionBank: QuestionBank,
  progress: QuizProgress,
) {
  void progress
  return questionBank.subjects.map((subject) => subject.id)
}

export function getQuestionCount(questionBank: QuestionBank) {
  return questionBank.subjects.reduce(
    (sum, subject) => sum + subject.questions.length,
    0,
  )
}

export function getSubmissionCount(progress: QuizProgress) {
  return Object.values(progress).filter((subject) => subject.submitted).length
}

export function mergeQuestionBanks(
  currentBank: QuestionBank,
  importedBank: QuestionBank,
) {
  const subjectMap = new Map(
    currentBank.subjects.map((subject) => [subject.title.toLowerCase(), subject]),
  )

  importedBank.subjects.forEach((subject, index) => {
    const key = subject.title.toLowerCase()
    const existing = subjectMap.get(key)

    if (existing) {
      subjectMap.set(key, {
        ...existing,
        description: subject.description || existing.description,
        accent: existing.accent,
        questions: [...existing.questions, ...subject.questions],
      })
      return
    }

    subjectMap.set(key, {
      ...subject,
      accent: subject.accent || accentPalette[index % accentPalette.length],
      id: subject.id || createId(),
    })
  })

  return {
    title: currentBank.title,
    tagline: currentBank.tagline,
    updatedAt: new Date().toISOString(),
    subjects: [...subjectMap.values()],
  }
}
