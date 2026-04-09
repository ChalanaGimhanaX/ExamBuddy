import type { QuestionBank, QuizOption, QuizQuestion, QuizSubject } from '../types'
import { createId } from './visitor'

const accentPalette = ['#ff7749', '#00bdd6', '#7a5cff', '#10b981', '#ff4d8d']

export function parseImportedQuestionBank(input: string): QuestionBank {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error('Paste a JSON block or the provided text format before importing.')
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseJsonImport(JSON.parse(trimmed))
  }

  return parseTextImport(trimmed)
}

function parseJsonImport(raw: unknown): QuestionBank {
  const source = Array.isArray(raw)
    ? { title: 'Imported Question Bank', tagline: 'Imported from JSON', subjects: raw }
    : (raw as {
        title?: unknown
        tagline?: unknown
        subjects?: unknown
      })

  if (!Array.isArray(source.subjects)) {
    throw new Error('JSON imports must contain a "subjects" array or be an array of subjects.')
  }

  const subjects = source.subjects.map((subject, index) =>
    normalizeSubject(subject, index),
  )

  if (subjects.length === 0) {
    throw new Error('The import needs at least one subject with one or more questions.')
  }

  return {
    title:
      typeof source.title === 'string' && source.title.trim()
        ? source.title
        : 'Imported Question Bank',
    tagline:
      typeof source.tagline === 'string' && source.tagline.trim()
        ? source.tagline
        : 'Imported from JSON',
    subjects,
    updatedAt: new Date().toISOString(),
  }
}

function normalizeSubject(raw: unknown, index: number): QuizSubject {
  const record = raw as {
    id?: unknown
    title?: unknown
    name?: unknown
    description?: unknown
    accent?: unknown
    questions?: unknown
  }

  const title =
    typeof record.title === 'string' && record.title.trim()
      ? record.title.trim()
      : typeof record.name === 'string' && record.name.trim()
        ? record.name.trim()
        : `Imported Subject ${index + 1}`

  if (!Array.isArray(record.questions) || record.questions.length === 0) {
    throw new Error(`"${title}" needs a questions array with at least one question.`)
  }

  return {
    id:
      typeof record.id === 'string' && record.id.trim()
        ? record.id
        : createId(),
    title,
    description:
      typeof record.description === 'string' && record.description.trim()
        ? record.description.trim()
        : 'Imported subject ready for review.',
    accent:
      typeof record.accent === 'string' && record.accent.trim()
        ? record.accent
        : accentPalette[index % accentPalette.length],
    questions: record.questions.map((question, questionIndex) =>
      normalizeQuestion(question, title, questionIndex),
    ),
  }
}

function normalizeQuestion(
  raw: unknown,
  subjectTitle: string,
  index: number,
): QuizQuestion {
  const record = raw as {
    id?: unknown
    prompt?: unknown
    question?: unknown
    options?: unknown
    answer?: unknown
    answerIndex?: unknown
    correctOptionId?: unknown
    correctAnswer?: unknown
    explanation?: unknown
  }

  const prompt =
    typeof record.prompt === 'string' && record.prompt.trim()
      ? record.prompt.trim()
      : typeof record.question === 'string' && record.question.trim()
        ? record.question.trim()
        : ''

  if (!prompt) {
    throw new Error(`Question ${index + 1} in ${subjectTitle} is missing its prompt.`)
  }

  if (!Array.isArray(record.options) || record.options.length < 2) {
    throw new Error(`"${prompt}" needs at least two options.`)
  }

  const options = record.options.map((option, optionIndex) =>
    normalizeOption(option, optionIndex),
  )

  return {
    id:
      typeof record.id === 'string' && record.id.trim()
        ? record.id
        : createId(),
    prompt,
    options,
    correctOptionId: resolveCorrectOptionId(
      options,
      record.correctOptionId ?? record.correctAnswer ?? record.answer ?? record.answerIndex,
    ),
    explanation:
      typeof record.explanation === 'string' && record.explanation.trim()
        ? record.explanation.trim()
        : 'Review this concept before attempting the next subject.',
  }
}

function normalizeOption(raw: unknown, index: number): QuizOption {
  if (typeof raw === 'string') {
    return {
      id: createId(),
      text: raw.trim(),
    }
  }

  const record = raw as { id?: unknown; text?: unknown; label?: unknown }
  const text =
    typeof record.text === 'string' && record.text.trim()
      ? record.text.trim()
      : typeof record.label === 'string' && record.label.trim()
        ? record.label.trim()
        : `Option ${index + 1}`

  return {
    id:
      typeof record.id === 'string' && record.id.trim()
        ? record.id
        : createId(),
    text,
  }
}

