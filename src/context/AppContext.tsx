import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Expense, Household, Member, MonthlyBudget } from '../types'
import {
  localAddExpense,
  localCreateHousehold,
  localDeleteExpense,
  localJoinHousehold,
  localRenameMember,
  localSignIn,
  localSignOut,
  localSignUp,
  localUpsertBudget,
  loadLocal,
} from '../lib/localStore'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { MEMBER_COLORS, clampExpenseDate, defaultBudgetMonth } from '../lib/format'

interface SessionUser {
  id: string
  email: string
  displayName: string
}

interface AuthResult {
  next: 'home' | 'onboarding' | 'confirm-email'
  message?: string
}

interface AppData {
  loading: boolean
  cloud: boolean
  user: SessionUser | null
  household: Household | null
  members: Member[]
  budgets: MonthlyBudget[]
  expenses: Expense[]
  myMember: Member | null
  refresh: () => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<AuthResult>
  signIn: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  createHousehold: (name: string, displayName: string) => Promise<void>
  joinHousehold: (code: string, displayName: string) => Promise<void>
  setBudget: (yearMonth: string, amount: number) => Promise<void>
  addExpense: (input: {
    amount_ngn: number
    category: string
    note: string
    spent_by: string
    spent_on: string
  }) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  renameMember: (memberId: string, name: string) => Promise<void>
}

