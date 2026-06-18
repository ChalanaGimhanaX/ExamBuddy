import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS question_banks (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    title TEXT NOT NULL,
    tagline TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    bank_id SMALLINT NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    accent TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    correct_option_id TEXT NOT NULL,
    explanation TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS question_options (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS visitor_progress (
    visitor_id TEXT PRIMARY KEY,
    progress JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS app_visits (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    context JSONB NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS app_submissions (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    subject_id TEXT NOT NULL,
    subject_title TEXT NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    score_percent INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    context JSONB NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS app_imports (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL,
    subject_count INTEGER NOT NULL,
    question_count INTEGER NOT NULL
  )`,
]

export async function initDb() {
  for (const statement of schemaStatements) {
    await pool.query(statement)
  }
}
