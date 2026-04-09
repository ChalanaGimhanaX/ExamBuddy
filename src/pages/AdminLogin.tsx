import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface AdminLoginProps {
  isAuth: boolean
  onLogin: (username: string, password: string) => boolean
  isDarkMode: boolean
  onToggleDark: () => void
}

export default function AdminLogin({ isAuth, onLogin, isDarkMode, onToggleDark }: AdminLoginProps) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isAuth) {
      navigate('/admin/dashboard', { replace: true })
    }
  }, [isAuth, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Small delay for UX feedback
    await new Promise((r) => setTimeout(r, 600))

    const success = onLogin(username, password)
    if (success) {
      navigate('/admin/dashboard', { replace: true })
    } else {
      setError('Invalid credentials. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="admin-login-page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <div className="admin-login-container">
        {/* Left branding panel */}
        <div className="admin-login-branding">
          <div className="branding-content">
            <div className="branding-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="12" fill="url(#brandGrad)" />
                <path d="M15 20L24 14L33 20V28L24 34L15 28V20Z" stroke="white" strokeWidth="2" fill="none" />
                <path d="M24 14V34" stroke="white" strokeWidth="1.5" opacity="0.5" />
                <path d="M15 20L33 28" stroke="white" strokeWidth="1.5" opacity="0.5" />
                <path d="M33 20L15 28" stroke="white" strokeWidth="1.5" opacity="0.5" />
                <defs>
                  <linearGradient id="brandGrad" x1="0" y1="0" x2="48" y2="48">
                    <stop stopColor="#6c5ce7" />
                    <stop offset="1" stopColor="#a29bfe" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1>ExamBuddy</h1>
            <p className="branding-tagline">Administration Portal</p>

            <div className="branding-features">
              <div className="branding-feature">
                <span className="feature-icon">📊</span>
                <div>
                  <strong>Analytics Dashboard</strong>
                  <p>Track visits, scores, and performance trends</p>
                </div>
              </div>
              <div className="branding-feature">
                <span className="feature-icon">📥</span>
                <div>
                  <strong>Question Import</strong>
                  <p>Upload JSON, CSV, or text files in bulk</p>
                </div>
              </div>
              <div className="branding-feature">
                <span className="feature-icon">🎯</span>
                <div>
                  <strong>Subject Management</strong>
                  <p>Create, merge, and organize quiz content</p>
                </div>
              </div>
            </div>
          </div>

          <p className="branding-footer">
            Secure access for authorized administrators only.
          </p>
        </div>

        {/* Right login form */}
        <div className="admin-login-form-panel">
          <div className="login-form-header">
            <button
              type="button"
              className={`theme-toggle ${isDarkMode ? 'dark' : ''}`}
              onClick={onToggleDark}
              aria-label="Toggle dark mode"
            >
              <span className="theme-toggle-knob">
                {isDarkMode ? '🌙' : '☀️'}
              </span>
            </button>
          </div>

          <div className="login-form-body">
            <div className="login-welcome">
              <div className="login-avatar">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h2>Welcome back</h2>
              <p>Sign in to access the admin dashboard</p>
            </div>

            {error && (
              <div className="login-error-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="admin-username">Username</label>
                <div className="input-wrapper">
                  <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    id="admin-username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    autoComplete="username"
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="admin-password">Password</label>
                <div className="input-wrapper">
                  <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={isLoading || !username || !password}
              >
                {isLoading ? (
                  <span className="login-spinner" />
                ) : (
                  <>
                    Sign in to Dashboard
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="login-form-footer">
            <button
              type="button"
              className="back-to-quiz-link"
              onClick={() => navigate('/')}
            >
              ← Back to Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
