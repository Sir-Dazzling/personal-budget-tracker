import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { carryoverInto, incomesInMonth, monthSummary } from '../lib/analytics'
import {
  defaultBudgetMonth,
  defaultDateInMonth,
  formatNaira,
  formatYearMonth,
  shiftYearMonth,
} from '../lib/format'

export function BudgetPage() {
  const {
    budgets,
    expenses,
    incomes,
    setBudget,
    addIncome,
    deleteIncome,
    members,
    renameMember,
    household,
    cloud,
  } = useApp()
  const [ym, setYm] = useState(defaultBudgetMonth)
  const row = budgets.find((b) => b.year_month === ym)
  const carryIn = carryoverInto(expenses, ym, budgets)
  const live = monthSummary(expenses, ym, budgets, incomes)
  const monthIncomes = useMemo(() => incomesInMonth(incomes, ym), [incomes, ym])

  const [starting, setStarting] = useState(
    row?.starting_balance_ngn ? String(row.starting_balance_ngn) : '',
  )
  const [expected, setExpected] = useState(row?.amount_ngn ? String(row.amount_ngn) : '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [incAmount, setIncAmount] = useState('')
  const [incNote, setIncNote] = useState('')
  const [incDate, setIncDate] = useState(() => defaultDateInMonth(defaultBudgetMonth()))
  const [incBusy, setIncBusy] = useState(false)
  const [incError, setIncError] = useState('')
  const [incMessage, setIncMessage] = useState('')

  useEffect(() => {
    const b = budgets.find((x) => x.year_month === ym)
    setStarting(b?.starting_balance_ngn ? String(b.starting_balance_ngn) : '')
    setExpected(b?.amount_ngn ? String(b.amount_ngn) : '')
    setIncDate(defaultDateInMonth(ym))
    setMessage('')
    setError('')
    setIncError('')
    setIncMessage('')
  }, [ym, budgets])

  const startingN = Math.round(Number(String(starting).replace(/,/g, ''))) || 0
  const expectedN = Math.round(Number(String(expected).replace(/,/g, ''))) || 0
  const totalIn = live.income
  const plannedNet =
    (Number.isFinite(startingN) && startingN >= 0 ? startingN : 0) +
    live.incomeAdded -
    (Number.isFinite(expectedN) && expectedN >= 0 ? expectedN : 0) +
    carryIn
  const liveNet = totalIn - live.spent + carryIn

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    const start = Math.round(Number(String(starting).replace(/,/g, '')))
    const exp = Math.round(Number(String(expected).replace(/,/g, '')))
    if (!Number.isFinite(start) || start < 0 || !Number.isFinite(exp) || exp < 0) {
      setError('Enter valid amounts (0 or more)')
      return
    }
    setBusy(true)
    try {
      await setBudget(ym, exp, start)
      setMessage(`Saved plan for ${formatYearMonth(ym)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  async function onAddIncome(e: FormEvent) {
    e.preventDefault()
    setIncError('')
    setIncMessage('')
    const amount = Math.round(Number(String(incAmount).replace(/,/g, '')))
    if (!Number.isFinite(amount) || amount <= 0) {
      setIncError('Enter an income amount greater than zero')
      return
    }
    if (!incDate.startsWith(ym)) {
      setIncError(`Pick a date in ${formatYearMonth(ym)}`)
      return
    }
    setIncBusy(true)
    try {
      await addIncome({
        amount_ngn: amount,
        note: incNote.trim(),
        received_on: incDate,
      })
      setIncAmount('')
      setIncNote('')
      setIncMessage(`Added ${formatNaira(amount)}`)
    } catch (err) {
      setIncError(err instanceof Error ? err.message : 'Could not add income')
    } finally {
      setIncBusy(false)
    }
  }

  async function onDeleteIncome(id: string) {
    if (!window.confirm('Delete this income entry?')) return
    try {
      await deleteIncome(id)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete income')
    }
  }

  return (
    <div className="stack">
      <div className="row space-between">
        <div>
          <h1 className="page-title">Budget</h1>
          <p className="page-sub">Starting balance, expected spend, and income as it comes in.</p>
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
          <label htmlFor="starting">Starting balance (₦)</label>
          <input
            id="starting"
            inputMode="numeric"
            placeholder="400000"
            value={starting}
            onChange={(e) => setStarting(e.target.value)}
          />
          <span className="hint">Cash on hand at the start of this month</span>
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
            <h3>Total in</h3>
            <p>{formatNaira(totalIn, true)}</p>
          </div>
          <div className="stat-card">
            <h3>Live net</h3>
            <p>{formatNaira(liveNet, true)}</p>
          </div>
          <div className="stat-card">
            <h3>Planned net</h3>
            <p>{formatNaira(plannedNet, true)}</p>
          </div>
          <div className="stat-card">
            <h3>Income added</h3>
            <p>{formatNaira(live.incomeAdded, true)}</p>
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

      <form className="panel stack" onSubmit={onAddIncome}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Add income</h2>
        <p className="hint" style={{ margin: 0 }}>
          Log money as it comes in during {formatYearMonth(ym)}.
        </p>
        <div className="field">
          <label htmlFor="inc-amount">Amount (₦)</label>
          <input
            id="inc-amount"
            inputMode="numeric"
            placeholder="150000"
            value={incAmount}
            onChange={(e) => setIncAmount(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="inc-date">Date received</label>
          <input
            id="inc-date"
            type="date"
            value={incDate}
            onChange={(e) => setIncDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="inc-note">Note (optional)</label>
          <input
            id="inc-note"
            placeholder="Salary, transfer, gift…"
            value={incNote}
            onChange={(e) => setIncNote(e.target.value)}
          />
        </div>
        {incError && <p className="error">{incError}</p>}
        {incMessage && (
          <p className="hint" style={{ color: 'var(--ok)' }}>
            {incMessage}
          </p>
        )}
        <button className="btn block" type="submit" disabled={incBusy}>
          {incBusy ? 'Adding…' : 'Add income'}
        </button>

        <div className="list" style={{ marginTop: 8 }}>
          {monthIncomes.length === 0 && (
            <p className="hint" style={{ margin: 0 }}>
              {live.incomeAdded > 0
                ? `No ledger entries yet · legacy income ${formatNaira(live.incomeAdded)} still counted until you add one.`
                : 'No income entries this month yet.'}
            </p>
          )}
          {monthIncomes.map((entry) => (
            <article key={entry.id} className="expense-item-static">
              <div className="title">{entry.note || 'Income'}</div>
              <div className="amount">{formatNaira(entry.amount_ngn)}</div>
              <div className="meta row space-between">
                <span>{entry.received_on}</span>
                <button
                  type="button"
                  className="btn secondary"
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                  onClick={() => void onDeleteIncome(entry.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
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
