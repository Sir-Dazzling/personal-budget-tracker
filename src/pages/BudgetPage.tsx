import { useEffect, useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { carryoverInto } from '../lib/analytics'
import {
  defaultBudgetMonth,
  formatNaira,
  formatYearMonth,
  shiftYearMonth,
} from '../lib/format'

export function BudgetPage() {
  const { budgets, expenses, setBudget, members, renameMember, household, cloud } = useApp()
  const [ym, setYm] = useState(defaultBudgetMonth)
  const saved = budgets.find((b) => b.year_month === ym)?.amount_ngn ?? 0
  const carryIn = carryoverInto(expenses, ym, budgets)
  const [amount, setAmount] = useState(saved ? String(saved) : '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const next = budgets.find((b) => b.year_month === ym)?.amount_ngn ?? 0
    setAmount(next ? String(next) : '')
    setMessage('')
    setError('')
  }, [ym, budgets])

  const plannedBudget = Math.round(Number(String(amount).replace(/,/g, ''))) || 0
  const totalAvailable =
    (Number.isFinite(plannedBudget) && plannedBudget >= 0 ? plannedBudget : 0) + carryIn

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    const n = Math.round(Number(String(amount).replace(/,/g, '')))
    if (!Number.isFinite(n) || n < 0) {
      setError('Enter a valid budget amount')
      return
    }
    setBusy(true)
    try {
      await setBudget(ym, n)
      const available = n + carryIn
      setMessage(
        carryIn > 0
          ? `Budget for ${formatYearMonth(ym)} set to ${formatNaira(n)} · ${formatNaira(available)} total with carryover`
          : `Budget for ${formatYearMonth(ym)} set to ${formatNaira(n)}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <div className="row space-between">
        <div>
          <h1 className="page-title">Budget</h1>
          <p className="page-sub">Set a ceiling for any month in Naira.</p>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn secondary"
            aria-label="Previous month"
            onClick={() => setYm((v) => shiftYearMonth(v, -1))}
          >
            ←
          </button>
          <button
            type="button"
            className="btn secondary"
            aria-label="Next month"
            onClick={() => setYm((v) => shiftYearMonth(v, 1))}
          >
            →
          </button>
        </div>
      </div>

      <form className="panel stack" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="budget">{formatYearMonth(ym)}</label>
          <input
            id="budget"
            inputMode="numeric"
            placeholder="200000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <span className="hint">Example: 200000 for ₦200,000 · Use arrows to change month</span>
        </div>
        {carryIn > 0 && (
          <p className="hint" style={{ margin: 0 }}>
            Expected carry-in from last month: <strong>{formatNaira(carryIn)}</strong>
            {Number.isFinite(plannedBudget) && plannedBudget >= 0 && (
              <>
                {' '}
                · Total available: <strong>{formatNaira(totalAvailable)}</strong>
              </>
            )}
          </p>
        )}
        {error && <p className="error">{error}</p>}
        {message && (
          <p className="hint" style={{ color: 'var(--ok)' }}>
            {message}
          </p>
        )}
        <button className="btn block" type="submit" disabled={busy}>
          {busy ? 'Saving…' : `Save ${formatYearMonth(ym)} budget`}
        </button>
      </form>

      <section className="panel stack">
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>People</h2>
        {members.map((m) => (
          <div key={m.id} className="field">
            <label htmlFor={`m-${m.id}`}>{m.display_name}</label>
            <input
              id={`m-${m.id}`}
              defaultValue={m.display_name}
              onBlur={(e) => {
                const v = e.target.value.trim()
                if (v && v !== m.display_name) void renameMember(m.id, v)
              }}
            />
          </div>
        ))}
        <p className="hint">
          Household: <strong>{household?.name}</strong>
          {cloud && (
            <>
              {' '}
              · Join code <strong>{household?.join_code}</strong>
            </>
          )}
        </p>
      </section>
    </div>
  )
}
