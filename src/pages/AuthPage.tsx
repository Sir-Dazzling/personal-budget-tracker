import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function AuthPage() {
  const { cloud, signIn, signUp, user, household, loading } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'in' | 'up'>('up')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && user && household) return <Navigate to="/" replace />
  if (!loading && user && !household) return <Navigate to="/onboarding" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'up') {
        await signUp(email.trim(), password || 'local-demo', displayName.trim() || 'You')
      } else {
        await signIn(email.trim(), password || 'local-demo')
      }
      navigate('/onboarding', { replace: true })
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
          {cloud ? 'Cloud sync on' : 'Local mode — add Supabase later to sync phones'}
        </span>

        <div className="segmented">
          <button
            type="button"
            className={mode === 'up' ? 'active' : ''}
            onClick={() => setMode('up')}
          >
            Sign up
          </button>
          <button
            type="button"
            className={mode === 'in' ? 'active' : ''}
            onClick={() => setMode('in')}
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
              required
            />
          </div>
          {cloud && (
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          )}
          {!cloud && (
            <p className="hint">
              Local mode needs no password. Data stays on this browser until you connect Supabase.
            </p>
          )}
          {error && <p className="error">{error}</p>}
          <button className="btn block" type="submit" disabled={busy}>
            {busy ? 'Working…' : mode === 'up' ? 'Create account' : 'Continue'}
          </button>
        </form>

        <p className="hint">
          Already have a household invite? Sign in, then join with the code on{' '}
          <Link to="/onboarding">setup</Link>.
        </p>
      </div>
    </div>
  )
}
