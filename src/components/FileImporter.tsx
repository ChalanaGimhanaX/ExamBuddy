import { useState, useRef, useCallback } from 'react'
import type { ImportMode } from '../types'

interface FileImporterProps {
  importText: string
  importMode: ImportMode
  onChangeText: (text: string) => void
  onChangeMode: (mode: ImportMode) => void
  onImport: () => Promise<void>
  submitLabel: string
  isSubmitting: boolean
  message: string
}

const JSON_TEMPLATE = `{
  "title": "My Question Bank",
  "tagline": "Custom quiz for practice",
  "subjects": [
    {
      "title": "Subject Name",
      "description": "Description of the subject",
      "questions": [
        {
          "prompt": "What is 2 + 2?",
          "options": ["3", "4", "5", "6"],
          "answer": "B",
          "explanation": "2 + 2 equals 4."
        },
        {
          "prompt": "What is the capital of France?",
          "options": ["London", "Berlin", "Paris", "Madrid"],
          "answer": "C",
          "explanation": "Paris is the capital of France."
        }
      ]
    }
  ]
}`

const TEXT_TEMPLATE = `Subject: History Foundations
Description: Ancient civilizations, timelines, and key events.

Question: Which river was central to ancient Egyptian civilization?
A. Amazon
B. Nile
C. Thames
D. Danube
Answer: B
Explanation: Ancient Egypt grew around the Nile River because it supported farming and transport.

Question: Which civilization built the Roman Colosseum?
A. Greek
B. Persian
C. Roman
D. Mesopotamian
Answer: C
Explanation: The Colosseum was built in Rome under the Flavian emperors.

Subject: Computing Basics
Description: Starter questions for digital literacy and programming concepts.

Question: What does CPU stand for?
A. Central Process Unit
B. Computer Personal Unit
C. Central Processing Unit
D. Control Processing Utility
Answer: C
Explanation: CPU stands for Central Processing Unit.`

const CSV_TEMPLATE = `Subject,Question,Option A,Option B,Option C,Option D,Answer,Explanation
Mathematics,What is 5 x 6?,25,30,35,40,B,5 multiplied by 6 equals 30.
Mathematics,What is the square root of 144?,10,11,12,13,C,The square root of 144 is 12.
Science,What planet is closest to the Sun?,Venus,Mercury,Mars,Earth,B,Mercury is the closest planet to the Sun.
Science,What gas do plants absorb from the atmosphere?,Oxygen,Nitrogen,Carbon Dioxide,Hydrogen,C,Plants absorb CO2 during photosynthesis.`

function parseCSVImport(csv: string): string {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row.')
  }

  const header = lines[0].toLowerCase()
  if (!header.includes('subject') || !header.includes('question')) {
    throw new Error(
      'CSV header must include at least "Subject" and "Question" columns.',
    )
  }

  const subjects = new Map<
    string,
    {
      title: string
      questions: {
        prompt: string
        options: string[]
        answer: string
        explanation: string
      }[]
    }
  >()

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVRow(lines[i])
    if (row.length < 7) continue

    const [subjectTitle, prompt, optA, optB, optC, optD, answer, explanation] =
      row

    if (!subjectTitle || !prompt) continue

    if (!subjects.has(subjectTitle)) {
      subjects.set(subjectTitle, { title: subjectTitle, questions: [] })
    }

    const options = [optA, optB, optC, optD].filter(Boolean)
    subjects
      .get(subjectTitle)!
      .questions.push({
        prompt,
        options,
        answer: answer || 'A',
        explanation: explanation || 'Review this topic for a deeper understanding.',
      })
  }

  const subjectArray = [...subjects.values()].map((s) => ({
    title: s.title,
    description: `${s.title} - imported from CSV`,
    questions: s.questions.map((q) => ({
      prompt: q.prompt,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
    })),
  }))

  return JSON.stringify(
    {
      title: 'CSV Import',
      tagline: 'Imported from CSV file',
      subjects: subjectArray,
    },
    null,
    2,
  )
}

