import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BudgetHero } from '../components/BudgetHero'
import { ExpenseList } from '../components/ExpenseList'
import { useApp } from '../context/AppContext'
import { expensesInMonth, monthSummary } from '../lib/analytics'
import {
  defaultBudgetMonth,
  formatYearMonth,
  shiftYearMonth,
} from '../lib/format'

export function HomePage() {
  const { household, members, budgets, expenses, deleteExpense, signOut, cloud } = useApp()
  const [ym, setYm] = useState(defaultBudgetMonth)
  const summary = monthSummary(expenses, ym, budgets)
  const recent = expensesInMonth(expenses, ym).slice(0, 8)

  return (
    <div className="stack">
      <div className="row space-between">
        <div>
          <h1 className="page-title">{household?.name ?? 'This month'}</h1>
          <p className="page-sub">{formatYearMonth(ym)}</p>
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
          <button type="button" className="btn secondary" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </div>

      <BudgetHero
        label={
          summary.status === 'over'
            ? 'Over budget'
            : summary.status === 'warn'
              ? 'Getting close'
              : 'Remaining'
        }
        remaining={summary.remaining}
        spent={summary.spent}
        budget={summary.budget}
        carryover={summary.carryover}
        totalAvailable={summary.totalAvailable}
        status={summary.status}
      />

      <Link to="/add" className="btn fab">
        + Add expense
      </Link>

      <section className="panel flat stack">
        <div className="row space-between">
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Recent</h2>
          <Link to="/history" className="hint">
            See all
          </Link>
        </div>
        <ExpenseList
          expenses={recent}
          members={members}
          onDelete={(id) => void deleteExpense(id)}
        />
      </section>

      {!cloud && (
        <p className="hint">
          Tip: share the join code <strong>{household?.join_code}</strong> after you connect
          Supabase so your brother can sync from his phone.
        </p>
      )}
    </div>
  )
}
