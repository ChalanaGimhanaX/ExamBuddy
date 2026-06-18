import express from 'express'
import { initDb } from './db.mjs'
import {
  getAnalytics,
  getQuestionBank,
  getQuizProgress,
  saveAnalytics,
  saveQuestionBank,
  saveQuizProgress,
} from './repository.mjs'

const app = express()
const port = Number(process.env.PORT || 3001)

app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.get('/api/question-bank', async (_request, response, next) => {
  try {
    const questionBank = await getQuestionBank()
    if (!questionBank) {
      response.status(404).json({ message: 'Question bank not found' })
      return
    }

    response.json(questionBank)
  } catch (error) {
    next(error)
  }
})

app.put('/api/question-bank', async (request, response, next) => {
  try {
    await saveQuestionBank(request.body)
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.get('/api/analytics', async (_request, response, next) => {
  try {
    response.json(await getAnalytics())
  } catch (error) {
    next(error)
  }
})

app.put('/api/analytics', async (request, response, next) => {
  try {
    await saveAnalytics(request.body)
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.get('/api/quiz-progress/:visitorId', async (request, response, next) => {
  try {
    const progress = await getQuizProgress(request.params.visitorId)
    if (!progress) {
      response.status(404).json({ message: 'Progress not found' })
      return
    }

    response.json(progress)
  } catch (error) {
    next(error)
  }
})

app.put('/api/quiz-progress/:visitorId', async (request, response, next) => {
  try {
    await saveQuizProgress(request.params.visitorId, request.body)
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ message: 'Internal server error' })
})

await initDb()

app.listen(port, () => {
  console.log(`ExamBuddy API listening on ${port}`)
})
