export type Category =
  | 'Food'
  | 'Transport'
  | 'Rent/Bills'
  | 'Airtime/Data'
  | 'Fun'
  | 'Shopping'
  | 'Other'

export interface Profile {
  id: string
  display_name: string
}

export interface Household {
  id: string
  name: string
  join_code: string
  created_by: string
}

export interface Member {
  id: string
  household_id: string
  user_id: string
  display_name: string
  color: string
}

export interface MonthlyBudget {
  id: string
  household_id: string
  year_month: string
  /** Expected expenses ceiling for the month. */
  amount_ngn: number
  /** Income received for the month. */
  income_ngn: number
}

export interface Expense {
  id: string
  household_id: string
  amount_ngn: number
  category: Category | string
  note: string
  spent_by: string
  spent_on: string
  created_by: string
  created_at: string
}

export type BudgetStatus = 'ok' | 'warn' | 'over' | 'none'

export interface MonthSummary {
  yearMonth: string
  /** Expected expenses set for this month (excludes carryover). */
  budget: number
  /** Income received this month. */
  income: number
  /** income − actual spent + prior-month unused expected (savings). */
  netIncome: number
  /** income − expected expenses + prior-month savings (planned leftover). */
  plannedNet: number
  /** Unused expected from the previous month — adds to net, not the spend ceiling. */
  carryover: number
  /** Same as budget — spend ceiling for remaining / pace / status (no carryover). */
  totalAvailable: number
  spent: number
  remaining: number
  ratio: number
  status: BudgetStatus
}
