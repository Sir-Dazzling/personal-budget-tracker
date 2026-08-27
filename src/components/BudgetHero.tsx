import { Link } from 'react-router-dom'
import { formatNaira } from '../lib/format'
import type { BudgetStatus } from '../types'

export function BudgetHero({
  label,
  remaining,
  spent,
  budget,
  carryover = 0,
  totalAvailable,
  status,
  income = 0,
  netIncome,
}: {
  label: string
  remaining: number
  spent: number
  budget: number
  carryover?: number
  totalAvailable?: number
  status: BudgetStatus
  income?: number
  netIncome?: number
}) {
  const available = totalAvailable ?? budget + carryover
  const over = remaining < 0
  const ratio = available > 0 ? Math.min(spent / available, 1.2) : 0
  const width = `${Math.min(ratio * 100, 100)}%`
  const net = netIncome ?? income - spent

  return (
    <section className={`panel hero-panel status-${status}`}>
      <p className="hero-label">{label}</p>
      <h2 className="hero-amount">
        {budget <= 0 && carryover <= 0
          ? 'Set expected expenses'
          : over
            ? `${formatNaira(Math.abs(remaining))} over`
            : `${formatNaira(remaining)} left`}
      </h2>
      <p className="hero-meta">
        {available > 0
          ? `Spent ${formatNaira(spent)} of ${formatNaira(available)} expected`
          : 'Add expected expenses to track overspend'}
      </p>
      {carryover > 0 && (
        <p className="hero-meta" style={{ marginTop: '0.35rem', opacity: 0.85 }}>
          Includes {formatNaira(carryover)} carried from last month
        </p>
      )}
      {available > 0 && (
        <div className="progress" aria-hidden>
          <span style={{ width }} />
        </div>
      )}

      <div className="income-strip">
        <div>
          <span className="income-strip-label">Income</span>
          <strong>{income > 0 ? formatNaira(income) : '—'}</strong>
        </div>
        <div>
          <span className="income-strip-label">Spent</span>
          <strong>{formatNaira(spent)}</strong>
        </div>
        <div>
          <span className="income-strip-label">Net</span>
          <strong className={net < 0 ? 'text-over' : ''}>{formatNaira(net)}</strong>
        </div>
      </div>

      {income <= 0 && (
        <p className="hero-meta" style={{ marginTop: '0.75rem' }}>
          <Link to="/budget" style={{ color: 'inherit', textDecoration: 'underline' }}>
            Set income
          </Link>{' '}
          to see net after spending
        </p>
      )}
    </section>
  )
}
