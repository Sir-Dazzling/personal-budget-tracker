import { useMemo, useState } from 'react'
import { ExpenseList } from '../components/ExpenseList'
import { useApp } from '../context/AppContext'
import {
  expensesInMonth,
  expensesOnDate,
  monthSummary,
  spendByCategory,
  spendByMember,
  sumExpenses,
} from '../lib/analytics'
import {
  defaultBudgetMonth,
  defaultDateInMonth,
  formatDayLabel,
  formatNaira,
  formatYearMonth,
  shiftDateISO,
  shiftYearMonth,
} from '../lib/format'

export function HistoryPage() {
  const { expenses, members, budgets, deleteExpense } = useApp()
  const [mode, setMode] = useState<'month' | 'day'>('month')
  const [ym, setYm] = useState(defaultBudgetMonth)
  const [day, setDay] = useState(() => defaultDateInMonth(defaultBudgetMonth()))

  const monthExpenses = useMemo(() => expensesInMonth(expenses, ym), [expenses, ym])
  const dayExpenses = useMemo(() => expensesOnDate(expenses, day), [expenses, day])
  const summary = useMemo(() => monthSummary(expenses, ym, budgets), [expenses, ym, budgets])
  const monthSpent = sumExpenses(monthExpenses)
  const daySpent = sumExpenses(dayExpenses)
  const byCat = spendByCategory(expenses, ym)
  const byPerson = spendByMember(expenses, ym, members)

  const daysWithSpend = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of monthExpenses) {
      map.set(e.spent_on, (map.get(e.spent_on) ?? 0) + e.amount_ngn)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, amount]) => ({ date, amount }))
  }, [monthExpenses])

  return (
    <div className="stack">
      <div className="row space-between">
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-sub">
            {mode === 'month' ? formatYearMonth(ym) : formatDayLabel(day)}
          </p>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn secondary"
            aria-label={mode === 'month' ? 'Previous month' : 'Previous day'}
            onClick={() =>
              mode === 'month'
                ? setYm((v) => shiftYearMonth(v, -1))
                : setDay((v) => shiftDateISO(v, -1))
            }
          >
            ←
          </button>
          <button
            type="button"
            className="btn secondary"
            aria-label={mode === 'month' ? 'Next month' : 'Next day'}
            onClick={() =>
              mode === 'month'
                ? setYm((v) => shiftYearMonth(v, 1))
                : setDay((v) => shiftDateISO(v, 1))
            }
          >
            →
          </button>
        </div>
      </div>

      <div className="segmented">
        <button
          type="button"
          className={mode === 'month' ? 'active' : ''}
          onClick={() => setMode('month')}
        >
          Month
        </button>
        <button
          type="button"
          className={mode === 'day' ? 'active' : ''}
          onClick={() => {
            setMode('day')
            setDay(defaultDateInMonth(ym))
          }}
        >
          Day
        </button>
      </div>

      {mode === 'month' ? (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <h3>Income</h3>
              <p>{summary.income ? formatNaira(summary.income, true) : '—'}</p>
            </div>
            <div className="stat-card">
              <h3>Spent</h3>
              <p>{formatNaira(monthSpent, true)}</p>
            </div>
            <div className="stat-card">
              <h3>Net</h3>
              <p>{summary.income ? formatNaira(summary.netIncome, true) : '—'}</p>
            </div>
            <div className="stat-card">
              <h3>Expected</h3>
              <p>{summary.budget ? formatNaira(summary.budget, true) : '—'}</p>
            </div>
          </div>

          <section className="panel stack">
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>By category</h2>
            {byCat.length === 0 && <p className="hint">No spend this month.</p>}
            {byCat.map((c) => (
              <div key={c.category} className="row space-between">
                <span>{c.category}</span>
                <strong>{formatNaira(c.amount)}</strong>
              </div>
            ))}
          </section>

          <section className="panel stack">
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>By person</h2>
            {byPerson.map((p) => (
              <div key={p.id} className="row space-between">
                <span className="badge dot" style={{ color: p.color }}>
                  {p.name}
                </span>
                <strong>{formatNaira(p.amount)}</strong>
              </div>
            ))}
          </section>

          <section className="panel stack">
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Days with spending</h2>
            {daysWithSpend.length === 0 && <p className="hint">No days logged yet.</p>}
            {daysWithSpend.map((d) => (
              <button
                key={d.date}
                type="button"
                className="row space-between"
                style={{
                  width: '100%',
                  border: '1px solid var(--line)',
                  background: '#fff',
                  borderRadius: 12,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onClick={() => {
                  setDay(d.date)
                  setMode('day')
                }}
              >
                <span>{formatDayLabel(d.date)}</span>
                <strong>{formatNaira(d.amount)}</strong>
              </button>
            ))}
          </section>

          <section className="panel flat stack">
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>All expenses</h2>
            <ExpenseList
              expenses={monthExpenses}
              members={members}
              onDelete={(id) => void deleteExpense(id)}
            />
          </section>
        </>
      ) : (
        <>
          <div className="field panel" style={{ margin: 0 }}>
            <label htmlFor="day-pick">Pick a day</label>
            <input
              id="day-pick"
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <h3>Spent today</h3>
              <p>{formatNaira(daySpent, true)}</p>
            </div>
            <div className="stat-card">
              <h3>Entries</h3>
              <p>{dayExpenses.length}</p>
            </div>
          </div>

          <section className="panel flat stack">
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Expenses this day</h2>
            <ExpenseList
              expenses={dayExpenses}
              members={members}
              onDelete={(id) => void deleteExpense(id)}
            />
          </section>
        </>
      )}
    </div>
  )
}