function parseCSVRow(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

export default function FileImporter({
  importText,
  importMode,
  onChangeText,
  onChangeMode,
  onImport,
  submitLabel,
  isSubmitting,
  message,
}: FileImporterProps) {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste')
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [templateDropdown, setTemplateDropdown] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const ext = file.name.split('.').pop()?.toLowerCase()

        if (ext === 'csv') {
          try {
            const converted = parseCSVImport(text)
            onChangeText(converted)
          } catch {
            onChangeText(text)
          }
        } else {
          onChangeText(text)
        }

        setUploadedFileName(file.name)
        setActiveTab('paste') // Switch to paste tab so they can review
      }
      reader.readAsText(file)
    },
    [onChangeText],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const downloadTemplate = (type: 'json' | 'text' | 'csv') => {
    const templates = {
      json: { content: JSON_TEMPLATE, ext: 'json', mime: 'application/json' },
      text: { content: TEXT_TEMPLATE, ext: 'txt', mime: 'text/plain' },
      csv: { content: CSV_TEMPLATE, ext: 'csv', mime: 'text/csv' },
    }

    const t = templates[type]
    const blob = new Blob([t.content], { type: t.mime })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `exambuddy-template.${t.ext}`
    link.click()
    URL.revokeObjectURL(url)
    setTemplateDropdown(false)
  }

  const loadTemplate = (type: 'json' | 'text' | 'csv') => {
    const templates = {
      json: JSON_TEMPLATE,
      text: TEXT_TEMPLATE,
      csv: CSV_TEMPLATE,
    }
    onChangeText(templates[type])
    setTemplateDropdown(false)
  }

  return (
    <div className="file-importer">
      {/* Tab Switcher */}
      <div className="importer-tabs">
        <button
          type="button"
          className={`importer-tab ${activeTab === 'paste' ? 'active' : ''}`}
          onClick={() => setActiveTab('paste')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          </svg>
          Paste Content
        </button>
        <button
          type="button"
          className={`importer-tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload File
        </button>
      </div>

      {/* Import Mode + Templates */}
      <div className="importer-toolbar">
        <div className="mode-switch">
          <button
            className={importMode === 'merge' ? 'active' : ''}
            type="button"
            onClick={() => onChangeMode('merge')}
          >
            Merge
          </button>
          <button
            className={importMode === 'replace' ? 'active' : ''}
            type="button"
            onClick={() => onChangeMode('replace')}
          >
            Replace
          </button>
        </div>

        <div className="template-dropdown-container">
          <button
            type="button"
            className="template-btn"
            onClick={() => setTemplateDropdown(!templateDropdown)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Templates
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {templateDropdown && (
            <div className="template-dropdown">
              <p className="dropdown-label">Load template</p>
              <button type="button" onClick={() => loadTemplate('json')}>
                <span className="badge json">JSON</span> Structured format
              </button>
              <button type="button" onClick={() => loadTemplate('text')}>
                <span className="badge text">TXT</span> Plain text format
              </button>
              <button type="button" onClick={() => loadTemplate('csv')}>
                <span className="badge csv">CSV</span> Spreadsheet format
              </button>
              <hr />
              <p className="dropdown-label">Download template file</p>
              <button type="button" onClick={() => downloadTemplate('json')}>
                ⬇ Download JSON template
              </button>
              <button type="button" onClick={() => downloadTemplate('text')}>
                ⬇ Download TXT template
              </button>
              <button type="button" onClick={() => downloadTemplate('csv')}>
                ⬇ Download CSV template
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Message */}
      <div className="message-strip importer-message">{message}</div>

      {/* Active Tab Content */}
      {activeTab === 'paste' ? (
        <div className="paste-area">
          <textarea
            className="import-textarea"
            value={importText}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder="Paste JSON, plain text, or CSV content here..."
            spellCheck={false}
          />
          {uploadedFileName && (
            <div className="uploaded-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Loaded from: {uploadedFileName}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt,.csv,.text"
            onChange={handleInputChange}
            className="hidden-input"
          />

          <div className="drop-zone-content">
            <div className="drop-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h3>Drag & drop your file here</h3>
            <p>or click to browse</p>
            <div className="supported-formats">
              <span className="badge json">JSON</span>
              <span className="badge text">TXT</span>
              <span className="badge csv">CSV</span>
            </div>
          </div>
        </div>
      )}

      {/* Import Action */}
      <div className="importer-actions">
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            void onImport()
          }}
          disabled={isSubmitting}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {submitLabel}
        </button>
      </div>

      {/* Format Guide */}
      <details className="format-guide">
        <summary>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Supported import formats
        </summary>
        <div className="format-guide-content">
          <div className="format-card">
            <h4><span className="badge json">JSON</span> JSON Format</h4>
            <p>A structured object with <code>subjects</code> array. Each subject has a <code>title</code>, <code>description</code>, and <code>questions</code> array. Questions need <code>prompt</code>, <code>options</code> (array of strings), <code>answer</code> (letter like "A", "B", etc.), and <code>explanation</code>.</p>
          </div>
          <div className="format-card">
            <h4><span className="badge text">TXT</span> Text Format</h4>
            <p>Use labeled lines: <code>Subject:</code>, <code>Description:</code>, <code>Question:</code>, options as <code>A.</code> through <code>D.</code>, <code>Answer:</code>, and <code>Explanation:</code>. Separate questions with blank lines.</p>
          </div>
          <div className="format-card">
            <h4><span className="badge csv">CSV</span> CSV Format</h4>
            <p>A comma-separated table with columns: <code>Subject, Question, Option A, Option B, Option C, Option D, Answer, Explanation</code>. Each row is one question. Subjects are auto-grouped.</p>
          </div>
        </div>
      </details>
    </div>
  )
}
