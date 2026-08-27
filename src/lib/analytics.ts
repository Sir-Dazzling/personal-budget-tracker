import type { Expense, MonthSummary, MonthlyBudget } from '../types'
import {
  TRACKING_START_MONTH,
  budgetStatus,
  dayOfMonth,
  daysInMonth,
  formatYearMonth,
  shiftYearMonth,
  yearMonthFromDate,
} from './format'

export function expensesOnDate(expenses: Expense[], dateISO: string): Expense[] {
  return expenses.filter((e) => e.spent_on === dateISO)
}

export function expensesInMonth(expenses: Expense[], yearMonth: string): Expense[] {
  return expenses.filter((e) => e.spent_on.startsWith(yearMonth))
}

export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + e.amount_ngn, 0)
}

type BudgetLookup = ((ym: string) => number) | Pick<MonthlyBudget, 'year_month' | 'amount_ngn'>[]

function resolveBudget(budgets: BudgetLookup, ym: string): number {
  if (typeof budgets === 'function') return budgets(ym)
  return budgets.find((b) => b.year_month === ym)?.amount_ngn ?? 0
}

function earliestRelevantMonth(
  expenses: Expense[],
  budgets: BudgetLookup,
  beforeYm: string,
): string | null {
  const months: string[] = []
  for (const e of expenses) {
    const ym = e.spent_on.slice(0, 7)
    if (ym < beforeYm && ym >= TRACKING_START_MONTH) months.push(ym)
  }
  if (typeof budgets !== 'function') {
    for (const b of budgets) {
      if (b.year_month < beforeYm && b.year_month >= TRACKING_START_MONTH) {
        months.push(b.year_month)
      }
    }
  }
  if (months.length === 0) return null
  months.sort()
  return months[0] ?? null
}

/**
 * Unused balance carried into `yearMonth` from prior months.
 * Nothing carries into the tracking start month (September 2026) — August is ignored.
 */
export function carryoverInto(
  expenses: Expense[],
  yearMonth: string,
  budgets: BudgetLookup,
): number {
  if (yearMonth <= TRACKING_START_MONTH) return 0

  let start = earliestRelevantMonth(expenses, budgets, yearMonth)
  if (!start) return 0
  if (start < TRACKING_START_MONTH) start = TRACKING_START_MONTH

  let carry = 0
  let ym = start
  while (ym < yearMonth) {
    const budget = resolveBudget(budgets, ym)
    const spent = sumExpenses(expensesInMonth(expenses, ym))
    carry = Math.max(0, budget + carry - spent)
    ym = shiftYearMonth(ym, 1)
  }
  return carry
}

export function monthSummary(
  expenses: Expense[],
  yearMonth: string,
  budgets: BudgetLookup,
): MonthSummary {
  const budgetAmount = resolveBudget(budgets, yearMonth)
  const carryover = carryoverInto(expenses, yearMonth, budgets)
  const totalAvailable = budgetAmount + carryover
  const spent = sumExpenses(expensesInMonth(expenses, yearMonth))
  const remaining = totalAvailable - spent
  const ratio = totalAvailable > 0 ? spent / totalAvailable : 0
  return {
    yearMonth,
    budget: budgetAmount,
    carryover,
    totalAvailable,
    spent,
    remaining,
    ratio,
    status: budgetStatus(spent, totalAvailable),
  }
}

export function spendByDay(expenses: Expense[], yearMonth: string) {
  const days = daysInMonth(yearMonth)
  const map = new Map<number, number>()
  for (let i = 1; i <= days; i++) map.set(i, 0)
  for (const e of expensesInMonth(expenses, yearMonth)) {
    const day = Number(e.spent_on.slice(8, 10))
    map.set(day, (map.get(day) ?? 0) + e.amount_ngn)
  }
  return Array.from(map.entries()).map(([day, amount]) => ({ day, amount }))
}

export function spendByCategory(expenses: Expense[], yearMonth: string) {
  const map = new Map<string, number>()
  for (const e of expensesInMonth(expenses, yearMonth)) {
    map.set(e.category, (map.get(e.category) ?? 0) + e.amount_ngn)
  }
  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
}

export function spendByMember(
  expenses: Expense[],
  yearMonth: string,
  members: { id: string; display_name: string; color: string }[],
) {
  const month = expensesInMonth(expenses, yearMonth)
  return members.map((m) => ({
    id: m.id,
    name: m.display_name,
    color: m.color,
    amount: sumExpenses(month.filter((e) => e.spent_by === m.id)),
  }))
}

export type PaceLabel = 'under' | 'on_track' | 'ahead' | 'no_budget'

export function budgetPace(spent: number, budget: number, yearMonth: string) {
  if (budget <= 0) {
    return { label: 'no_budget' as PaceLabel, expected: 0, spent, percentMonth: 0, percentBudget: 0 }
  }
  const totalDays = daysInMonth(yearMonth)
  const currentYm = yearMonthFromDate()
  const day =
    yearMonth === currentYm
      ? dayOfMonth()
      : yearMonth < currentYm
        ? totalDays
        : 1
  const percentMonth = day / totalDays
  const expected = budget * percentMonth
  const percentBudget = spent / budget
  let label: PaceLabel = 'on_track'
  if (spent > expected * 1.1) label = 'ahead'
  else if (spent < expected * 0.9) label = 'under'
  return { label, expected, spent, percentMonth, percentBudget, day, totalDays }
}

export function behaviourHighlights(
  expenses: Expense[],
  yearMonth: string,
  budgets: BudgetLookup,
) {
  const summary = monthSummary(expenses, yearMonth, budgets)
  const thisMonth = expensesInMonth(expenses, yearMonth)
  const lastMonth = expensesInMonth(expenses, shiftYearMonth(yearMonth, -1))
  const spent = summary.spent
  const byCat = spendByCategory(expenses, yearMonth)
  const biggest = byCat[0]

  const lastByCat = new Map(spendByCategory(expenses, shiftYearMonth(yearMonth, -1)).map((c) => [c.category, c.amount]))
  let jumpCategory: string | null = null
  let jumpDelta = 0
  for (const c of byCat) {
    const prev = lastByCat.get(c.category) ?? 0
    const delta = c.amount - prev
    if (delta > jumpDelta) {
      jumpDelta = delta
      jumpCategory = c.category
    }
  }

  const avg = thisMonth.length ? spent / thisMonth.length : 0
  const pace = budgetPace(spent, summary.totalAvailable, yearMonth)

  const cards: { title: string; detail: string }[] = []

  if (biggest) {
    cards.push({
      title: 'Biggest category',
      detail: `${biggest.category} · ${Math.round((biggest.amount / Math.max(spent, 1)) * 100)}% of spend`,
    })
  }

  if (jumpCategory && jumpDelta > 0 && lastMonth.length > 0) {
    cards.push({
      title: 'Biggest jump vs last month',
      detail: `${jumpCategory} up by ₦${jumpDelta.toLocaleString('en-NG')}`,
    })
  }

  if (thisMonth.length) {
    cards.push({
      title: 'Average expense',
      detail: `₦${Math.round(avg).toLocaleString('en-NG')} across ${thisMonth.length} entries`,
    })
  }

  if (summary.totalAvailable > 0) {
    cards.push({
      title: 'Pace check',
      detail: `${Math.round(pace.percentBudget * 100)}% of available used · ${Math.round(pace.percentMonth * 100)}% of ${formatYearMonth(yearMonth)} gone`,
    })
  }

  return cards
}
