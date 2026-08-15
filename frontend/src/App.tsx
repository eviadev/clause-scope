import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LoginPage } from './features/auth/components/LoginPage'
import { ContractComparePage } from './features/comparison/components/ContractComparePage'
import { CreateDealPage } from './features/deals/components/CreateDealPage'
import { DashboardPage } from './features/deals/components/DashboardPage'
import { DealDetailsPage } from './features/deals/components/DealDetailsPage'
import { useAuthStore } from './stores/auth.store'
import './App.css'

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const protect = (page: ReactNode) => (
    isAuthenticated ? page : <Navigate to="/login" replace />
  )

  return (
    <ErrorBoundary>
      <Router>
        <div className="app">
          <Routes>
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
            />
            <Route path="/dashboard" element={protect(<DashboardPage />)} />
            <Route path="/compare" element={protect(<ContractComparePage />)} />
            <Route path="/deals/new" element={protect(<CreateDealPage />)} />
            <Route path="/deals/:id" element={protect(<DealDetailsPage />)} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
