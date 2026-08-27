import { formatNaira } from '../lib/format'
import type { Expense, Member } from '../types'

export function ExpenseList({
  expenses,
  members,
  onDelete,
}: {
  expenses: Expense[]
  members: Member[]
  onDelete?: (id: string) => void
}) {
  if (!expenses.length) {
    return <div className="empty">No expenses yet. Add one in a few taps.</div>
  }

  const nameOf = (id: string) => members.find((m) => m.id === id)?.display_name ?? 'Someone'
  const colorOf = (id: string) => members.find((m) => m.id === id)?.color ?? '#0d4f3c'

  return (
    <div className="list">
      {expenses.map((e) => (
        <article key={e.id} className="expense-item">
          <div className="title">{e.category}</div>
          <div className="amount">{formatNaira(e.amount_ngn)}</div>
          <div className="meta">
            <span className="badge dot" style={{ color: colorOf(e.spent_by) }}>
              {nameOf(e.spent_by)}
            </span>
            {' · '}
            {e.spent_on}
            {e.note ? ` · ${e.note}` : ''}
            {onDelete && (
              <>
                {' · '}
                <button
                  type="button"
                  className="btn secondary"
                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  onClick={() => onDelete(e.id)}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
