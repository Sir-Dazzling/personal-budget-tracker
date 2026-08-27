import type { BudgetStatus, Category } from '../types'

export const CATEGORIES: Category[] = [
  'Food',
  'Transport',
  'Rent/Bills',
  'Airtime/Data',
  'Fun',
  'Shopping',
  'Other',
]

export const MEMBER_COLORS = ['#0d4f3c', '#1a6b52', '#c45c26', '#2c5f8a'] as const

export function formatNaira(amount: number, compact = false): string {
  const value = Math.round(amount)
  if (compact && Math.abs(value) >= 1_000_000) {
    return `₦${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}m`
  }
  if (compact && Math.abs(value) >= 10_000) {
    return `₦${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}k`
  }
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function yearMonthFromDate(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Tracking starts September 2026 — before that, open on September. */
export const TRACKING_START_MONTH = '2026-09'

export function defaultBudgetMonth(date = new Date()): string {
  const current = yearMonthFromDate(date)
  return current < TRACKING_START_MONTH ? TRACKING_START_MONTH : current
}

/** Prefer today if it falls in `ym`; otherwise the 1st of that month. */
export function defaultDateInMonth(ym: string, date = new Date()): string {
  const current = yearMonthFromDate(date)
  if (current === ym) return todayISO(date)
  return `${ym}-01`
}

/** True while the calendar is still before September — early spend counts toward Sept budget. */
export function isForcedIntoTrackingMonth(date = new Date()): boolean {
  return yearMonthFromDate(date) < TRACKING_START_MONTH
}

export function shiftDateISO(dateISO: string, deltaDays: number): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + deltaDays)
  return todayISO(dt)
}

export function formatDayLabel(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function todayISO(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseYearMonth(ym: string): Date {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

export function formatYearMonth(ym: string): string {
  return parseYearMonth(ym).toLocaleDateString('en-NG', {
    month: 'long',
    year: 'numeric',
  })
}

export function shiftYearMonth(ym: string, delta: number): string {
  const d = parseYearMonth(ym)
  d.setMonth(d.getMonth() + delta)
  return yearMonthFromDate(d)
}

export function daysInMonth(ym: string): number {
  const d = parseYearMonth(ym)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

export function dayOfMonth(date = new Date()): number {
  return date.getDate()
}

export function budgetStatus(spent: number, budget: number): BudgetStatus {
  if (budget <= 0) return 'none'
  const ratio = spent / budget
  if (ratio > 1) return 'over'
  if (ratio >= 0.8) return 'warn'
  return 'ok'
}

export function uid(): string {
  return crypto.randomUUID()
}
