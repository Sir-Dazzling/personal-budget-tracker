import { useEffect, useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { carryoverInto, monthSummary } from '../lib/analytics'
import {
  defaultBudgetMonth,
  formatNaira,
  formatYearMonth,
  shiftYearMonth,
} from '../lib/format'

export function BudgetPage() {
  const { budgets, expenses, setBudget, members, renameMember, household, cloud } = useApp()
  const [ym, setYm] = useState(defaultBudgetMonth)
  const row = budgets.find((b) => b.year_month === ym)
  const carryIn = carryoverInto(expenses, ym, budgets)
  const live = monthSummary(expenses, ym, budgets)
  const [income, setIncome] = useState(row?.income_ngn ? String(row.income_ngn) : '')
  const [expected, setExpected] = useState(row?.amount_ngn ? String(row.amount_ngn) : '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const b = budgets.find((x) => x.year_month === ym)
    setIncome(b?.income_ngn ? String(b.income_ngn) : '')
    setExpected(b?.amount_ngn ? String(b.amount_ngn) : '')
    setMessage('')
    setError('')
  }, [ym, budgets])

  const incomeN = Math.round(Number(String(income).replace(/,/g, ''))) || 0
  const expectedN = Math.round(Number(String(expected).replace(/,/g, ''))) || 0
  const plannedNet =
    (Number.isFinite(incomeN) && incomeN >= 0 ? incomeN : 0) -
    (Number.isFinite(expectedN) && expectedN >= 0 ? expectedN : 0) +
    carryIn
  const liveNet = incomeN - live.spent + carryIn

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    const inc = Math.round(Number(String(income).replace(/,/g, '')))
    const exp = Math.round(Number(String(expected).replace(/,/g, '')))
    if (!Number.isFinite(inc) || inc < 0 || !Number.isFinite(exp) || exp < 0) {
      setError('Enter valid amounts (0 or more)')
      return
    }
    setBusy(true)
    try {
      await setBudget(ym, exp, inc)
      setMessage(
        `Saved for ${formatYearMonth(ym)} · Planned net ${formatNaira(inc - exp + carryIn)} · Live net ${formatNaira(inc - live.spent + carryIn)}`,
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
          <p className="page-sub">Income and expected expenses for each month.</p>
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
        <p className="hint" style={{ margin: 0 }}>
          {formatYearMonth(ym)}
        </p>

        <div className="field">
          <label htmlFor="income">Income received (₦)</label>
          <input
            id="income"
            inputMode="numeric"
            placeholder="500000"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
          />
          <span className="hint">What came in this month</span>
        </div>

        <div className="field">
          <label htmlFor="expected">Expected expenses (₦)</label>
          <input
            id="expected"
            inputMode="numeric"
            placeholder="200000"
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
          />
          <span className="hint">Spending ceiling — overspend is tracked against this only</span>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <h3>Planned net</h3>
            <p>{formatNaira(plannedNet, true)}</p>
          </div>
          <div className="stat-card">
            <h3>Live net</h3>
            <p>{formatNaira(liveNet, true)}</p>
          </div>
        </div>

        {carryIn > 0 && (
          <p className="hint" style={{ margin: 0 }}>
            Saved from last month: <strong>{formatNaira(carryIn)}</strong> — added to net, not
            expected spend
          </p>
        )}

        {error && <p className="error">{error}</p>}
        {message && (
          <p className="hint" style={{ color: 'var(--ok)' }}>
            {message}
          </p>
        )}
        <button className="btn block" type="submit" disabled={busy}>
          {busy ? 'Saving…' : `Save ${formatYearMonth(ym)} plan`}
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
