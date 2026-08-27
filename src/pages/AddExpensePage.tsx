import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  CATEGORIES,
  TRACKING_START_MONTH,
  formatNaira,
  formatYearMonth,
  isForcedIntoTrackingMonth,
  todayISO,
} from '../lib/format'

export function AddExpensePage() {
  const { members, myMember, addExpense } = useApp()
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [note, setNote] = useState('')
  const [spentBy, setSpentBy] = useState('')
  const [spentOn, setSpentOn] = useState(() => todayISO())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const countsTowardSept = isForcedIntoTrackingMonth()

  useEffect(() => {
    if (!spentBy) {
      const id = myMember?.id ?? members[0]?.id
      if (id) setSpentBy(id)
    }
  }, [spentBy, myMember, members])

  const parsed = useMemo(() => {
    const n = Number(String(amount).replace(/,/g, ''))
    return Number.isFinite(n) ? Math.round(n) : 0
  }, [amount])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (parsed <= 0) {
      setError('Enter an amount greater than zero')
      return
    }
    if (!spentBy) {
      setError('Pick who spent it')
      return
    }
    setBusy(true)
    try {
      await addExpense({
        amount_ngn: parsed,
        category,
        note: note.trim(),
        spent_by: spentBy,
        spent_on: spentOn,
      })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Add expense</h1>
        <p className="page-sub">Quick entry — amount, category, who paid.</p>
      </div>

      <form className="panel stack" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="amount">Amount (₦)</label>
          <input
            id="amount"
            inputMode="numeric"
            placeholder="5000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            required
          />
          {parsed > 0 && <span className="hint">{formatNaira(parsed)}</span>}
        </div>

        <div className="field">
          <label>Category</label>
          <div className="chip-row">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip ${category === c ? 'active' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Who spent</label>
          <div className="chip-row">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`chip ${spentBy === m.id ? 'active' : ''}`}
                onClick={() => setSpentBy(m.id)}
                style={spentBy === m.id ? { background: m.color, borderColor: m.color } : undefined}
              >
                {m.display_name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            value={spentOn}
            onChange={(e) => setSpentOn(e.target.value)}
            required
          />
          {countsTowardSept && (
            <span className="hint">
              Kept as {spentOn}, but counts toward{' '}
              <strong>{formatYearMonth(TRACKING_START_MONTH)}</strong> until September starts.
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="note">Note (optional)</label>
          <input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Uber to office"
          />
        </div>

        {error && <p className="error">{error}</p>}
        <button className="btn block" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save expense'}
        </button>
      </form>
    </div>
  )
}
