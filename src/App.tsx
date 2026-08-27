import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useApp } from './context/AppContext'
import { AddExpensePage } from './pages/AddExpensePage'
import { AuthPage } from './pages/AuthPage'
import { BudgetPage } from './pages/BudgetPage'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { OnboardingPage } from './pages/OnboardingPage'

function Protected({ children }: { children: ReactNode }) {
  const { loading, user, household } = useApp()
  if (loading) {
    return (
      <div className="auth-wrap">
        <p className="hint">Loading Split…</p>
      </div>
    )
  }
  if (!user) return <Navigate to="/auth" replace />
  if (!household) return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="add" element={<AddExpensePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="budget" element={<BudgetPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
