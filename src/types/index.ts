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
  amount_ngn: number
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
  /** Budget set for this month (excludes carryover). */
  budget: number
  /** Unused amount carried in from the previous month (never negative). */
  carryover: number
  /** budget + carryover — the ceiling used for remaining / pace / status. */
  totalAvailable: number
  spent: number
  remaining: number
  ratio: number
  status: BudgetStatus
}
