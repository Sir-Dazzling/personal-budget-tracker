import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function AuthPage() {
  const { cloud, signIn, signUp, user, household, loading } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'in' | 'up'>('up')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && user && household) return <Navigate to="/" replace />
  if (!loading && user && !household) return <Navigate to="/onboarding" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      const trimmedEmail = email.trim().toLowerCase()
      if (!trimmedEmail.includes('@')) {
        throw new Error('Enter a valid email')
      }

      if (cloud && password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      const result =
        mode === 'up'
          ? await signUp(
              trimmedEmail,
              cloud ? password : password || 'local-demo-password',
              displayName.trim() || trimmedEmail.split('@')[0] || 'You',
            )
          : await signIn(
              trimmedEmail,
              cloud ? password : password || 'local-demo-password',
            )

      if (result.next === 'confirm-email') {
        setInfo(result.message ?? 'Check your email to confirm, then sign in.')
        setMode('in')
        return
      }

      navigate(result.next === 'home' ? '/' : '/onboarding', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="panel auth-card stack">
        <div>
          <h1>Split</h1>
          <p className="page-sub">
            Shared Naira budget for you and your brother — know when you&apos;re heading over.
          </p>
        </div>

        <span className={`mode-pill ${cloud ? 'cloud' : ''}`}>
          {cloud ? 'Cloud sync on' : 'Local mode — data stays on this device'}
        </span>

        <div className="segmented">
          <button
            type="button"
            className={mode === 'up' ? 'active' : ''}
            onClick={() => {
              setMode('up')
              setError('')
              setInfo('')
            }}
          >
            Sign up
          </button>
          <button
            type="button"
            className={mode === 'in' ? 'active' : ''}
            onClick={() => {
              setMode('in')
              setError('')
              setInfo('')
            }}
          >
            Sign in
          </button>
        </div>

        <form className="stack" onSubmit={onSubmit}>
          {mode === 'up' && (
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Tunde"
                autoComplete="name"
                required
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password {cloud ? '' : '(optional in local mode)'}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={cloud ? 6 : undefined}
              required={cloud}
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              placeholder={cloud ? 'At least 6 characters' : 'Leave blank locally'}
            />
          </div>
          {!cloud && (
            <p className="hint">
              Local mode works without Supabase. Use the same email to sign back in on this browser.
            </p>
          )}
          {error && <p className="error">{error}</p>}
          {info && (
            <p className="hint" style={{ color: 'var(--ok)' }}>
              {info}
            </p>
          )}
          <button className="btn block" type="submit" disabled={busy}>
            {busy ? 'Working…' : mode === 'up' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
