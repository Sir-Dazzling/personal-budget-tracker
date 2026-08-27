import type { Expense, Household, Member, MonthlyBudget } from '../types'
import { MEMBER_COLORS, uid, yearMonthFromDate } from './format'

const KEY = 'split-local-v1'

export interface LocalState {
  mode: 'local'
  session: { userId: string; email: string; displayName: string } | null
  household: Household | null
  members: Member[]
  budgets: MonthlyBudget[]
  expenses: Expense[]
}

function empty(): LocalState {
  return {
    mode: 'local',
    session: null,
    household: null,
    members: [],
    budgets: [],
    expenses: [],
  }
}

export function loadLocal(): LocalState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    return { ...empty(), ...JSON.parse(raw) }
  } catch {
    return empty()
  }
}

export function saveLocal(state: LocalState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function localSignUp(email: string, displayName: string): LocalState {
  const state = loadLocal()
  const userId = uid()
  state.session = { userId, email, displayName }
  saveLocal(state)
  return state
}

export function localSignIn(email: string, displayName?: string): LocalState {
  const state = loadLocal()
  if (state.session?.email === email) {
    return state
  }
  return localSignUp(email, displayName || email.split('@')[0] || 'You')
}

export function localSignOut() {
  const state = loadLocal()
  state.session = null
  saveLocal(state)
}

export function localCreateHousehold(name: string, displayName: string): LocalState {
  const state = loadLocal()
  if (!state.session) throw new Error('Not signed in')
  const hid = uid()
  const code = uid().replace(/-/g, '').slice(0, 8).toUpperCase()
  state.household = {
    id: hid,
    name: name || 'Our budget',
    join_code: code,
    created_by: state.session.userId,
  }
  state.members = [
    {
      id: uid(),
      household_id: hid,
      user_id: state.session.userId,
      display_name: displayName,
      color: MEMBER_COLORS[0],
    },
  ]
  // Seed a brother placeholder member for local combined tracking without second device
  state.members.push({
    id: uid(),
    household_id: hid,
    user_id: 'local-brother',
    display_name: 'Brother',
    color: MEMBER_COLORS[1],
  })
  const ym = yearMonthFromDate()
  state.budgets = [
    {
      id: uid(),
      household_id: hid,
      year_month: ym,
      amount_ngn: 200_000,
    },
  ]
  state.expenses = []
  saveLocal(state)
  return state
}

export function localJoinHousehold(code: string, displayName: string): LocalState {
  const state = loadLocal()
  if (!state.session) throw new Error('Not signed in')
  if (!state.household || state.household.join_code !== code.toUpperCase().trim()) {
    throw new Error('Invalid join code (local mode only works on this device)')
  }
  const existing = state.members.find((m) => m.user_id === state.session!.userId)
  if (existing) return state
  // Replace brother placeholder if present
  const brother = state.members.find((m) => m.user_id === 'local-brother')
  if (brother) {
    brother.user_id = state.session.userId
    brother.display_name = displayName
  } else if (state.members.length < 2) {
    state.members.push({
      id: uid(),
      household_id: state.household.id,
      user_id: state.session.userId,
      display_name: displayName,
      color: MEMBER_COLORS[1],
    })
  } else {
    throw new Error('Household already has two members')
  }
  saveLocal(state)
  return state
}

export function localUpsertBudget(yearMonth: string, amount: number): LocalState {
  const state = loadLocal()
  if (!state.household) throw new Error('No household')
  const existing = state.budgets.find(
    (b) => b.household_id === state.household!.id && b.year_month === yearMonth,
  )
  if (existing) {
    existing.amount_ngn = amount
  } else {
    state.budgets.push({
      id: uid(),
      household_id: state.household.id,
      year_month: yearMonth,
      amount_ngn: amount,
    })
  }
  saveLocal(state)
  return state
}

export function localAddExpense(input: {
  amount_ngn: number
  category: string
  note: string
  spent_by: string
  spent_on: string
}): LocalState {
  const state = loadLocal()
  if (!state.household || !state.session) throw new Error('Not ready')
  state.expenses.unshift({
    id: uid(),
    household_id: state.household.id,
    amount_ngn: input.amount_ngn,
    category: input.category,
    note: input.note,
    spent_by: input.spent_by,
    spent_on: input.spent_on,
    created_by: state.session.userId,
    created_at: new Date().toISOString(),
  })
  saveLocal(state)
  return state
}

export function localDeleteExpense(id: string): LocalState {
  const state = loadLocal()
  state.expenses = state.expenses.filter((e) => e.id !== id)
  saveLocal(state)
  return state
}

export function localRenameMember(memberId: string, displayName: string): LocalState {
  const state = loadLocal()
  const m = state.members.find((x) => x.id === memberId)
  if (m) m.display_name = displayName
  saveLocal(state)
  return state
}
