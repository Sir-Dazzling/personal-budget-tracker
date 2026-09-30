import { useNavigate } from 'react-router-dom'
import { formatNaira } from '../lib/format'
import type { Expense, Member } from '../types'
import { SwipeableExpenseRow } from './SwipeableExpenseRow'

export function ExpenseList({
  expenses,
  members,
  onDelete,
}: {
  expenses: Expense[]
  members: Member[]
  onDelete?: (id: string) => void | Promise<void>
}) {
  const navigate = useNavigate()

  if (!expenses.length) {
    return <div className="empty">No expenses yet. Add one in a few taps.</div>
  }

  const nameOf = (id: string) => members.find((m) => m.id === id)?.display_name ?? 'Someone'
  const colorOf = (id: string) => members.find((m) => m.id === id)?.color ?? '#0d4f3c'

  async function handleDelete(id: string) {
    if (!onDelete) return
    if (!window.confirm('Delete this expense?')) return
    try {
      await onDelete(id)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete expense')
    }
  }

  return (
    <div className="list">
      {expenses.map((e) => {
        const content = (
          <>
            <div className="title">{e.category}</div>
            <div className="amount">{formatNaira(e.amount_ngn)}</div>
            <div className="meta">
              <span className="badge dot" style={{ color: colorOf(e.spent_by) }}>
                {nameOf(e.spent_by)}
              </span>
              {' · '}
              {e.spent_on}
              {e.note ? ` · ${e.note}` : ''}
            </div>
          </>
        )

        if (!onDelete) {
          return (
            <article key={e.id} className="expense-item-static">
              {content}
            </article>
          )
        }

        return (
          <SwipeableExpenseRow
            key={e.id}
            onEdit={() => navigate(`/add/${e.id}`)}
            onDelete={() => void handleDelete(e.id)}
          >
            {content}
          </SwipeableExpenseRow>
        )
      })}
      {onDelete && (
        <p className="hint swipe-hint">Swipe left on an expense to edit or delete.</p>
      )}
    </div>
  )
}