function resolveCorrectOptionId(options: QuizOption[], answerRaw: unknown) {
  if (typeof answerRaw === 'number' && options[answerRaw - 1]) {
    return options[answerRaw - 1].id
  }

  if (typeof answerRaw === 'string') {
    const answer = answerRaw.trim()
    const byId = options.find((option) => option.id === answer)
    if (byId) {
      return byId.id
    }

    if (/^[A-Z]$/i.test(answer)) {
      const index = answer.toUpperCase().charCodeAt(0) - 65
      if (options[index]) {
        return options[index].id
      }
    }

    if (/^\d+$/.test(answer)) {
      const index = Number(answer) - 1
      if (options[index]) {
        return options[index].id
      }
    }

    const byText = options.find(
      (option) => option.text.toLowerCase() === answer.toLowerCase(),
    )
    if (byText) {
      return byText.id
    }
  }

  throw new Error('Each imported question needs an answer that matches one option.')
}

function parseTextImport(input: string): QuestionBank {
  const lines = input.replace(/\r\n/g, '\n').split('\n')
  const subjects: QuizSubject[] = []
  let currentSubject = createWorkingSubject('Imported Subject 1', 0)
  let subjectCounter = 0
  let lineIndex = 0

  while (lineIndex < lines.length) {
    const rawLine = lines[lineIndex]
    const line = rawLine.trim()

    if (!line) {
      lineIndex += 1
      continue
    }

    const subjectValue = getLabelValue(line, ['subject'])
    if (subjectValue) {
      if (currentSubject.questions.length > 0 || currentSubject.title !== 'Imported Subject 1') {
        subjects.push(finalizeWorkingSubject(currentSubject))
      }
      subjectCounter += 1
      currentSubject = createWorkingSubject(subjectValue, subjectCounter - 1)
      lineIndex += 1
      continue
    }

    const descriptionValue = getLabelValue(line, ['description'])
    if (descriptionValue) {
      currentSubject.description = descriptionValue
      lineIndex += 1
      continue
    }

    const questionValue = getLabelValue(line, ['question', 'q'])
    if (questionValue) {
      const block = parseQuestionBlock(lines, lineIndex, questionValue)
      currentSubject.questions.push(block.question)
      lineIndex = block.nextIndex
      continue
    }

    lineIndex += 1
  }

  if (currentSubject.questions.length > 0) {
    subjects.push(finalizeWorkingSubject(currentSubject))
  }

  if (subjects.length === 0) {
    throw new Error('No questions were found. Use the sample text format or import JSON.')
  }

  return {
    title: 'Imported Question Bank',
    tagline: 'Imported from text',
    subjects,
    updatedAt: new Date().toISOString(),
  }
}

function parseQuestionBlock(lines: string[], startIndex: number, prompt: string) {
  const options: string[] = []
  let answer = ''
  let explanation = ''
  let index = startIndex + 1
  let activeField: 'prompt' | 'explanation' | null = null
  let workingPrompt = prompt

  while (index < lines.length) {
    const line = lines[index].trim()

    if (!line) {
      index += 1
      continue
    }

    if (getLabelValue(line, ['subject']) || getLabelValue(line, ['question', 'q'])) {
      break
    }

    const descriptionValue = getLabelValue(line, ['description'])
    if (descriptionValue) {
      break
    }

    const answerValue = getLabelValue(line, ['answer'])
    if (answerValue) {
      answer = answerValue
      activeField = null
      index += 1
      continue
    }

    const explanationValue = getLabelValue(line, ['explanation'])
    if (explanationValue) {
      explanation = explanationValue
      activeField = 'explanation'
      index += 1
      continue
    }

    const optionMatch = line.match(/^(?:[A-Z][.)]|[-*])\s+(.+)$/)
    const optionValue = getLabelValue(line, ['option'])
    if (optionMatch || optionValue) {
      options.push((optionMatch?.[1] ?? optionValue ?? '').trim())
      activeField = null
      index += 1
      continue
    }

    if (activeField === 'explanation') {
      explanation = `${explanation} ${line}`.trim()
      index += 1
      continue
    }

    activeField = 'prompt'
    workingPrompt = `${workingPrompt} ${line}`.trim()
    index += 1
  }

  if (options.length < 2) {
    throw new Error(`"${prompt}" needs at least two options.`)
  }

  if (!answer) {
    throw new Error(`"${prompt}" is missing an Answer line.`)
  }

  const normalizedOptions = options.map((option) => ({
    id: createId(),
    text: option,
  }))

  return {
    question: {
      id: createId(),
      prompt: workingPrompt,
      options: normalizedOptions,
      correctOptionId: resolveCorrectOptionId(normalizedOptions, answer),
      explanation:
        explanation || 'Review this concept before moving to the next subject.',
    },
    nextIndex: index,
  }
}

function getLabelValue(line: string, labels: string[]) {
  const lowerLine = line.toLowerCase()

  for (const label of labels) {
    const prefix = `${label.toLowerCase()}:`
    if (lowerLine.startsWith(prefix)) {
      return line.slice(prefix.length).trim()
    }
  }

  return ''
}

function createWorkingSubject(title: string, index: number) {
  return {
    id: createId(),
    title,
    description: 'Imported subject ready for practice.',
    accent: accentPalette[index % accentPalette.length],
    questions: [] as QuizQuestion[],
  }
}

function finalizeWorkingSubject(subject: QuizSubject): QuizSubject {
  return {
    ...subject,
    title: subject.title.trim(),
    description: subject.description.trim(),
  }
}
