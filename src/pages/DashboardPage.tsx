import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useApp } from '../context/AppContext'
import {
  behaviourHighlights,
  budgetPace,
  monthSummary,
  spendByCategory,
  spendByDay,
  spendByMember,
} from '../lib/analytics'
import {
  defaultBudgetMonth,
  formatNaira,
  formatYearMonth,
  shiftYearMonth,
} from '../lib/format'

const CAT_COLORS = ['#0d4f3c', '#1a6b52', '#2c5f8a', '#c45c26', '#7a5c3a', '#4a6356', '#8aa899']

export function DashboardPage() {
  const { expenses, members, budgets } = useApp()
  const [ym, setYm] = useState(defaultBudgetMonth)
  const summary = monthSummary(expenses, ym, budgets)
  const daily = useMemo(() => spendByDay(expenses, ym), [expenses, ym])
  const byCat = useMemo(() => spendByCategory(expenses, ym), [expenses, ym])
  const byPerson = useMemo(() => spendByMember(expenses, ym, members), [expenses, ym, members])
  const pace = budgetPace(summary.spent, summary.totalAvailable, ym)
  const cards = behaviourHighlights(expenses, ym, budgets)

  const paceLabel =
    pace.label === 'ahead'
      ? 'Ahead of pace'
      : pace.label === 'under'
        ? 'Under pace'
        : pace.label === 'on_track'
          ? 'On track'
          : 'No budget set'

  return (
    <div className="stack">
      <div className="row space-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Stats & spending behaviour · {formatYearMonth(ym)}</p>
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
          <h3>Income</h3>
          <p>{summary.income ? formatNaira(summary.income, true) : '—'}</p>
        </div>
        <div className="stat-card">
          <h3>Spent</h3>
          <p>{formatNaira(summary.spent, true)}</p>
        </div>
        <div className="stat-card">
          <h3>Net</h3>
          <p>{formatNaira(summary.netIncome, true)}</p>
        </div>
        <div className="stat-card">
          <h3>Pace</h3>
          <p style={{ fontSize: '1.05rem' }}>{paceLabel}</p>
        </div>
      </div>

      {summary.totalAvailable > 0 && (
        <section className="panel stack">
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Budget pace</h2>
          <p className="page-sub">
            Expected by today ~ {formatNaira(Math.round(pace.expected))} · Actual{' '}
            {formatNaira(summary.spent)}
            {summary.carryover > 0
              ? ` · ${formatNaira(summary.carryover)} saved from last month (in net)`
              : ''}
          </p>
          <div className="progress" style={{ background: 'var(--bg-deep)', marginTop: 0 }}>
            <span
              style={{
                width: `${Math.min(pace.percentBudget * 100, 100)}%`,
                background:
                  pace.label === 'ahead'
                    ? 'var(--warn)'
                    : pace.label === 'under'
                      ? 'var(--ok)'
                      : 'var(--brand)',
              }}
            />
          </div>
        </section>
      )}

      <section className="panel stack">
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Spend over time</h2>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,36,28,0.08)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip
                formatter={(value) => formatNaira(Number(value ?? 0))}
                labelFormatter={(d) => `Day ${d}`}
              />
              <Bar dataKey="amount" fill="#0d4f3c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="desktop-split">
        <section className="panel stack">
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>By category</h2>
          {byCat.length === 0 ? (
            <p className="hint">Add expenses to see the split.</p>
          ) : (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCat}
                    dataKey="amount"
                    nameKey="category"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {byCat.map((_, i) => (
                      <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatNaira(Number(value ?? 0))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {byCat.slice(0, 4).map((c) => (
            <div key={c.category} className="row space-between">
              <span>{c.category}</span>
              <strong>{formatNaira(c.amount)}</strong>
            </div>
          ))}
        </section>

        <section className="panel stack">
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>By person</h2>
          <div className="chart-wrap" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byPerson} layout="vertical" margin={{ left: 12 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatNaira(Number(value ?? 0))} />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                  {byPerson.map((p) => (
                    <Cell key={p.id} fill={p.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="panel stack">
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Behaviour</h2>
        {cards.length === 0 && <p className="hint">Not enough data yet — keep logging.</p>}
        <div className="stat-grid">
          {cards.map((c) => (
            <div key={c.title} className="stat-card">
              <h3>{c.title}</h3>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.95rem', fontWeight: 600 }}>
                {c.detail}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
