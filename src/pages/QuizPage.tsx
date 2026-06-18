import type { QuestionBank, QuizProgress, QuizSubject } from '../types'
import { getSubmissionCount } from '../utils/storage'

interface QuizPageProps {
  questionBank: QuestionBank
  quizProgress: QuizProgress
  activeSubjectId: string
  setActiveSubjectId: (id: string) => void
  currentQuestionIndex: number
  setCurrentQuestionIndex: React.Dispatch<React.SetStateAction<number>>
  quizMessage: string
  isDarkMode: boolean
  onToggleDark: () => void
  activeSubject: QuizSubject | undefined
  handleSelectAnswer: (subjectId: string, questionId: string, optionId: string) => void
  handleSubmitQuestion: (subjectId: string, questionId: string) => void
  handleSubmitSubject: (subject: QuizSubject) => void
  handleGoToNextSubject: (subjectId: string) => void
}

export default function QuizPage({
  questionBank,
  quizProgress,
  activeSubjectId,
  setActiveSubjectId,
  currentQuestionIndex,
  setCurrentQuestionIndex,
  quizMessage,
  isDarkMode,
  onToggleDark,
  activeSubject,
  handleSelectAnswer,
  handleSubmitQuestion,
  handleSubmitSubject,
  handleGoToNextSubject,
}: QuizPageProps) {
  const answeredCount = activeSubject
    ? Object.keys(quizProgress[activeSubject.id]?.answers ?? {}).length
    : 0
  const totalQuestions = activeSubject?.questions.length ?? 0
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0

  return (
    <div className="shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar panel">
        <div>
          <p className="eyebrow">ExamHelp</p>
          <h1>Your Exam Practice Hub.</h1>
          <p>This is a preview of the student exam experience.</p>
        </div>

        <div className="topbar-actions">
          <span className="pill">Preview Only</span>
          <button
            type="button"
            className={`theme-toggle ${isDarkMode ? 'dark' : ''}`}
            onClick={onToggleDark}
            aria-label="Toggle dark mode"
          >
            <span className="theme-toggle-knob">
              {isDarkMode ? 'Moon' : 'Sun'}
            </span>
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="panel subject-rail">
          <div className="rail-header">
            <div>
              <p className="eyebrow">Subjects</p>
              <h2>Choose Freely</h2>
            </div>
            <span className="pill">{getSubmissionCount(quizProgress)} done</span>
          </div>

          <div className="subject-list">
            {questionBank.subjects.map((subject, index) => {
              const state = quizProgress[subject.id]
              const isActive = activeSubjectId === subject.id

              return (
                <button
                  key={subject.id}
                  className={[
                    'subject-tile',
                    'unlocked',
                    isActive ? 'active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ ['--subject-accent' as string]: subject.accent }}
                  type="button"
                  onClick={() => {
                    setActiveSubjectId(subject.id)
                    setCurrentQuestionIndex(0)
                  }}
                >
                  <span className="subject-order">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{subject.title}</strong>
                    <small>{subject.questions.length} questions</small>
                  </div>
                  <span className="subject-status">
                    {state?.submitted ? `${state.result?.scorePercent ?? 0}%` : 'Open'}
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="panel quiz-panel">
          <div className="quiz-header">
            <div>
              <p className="eyebrow">Learner View</p>
              <h2>{activeSubject?.title ?? 'No subject selected'}</h2>
              <p>{activeSubject?.description}</p>
            </div>

            <div className="summary-card">
              <span>
                Progress {activeSubject ? `${answeredCount}/${totalQuestions}` : '0/0'}
              </span>
              <strong>
                {activeSubject && quizProgress[activeSubject.id]?.submitted
                  ? `${quizProgress[activeSubject.id]?.result?.correctCount ?? 0} correct`
                  : 'In Progress'}
              </strong>
            </div>
          </div>

          <div className="message-strip">{quizMessage}</div>

          {activeSubject ? (
            <>
              <div className="progress-bar-container">
                <div className="progress-info">
                  <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
                  <span>{answeredCount} answered</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="question-dots">
                {activeSubject.questions.map((question, index) => {
                  const subjectState = quizProgress[activeSubject.id]
                  const isAnswered = Boolean(subjectState?.answers[question.id])
                  const isCurrent = index === currentQuestionIndex
                  const isSubmitted = Boolean(subjectState?.submitted)
                  const isQuestionSubmitted =
                    isSubmitted || Boolean(subjectState?.submittedQuestions?.[question.id])
                  const isCorrect =
                    isQuestionSubmitted &&
                    subjectState?.answers[question.id] === question.correctOptionId
                  const isIncorrect =
                    isQuestionSubmitted &&
                    isAnswered &&
                    subjectState?.answers[question.id] !== question.correctOptionId

                  return (
                    <button
                      key={question.id}
                      type="button"
                      className={[
                        'question-dot',
                        isCurrent ? 'active' : '',
                        !isQuestionSubmitted && isAnswered ? 'answered' : '',
                        isCorrect ? 'correct-dot' : '',
                        isIncorrect ? 'incorrect-dot' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => setCurrentQuestionIndex(index)}
                      aria-label={`Go to question ${index + 1}`}
                    />
                  )
                })}
              </div>

              <div className="question-stack">
                {(() => {
                  const question = activeSubject.questions[currentQuestionIndex]
                  if (!question) return null

                  const subjectState = quizProgress[activeSubject.id]
                  const selectedOptionId = subjectState?.answers[question.id] ?? ''
                  const isSubjectSubmitted = Boolean(subjectState?.submitted)
                  const isQuestionSubmitted =
                    isSubjectSubmitted || Boolean(subjectState?.submittedQuestions?.[question.id])
                  const correctOption = question.options.find(
                    (option) => option.id === question.correctOptionId,
                  )

                  return (
                    <article
                      className="question-card"
                      key={`${question.id}-${currentQuestionIndex}`}
                    >
                      <div className="question-heading">
                        <span>Question {currentQuestionIndex + 1} of {activeSubject.questions.length}</span>
                        <h3>{question.prompt}</h3>
                      </div>

                      <div className="option-grid">
                        {question.options.map((option) => {
                          const isSelected = selectedOptionId === option.id
                          const isCorrect = option.id === question.correctOptionId
                          const isWrongChoice = isQuestionSubmitted && isSelected && !isCorrect

                          return (
                            <label
                              className={[
                                'option-card',
                                isSelected ? 'selected' : '',
                                isQuestionSubmitted && isCorrect ? 'correct' : '',
                                isWrongChoice ? 'incorrect' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              key={option.id}
                            >
                              <input
                                checked={isSelected}
                                disabled={isQuestionSubmitted}
                                name={question.id}
                                type="radio"
                                value={option.id}
                                onChange={() =>
                                  handleSelectAnswer(
                                    activeSubject.id,
                                    question.id,
                                    option.id,
                                  )
                                }
                              />
                              <span>{option.text}</span>
                            </label>
                          )
                        })}
                      </div>

                      {!isQuestionSubmitted && selectedOptionId ? (
                        <div style={{ marginTop: '20px' }}>
                          <button
                            className="primary-button"
                            type="button"
                            onClick={() => handleSubmitQuestion(activeSubject.id, question.id)}
                          >
                            Submit Answer
                          </button>
                        </div>
                      ) : null}

                      {isQuestionSubmitted ? (
                        <div className="answer-review">
                          <strong>
                            {selectedOptionId === question.correctOptionId ? 'Correct answer:' : 'Review:'}{' '}
                            {correctOption?.text ?? 'Not available'}
                          </strong>
                          <p>{question.explanation}</p>
                        </div>
                      ) : null}
                    </article>
                  )
                })()}
              </div>

              <div className="action-row">
                <div className="nav-buttons">
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((current) => current - 1)}
                  >
                    Previous
                  </button>

                  <button
                    className="secondary-button"
                    type="button"
                    disabled={currentQuestionIndex === activeSubject.questions.length - 1}
                    onClick={() => setCurrentQuestionIndex((current) => current + 1)}
                  >
                    Next
                  </button>
                </div>

                <button
                  className="primary-button"
                  type="button"
                  onClick={() => handleSubmitSubject(activeSubject)}
                  disabled={quizProgress[activeSubject.id]?.submitted}
                >
                  Submit {activeSubject.title}
                </button>

                {quizProgress[activeSubject.id]?.submitted ? (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => handleGoToNextSubject(activeSubject.id)}
                  >
                    Next Subject
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>No subjects available</h3>
              <p>Navigate to <code>/admin</code> to add your first question set.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
