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
  /**
   * Legacy single income total (pre income-ledger).
   * Used only when there are no income entries for the month.
   */
  income_ngn: number
  /** Cash on hand at the start of the month. */
  starting_balance_ngn: number
  /**
   * When true (default), unused expected from last month is added to this month's net.
   * Turn off to start fresh without past-month savings.
   */
  include_prior_savings: boolean
}

export interface IncomeEntry {
  id: string
  household_id: string
  amount_ngn: number
  note: string
  received_on: string
  created_by: string
  created_at: string
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
  /** Starting balance for the month. */
  startingBalance: number
  /** Income entries this month (excludes starting balance). */
  incomeAdded: number
  /** startingBalance + incomeAdded (legacy income_ngn if no entries). */
  income: number
  /** income − actual spent + prior-month unused expected (savings). */
  netIncome: number
  /** income − expected expenses + prior-month savings (planned leftover). */
  plannedNet: number
  /** Unused expected from the previous month — adds to net when include_prior_savings is on. */
  carryover: number
  /** Whether this month includes prior savings in net. */
  includePriorSavings: boolean
  /** Same as budget — spend ceiling for remaining / pace / status (no carryover). */
  totalAvailable: number
  spent: number
  remaining: number
  ratio: number
  status: BudgetStatus
}
