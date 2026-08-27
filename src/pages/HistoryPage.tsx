import { useMemo, useState } from 'react'
import { ExpenseList } from '../components/ExpenseList'
import { useApp } from '../context/AppContext'
import { expensesInMonth, spendByCategory, spendByMember, sumExpenses } from '../lib/analytics'
import {
  formatNaira,
  formatYearMonth,
  shiftYearMonth,
  yearMonthFromDate,
} from '../lib/format'

export function HistoryPage() {
  const { expenses, members, budgets, deleteExpense } = useApp()
  const [ym, setYm] = useState(yearMonthFromDate())
  const monthExpenses = useMemo(() => expensesInMonth(expenses, ym), [expenses, ym])
  const budget = budgets.find((b) => b.year_month === ym)?.amount_ngn ?? 0
  const spent = sumExpenses(monthExpenses)
  const byCat = spendByCategory(expenses, ym)
  const byPerson = spendByMember(expenses, ym, members)

  return (
    <div className="stack">
      <div className="row space-between">
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-sub">{formatYearMonth(ym)}</p>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn secondary"
            onClick={() => setYm((v) => shiftYearMonth(v, -1))}
          >
            ←
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => setYm((v) => shiftYearMonth(v, 1))}
          >
            →
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <h3>Spent</h3>
          <p>{formatNaira(spent, true)}</p>
        </div>
        <div className="stat-card">
          <h3>Budget</h3>
          <p>{budget ? formatNaira(budget, true) : '—'}</p>
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

      <section className="panel flat stack">
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>All expenses</h2>
        <ExpenseList
          expenses={monthExpenses}
          members={members}
          onDelete={(id) => void deleteExpense(id)}
        />
      </section>
    </div>
  )
}
