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
}: {
  label: string
  remaining: number
  spent: number
  budget: number
  carryover?: number
  /** Ceiling for progress / remaining (budget + carryover). Defaults to budget. */
  totalAvailable?: number
  status: BudgetStatus
}) {
  const available = totalAvailable ?? budget + carryover
  const over = remaining < 0
  const ratio = available > 0 ? Math.min(spent / available, 1.2) : 0
  const width = `${Math.min(ratio * 100, 100)}%`

  return (
    <section className={`panel hero-panel status-${status}`}>
      <p className="hero-label">{label}</p>
      <h2 className="hero-amount">
        {budget <= 0 && carryover <= 0
          ? 'Set a budget'
          : over
            ? `${formatNaira(Math.abs(remaining))} over`
            : `${formatNaira(remaining)} left`}
      </h2>
      <p className="hero-meta">
        {available > 0
          ? `Spent ${formatNaira(spent)} of ${formatNaira(available)}`
          : 'Add a monthly budget to track pace'}
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
    </section>
  )
}
