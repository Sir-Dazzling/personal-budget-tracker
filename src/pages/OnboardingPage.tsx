import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function OnboardingPage() {
  const { user, household, createHousehold, joinHousehold, cloud } = useApp()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [householdName, setHouseholdName] = useState('Brother budget')
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!user) return <Navigate to="/auth" replace />
  if (household) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (tab === 'create') {
        await createHousehold(householdName.trim(), displayName.trim() || 'You')
      } else {
        await joinHousehold(code.trim(), displayName.trim() || 'Brother')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="panel auth-card stack">
        <div>
          <p className="brand-mark">Split</p>
          <h2 className="page-title" style={{ marginTop: 8 }}>
            Set up your household
          </h2>
          <p className="page-sub">One shared budget. Two people. All in ₦.</p>
        </div>

        <div className="segmented">
          <button
            type="button"
            className={tab === 'create' ? 'active' : ''}
            onClick={() => setTab('create')}
          >
            Create
          </button>
          <button
            type="button"
            className={tab === 'join' ? 'active' : ''}
            onClick={() => setTab('join')}
          >
            Join
          </button>
        </div>

        <form className="stack" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="display">Your display name</label>
            <input
              id="display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          {tab === 'create' ? (
            <div className="field">
              <label htmlFor="hh">Household name</label>
              <input
                id="hh"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="field">
              <label htmlFor="code">Join code</label>
              <input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                required
              />
            </div>
          )}

          {!cloud && tab === 'create' && (
            <p className="hint">
              Local mode adds a &quot;Brother&quot; person so you can tag who spent. Connect Supabase
              (see README) so both phones stay in sync.
            </p>
          )}

          {error && <p className="error">{error}</p>}
          <button className="btn block" type="submit" disabled={busy}>
            {busy ? 'Working…' : tab === 'create' ? 'Create household' : 'Join household'}
          </button>
        </form>
      </div>
    </div>
  )
}
