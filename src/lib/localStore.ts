import type { Expense, Household, Member, MonthlyBudget } from '../types'
import { MEMBER_COLORS, TRACKING_START_MONTH, defaultBudgetMonth, uid } from './format'

const KEY = 'split-local-v1'
const VAULT_KEY = 'split-local-vault-v1'

export interface LocalSession {
  userId: string
  email: string
  displayName: string
}

export interface LocalState {
  mode: 'local'
  session: LocalSession | null
  household: Household | null
  members: Member[]
  budgets: MonthlyBudget[]
  expenses: Expense[]
}

type Vault = Record<
  string,
  {
    session: LocalSession
    household: Household | null
    members: Member[]
    budgets: MonthlyBudget[]
    expenses: Expense[]
  }
>

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

function loadVault(): Vault {
  try {
    const raw = localStorage.getItem(VAULT_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Vault
  } catch {
    return {}
  }
}

function saveVault(vault: Vault) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault))
}

function persistCurrentToVault(state: LocalState) {
  if (!state.session?.email) return
  const email = state.session.email.trim().toLowerCase()
  const vault = loadVault()
  vault[email] = {
    session: state.session,
    household: state.household,
    members: state.members,
    budgets: state.budgets,
    expenses: state.expenses,
  }
  saveVault(vault)
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

/** Drop accidental pre-September seed budgets only — keep real expense dates. */
function scrubPreTracking(state: LocalState): LocalState {
  const budgets = state.budgets.filter((b) => b.year_month >= TRACKING_START_MONTH)
  if (budgets.length === state.budgets.length) return state
  return { ...state, budgets }
}

export function loadLocal(): LocalState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const parsed = scrubPreTracking({ ...empty(), ...JSON.parse(raw) })
    if (parsed.budgets.length !== (JSON.parse(raw).budgets?.length ?? 0)) {
      localStorage.setItem(KEY, JSON.stringify(parsed))
      if (parsed.session) persistCurrentToVault(parsed)
    }
    return parsed
  } catch {
    return empty()
  }
}

export function saveLocal(state: LocalState) {
  const cleaned = scrubPreTracking(state)
  localStorage.setItem(KEY, JSON.stringify(cleaned))
  if (cleaned.session) persistCurrentToVault(cleaned)
}

export function localSignUp(email: string, displayName: string): LocalState {
  const normalized = normalizeEmail(email)
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Enter a valid email address')
  }
  const name = displayName.trim() || normalized.split('@')[0] || 'You'

  // Already signed in as this email
  const current = loadLocal()
  if (current.session && normalizeEmail(current.session.email) === normalized) {
    current.session.displayName = name
    saveLocal(current)
    return current
  }

  // Save whoever was signed in, then start fresh for this email (or restore vault)
  if (current.session) persistCurrentToVault(current)

  const vault = loadVault()
  const existing = vault[normalized]
  if (existing) {
    throw new Error('An account with this email already exists on this device. Sign in instead.')
  }

  const state = empty()
  state.session = {
    userId: uid(),
    email: normalized,
    displayName: name,
  }
  saveLocal(state)
  return state
}

export function localSignIn(email: string): LocalState {
  const normalized = normalizeEmail(email)
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Enter a valid email address')
  }

  const current = loadLocal()
  if (current.session && normalizeEmail(current.session.email) === normalized) {
    return current
  }
  if (current.session) persistCurrentToVault(current)

  const vault = loadVault()
  const saved = vault[normalized]
  if (!saved) {
    throw new Error('No account found for that email on this device. Sign up first.')
  }

  const state: LocalState = {
    mode: 'local',
    session: saved.session,
    household: saved.household,
    members: saved.members,
    budgets: saved.budgets,
    expenses: saved.expenses,
  }
  saveLocal(state)
  return state
}

export function localSignOut() {
  const state = loadLocal()
  if (state.session) persistCurrentToVault(state)
  state.session = null
  // Keep household data in vault only; clear active workspace so auth gates work
  state.household = null
  state.members = []
  state.budgets = []
  state.expenses = []
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function localCreateHousehold(name: string, displayName: string): LocalState {
  const state = loadLocal()
  if (!state.session) throw new Error('Not signed in')
  if (state.household) throw new Error('You already have a household')

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
    {
      id: uid(),
      household_id: hid,
      user_id: 'local-brother',
      display_name: 'Brother',
      color: MEMBER_COLORS[1],
    },
  ]
  const ym = defaultBudgetMonth()
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
