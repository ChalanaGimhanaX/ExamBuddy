import { pool } from './db.mjs'

export async function getQuestionBank() {
  const bankResult = await pool.query(
    'SELECT title, tagline, updated_at FROM question_banks WHERE id = 1',
  )

  if (bankResult.rowCount === 0) {
    return null
  }

  const subjectResult = await pool.query(
    `SELECT id, title, description, accent, sort_order
     FROM subjects
     WHERE bank_id = 1
     ORDER BY sort_order ASC`,
  )

  const questionResult = await pool.query(
    `SELECT id, subject_id, prompt, correct_option_id, explanation, sort_order
     FROM questions
     ORDER BY sort_order ASC`,
  )

  const optionResult = await pool.query(
    `SELECT id, question_id, text, sort_order
     FROM question_options
     ORDER BY sort_order ASC`,
  )

  const optionsByQuestionId = new Map()
  for (const row of optionResult.rows) {
    const list = optionsByQuestionId.get(row.question_id) ?? []
    list.push({
      id: row.id,
      text: row.text,
    })
    optionsByQuestionId.set(row.question_id, list)
  }

  const questionsBySubjectId = new Map()
  for (const row of questionResult.rows) {
    const list = questionsBySubjectId.get(row.subject_id) ?? []
    list.push({
      id: row.id,
      prompt: row.prompt,
      correctOptionId: row.correct_option_id,
      explanation: row.explanation,
      options: optionsByQuestionId.get(row.id) ?? [],
    })
    questionsBySubjectId.set(row.subject_id, list)
  }

  return {
    title: bankResult.rows[0].title,
    tagline: bankResult.rows[0].tagline,
    updatedAt: new Date(bankResult.rows[0].updated_at).toISOString(),
    subjects: subjectResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      accent: row.accent,
      questions: questionsBySubjectId.get(row.id) ?? [],
    })),
  }
}

export async function saveQuestionBank(questionBank) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM question_banks WHERE id = 1')
    await client.query(
      `INSERT INTO question_banks (id, title, tagline, updated_at)
       VALUES (1, $1, $2, $3)`,
      [questionBank.title, questionBank.tagline, questionBank.updatedAt],
    )

    for (const [subjectIndex, subject] of questionBank.subjects.entries()) {
      await client.query(
        `INSERT INTO subjects (id, bank_id, title, description, accent, sort_order)
         VALUES ($1, 1, $2, $3, $4, $5)`,
        [
          subject.id,
          subject.title,
          subject.description,
          subject.accent,
          subjectIndex,
        ],
      )

      for (const [questionIndex, question] of subject.questions.entries()) {
        await client.query(
          `INSERT INTO questions (
            id, subject_id, prompt, correct_option_id, explanation, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            question.id,
            subject.id,
            question.prompt,
            question.correctOptionId,
            question.explanation,
            questionIndex,
          ],
        )

        for (const [optionIndex, option] of question.options.entries()) {
          await client.query(
            `INSERT INTO question_options (id, question_id, text, sort_order)
             VALUES ($1, $2, $3, $4)`,
            [option.id, question.id, option.text, optionIndex],
          )
        }
      }
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function getAnalytics() {
  const [visits, submissions, imports] = await Promise.all([
    pool.query(
      'SELECT id, timestamp, context FROM app_visits ORDER BY timestamp ASC',
    ),
    pool.query(
      `SELECT id, timestamp, subject_id, subject_title, total_questions,
              correct_count, score_percent, duration_seconds, context
       FROM app_submissions
       ORDER BY timestamp ASC`,
    ),
    pool.query(
      `SELECT id, timestamp, source, subject_count, question_count
       FROM app_imports
       ORDER BY timestamp ASC`,
    ),
  ])

  return {
    visits: visits.rows.map((row) => ({
      id: row.id,
      timestamp: new Date(row.timestamp).toISOString(),
      context: row.context,
    })),
    submissions: submissions.rows.map((row) => ({
      id: row.id,
      timestamp: new Date(row.timestamp).toISOString(),
      subjectId: row.subject_id,
      subjectTitle: row.subject_title,
      totalQuestions: row.total_questions,
      correctCount: row.correct_count,
      scorePercent: row.score_percent,
      durationSeconds: row.duration_seconds,
      context: row.context,
    })),
    imports: imports.rows.map((row) => ({
      id: row.id,
      timestamp: new Date(row.timestamp).toISOString(),
      source: row.source,
      subjectCount: row.subject_count,
      questionCount: row.question_count,
    })),
  }
}

export async function saveAnalytics(analytics) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query('TRUNCATE TABLE app_visits, app_submissions, app_imports')

    for (const visit of analytics.visits) {
      await client.query(
        `INSERT INTO app_visits (id, timestamp, context)
         VALUES ($1, $2, $3)`,
        [visit.id, visit.timestamp, JSON.stringify(visit.context)],
      )
    }

    for (const submission of analytics.submissions) {
      await client.query(
        `INSERT INTO app_submissions (
          id, timestamp, subject_id, subject_title, total_questions,
          correct_count, score_percent, duration_seconds, context
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          submission.id,
          submission.timestamp,
          submission.subjectId,
          submission.subjectTitle,
          submission.totalQuestions,
          submission.correctCount,
          submission.scorePercent,
          submission.durationSeconds,
          JSON.stringify(submission.context),
        ],
      )
    }

    for (const record of analytics.imports) {
      await client.query(
        `INSERT INTO app_imports (id, timestamp, source, subject_count, question_count)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          record.id,
          record.timestamp,
          record.source,
          record.subjectCount,
          record.questionCount,
        ],
      )
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function getQuizProgress(visitorId) {
  const result = await pool.query(
    'SELECT progress FROM visitor_progress WHERE visitor_id = $1',
    [visitorId],
  )

  if (result.rowCount === 0) {
    return null
  }

  return result.rows[0].progress
}

export async function saveQuizProgress(visitorId, progress) {
  await pool.query(
    `INSERT INTO visitor_progress (visitor_id, progress, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (visitor_id)
     DO UPDATE SET progress = EXCLUDED.progress, updated_at = NOW()`,
    [visitorId, JSON.stringify(progress)],
  )
}