const AppContext = createContext<AppData | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export function AppProvider({ children }: { children: ReactNode }) {
  const cloud = isSupabaseConfigured
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  const applyLocal = useCallback(() => {
    const s = loadLocal()
    setUser(
      s.session
        ? {
            id: s.session.userId,
            email: s.session.email,
            displayName: s.session.displayName,
          }
        : null,
    )
    setHousehold(s.household)
    setMembers(s.members)
    setBudgets(s.budgets)
    setExpenses(s.expenses)
  }, [])

  const loadCloudHousehold = useCallback(async (userId: string) => {
    if (!supabase) return
    const { data: memberships, error } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', userId)
    if (error) throw error
    if (!memberships?.length) {
      setHousehold(null)
      setMembers([])
      setBudgets([])
      setExpenses([])
      return
    }
    const hid = memberships[0].household_id as string
    const [{ data: hh }, { data: mems }, { data: buds }, { data: exps }] =
      await Promise.all([
        supabase.from('households').select('*').eq('id', hid).single(),
        supabase.from('members').select('*').eq('household_id', hid),
        supabase.from('monthly_budgets').select('*').eq('household_id', hid),
        supabase
          .from('expenses')
          .select('*')
          .eq('household_id', hid)
          .order('spent_on', { ascending: false })
          .order('created_at', { ascending: false }),
      ])
    setHousehold(hh as Household)
    setMembers((mems as Member[]) ?? [])
    setBudgets((buds as MonthlyBudget[]) ?? [])
    setExpenses((exps as Expense[]) ?? [])
  }, [])

  const refresh = useCallback(async () => {
    if (!cloud) {
      applyLocal()
      return
    }
    if (!supabase || !user) return
    await loadCloudHousehold(user.id)
  }, [cloud, applyLocal, loadCloudHousehold, user])

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      try {
        if (!cloud || !supabase) {
          applyLocal()
          return
        }
        const { data } = await supabase.auth.getSession()
        const session = data.session
        if (!session) {
          if (!cancelled) {
            setUser(null)
            setHousehold(null)
            setMembers([])
            setBudgets([])
            setExpenses([])
          }
          return
        }
        const displayName =
          (session.user.user_metadata?.display_name as string) ||
          session.user.email?.split('@')[0] ||
          'You'
        if (!cancelled) {
          setUser({
            id: session.user.id,
            email: session.user.email ?? '',
            displayName,
          })
        }
        await loadCloudHousehold(session.user.id)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void init()

    if (cloud && supabase) {
      const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!session) {
          setUser(null)
          setHousehold(null)
          setMembers([])
          setBudgets([])
          setExpenses([])
          return
        }
        const displayName =
          (session.user.user_metadata?.display_name as string) ||
          session.user.email?.split('@')[0] ||
          'You'
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          displayName,
        })
        await loadCloudHousehold(session.user.id)
      })
      return () => {
        cancelled = true
        sub.subscription.unsubscribe()
      }
    }
    return () => {
      cancelled = true
    }
  }, [cloud, applyLocal, loadCloudHousehold])

  // Realtime expenses when cloud
  useEffect(() => {
    if (!cloud || !supabase || !household || !user) return
    const client = supabase
    const channel = client
      .channel(`expenses-${household.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `household_id=eq.${household.id}`,
        },
        () => {
          void loadCloudHousehold(user.id)
        },
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [cloud, household, loadCloudHousehold, user])

  const signUp = useCallback(
    async (email: string, password: string, displayName: string): Promise<AuthResult> => {
      if (!cloud || !supabase) {
        localSignUp(email, displayName)
        applyLocal()
        const s = loadLocal()
        return { next: s.household ? 'home' : 'onboarding' }
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { display_name: displayName } },
      })
      if (error) throw error

      if (!data.session || !data.user) {
        return {
          next: 'confirm-email',
          message:
            'Account created. Confirm your email (check inbox), then sign in. Or in Supabase → Authentication → Providers → Email, turn off “Confirm email”.',
        }
      }

      const name =
        displayName.trim() ||
        (data.user.user_metadata?.display_name as string) ||
        data.user.email?.split('@')[0] ||
        'You'
      setUser({
        id: data.user.id,
        email: data.user.email ?? email,
        displayName: name,
      })
      await loadCloudHousehold(data.user.id)
      const { data: memberships } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', data.user.id)
        .limit(1)
      return { next: memberships?.length ? 'home' : 'onboarding' }
    },
    [cloud, applyLocal, loadCloudHousehold],
  )

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (!cloud || !supabase) {
        localSignIn(email)
        applyLocal()
        const s = loadLocal()
        return { next: s.household ? 'home' : 'onboarding' }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) throw error
      if (!data.user) throw new Error('Sign in failed — no user returned')

      const name =
        (data.user.user_metadata?.display_name as string) ||
        data.user.email?.split('@')[0] ||
        'You'
      setUser({
        id: data.user.id,
        email: data.user.email ?? email,
        displayName: name,
      })
      await loadCloudHousehold(data.user.id)
      const { data: memberships } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', data.user.id)
        .limit(1)
      return { next: memberships?.length ? 'home' : 'onboarding' }
    },
    [cloud, applyLocal, loadCloudHousehold],
  )

  const signOut = useCallback(async () => {
    if (!cloud || !supabase) {
      localSignOut()
      applyLocal()
      return
    }
    await supabase.auth.signOut()
    setUser(null)
    setHousehold(null)
    setMembers([])
    setBudgets([])
    setExpenses([])
  }, [cloud, applyLocal])

  const createHousehold = useCallback(
    async (name: string, displayName: string) => {
      if (!cloud || !supabase) {
        localCreateHousehold(name, displayName)
        applyLocal()
        return
      }
      const { error } = await supabase.rpc('create_household', {
        p_name: name,
        p_display_name: displayName,
        p_color: MEMBER_COLORS[0],
      })
      if (error) throw error
      // seed default budget
      const { data: mem } = await supabase
        .from('members')
        .select('household_id')
        .eq('user_id', user!.id)
        .single()
      if (mem) {
        await supabase.from('monthly_budgets').upsert(
          {
            household_id: mem.household_id,
            year_month: defaultBudgetMonth(),
            amount_ngn: 200_000,
          },
          { onConflict: 'household_id,year_month' },
        )
      }
      await loadCloudHousehold(user!.id)
    },
    [cloud, applyLocal, loadCloudHousehold, user],
  )

  const joinHousehold = useCallback(
    async (code: string, displayName: string) => {
      if (!cloud || !supabase) {
        localJoinHousehold(code, displayName)
        applyLocal()
        return
      }
      const { error } = await supabase.rpc('join_household', {
        p_code: code,
        p_display_name: displayName,
        p_color: MEMBER_COLORS[1],
      })
      if (error) throw error
      await loadCloudHousehold(user!.id)
    },
    [cloud, applyLocal, loadCloudHousehold, user],
  )

  const setBudget = useCallback(
    async (yearMonth: string, amount: number) => {
      if (!cloud || !supabase) {
        localUpsertBudget(yearMonth, amount)
        applyLocal()
        return
      }
      if (!household) throw new Error('No household')
      const { error } = await supabase.from('monthly_budgets').upsert(
        {
          household_id: household.id,
          year_month: yearMonth,
          amount_ngn: amount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'household_id,year_month' },
      )
      if (error) throw error
      await loadCloudHousehold(user!.id)
    },
    [cloud, applyLocal, household, loadCloudHousehold, user],
  )

  const addExpense = useCallback(
    async (input: {
      amount_ngn: number
      category: string
      note: string
      spent_by: string
      spent_on: string
    }) => {
      const spentOn = clampExpenseDate(input.spent_on)
      if (!cloud || !supabase) {
        localAddExpense({ ...input, spent_on: spentOn })
        applyLocal()
        return
      }
      if (!household || !user) throw new Error('Not ready')
      const { error } = await supabase.from('expenses').insert({
        household_id: household.id,
        amount_ngn: input.amount_ngn,
        category: input.category,
        note: input.note,
        spent_by: input.spent_by,
        spent_on: spentOn,
        created_by: user.id,
      })
      if (error) throw error
      await loadCloudHousehold(user.id)
    },
    [cloud, applyLocal, household, loadCloudHousehold, user],
  )

  const deleteExpense = useCallback(
    async (id: string) => {
      if (!cloud || !supabase) {
        localDeleteExpense(id)
        applyLocal()
        return
      }
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
      await loadCloudHousehold(user!.id)
    },
    [cloud, applyLocal, loadCloudHousehold, user],
  )

  const renameMember = useCallback(
    async (memberId: string, name: string) => {
      if (!cloud || !supabase) {
        localRenameMember(memberId, name)
        applyLocal()
        return
      }
      const { error } = await supabase
        .from('members')
        .update({ display_name: name })
        .eq('id', memberId)
      if (error) throw error
      await loadCloudHousehold(user!.id)
    },
    [cloud, applyLocal, loadCloudHousehold, user],
  )

  const myMember = useMemo(
    () => members.find((m) => m.user_id === user?.id) ?? null,
    [members, user],
  )

  const value: AppData = {
    loading,
    cloud,
    user,
    household,
    members,
    budgets,
    expenses,
    myMember,
    refresh,
    signUp,
    signIn,
    signOut,
    createHousehold,
    joinHousehold,
    setBudget,
    addExpense,
    deleteExpense,
    renameMember,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
