import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AdminProvider } from './context/AdminContext'
import { ToastProvider } from './context/ToastContext'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorBoundary from './components/ErrorBoundary'

import Login        from './pages/Login'
import Signup       from './pages/Signup'
import Dashboard    from './pages/Dashboard'
import Transactions from './pages/Transactions'
import PastExpenses from './pages/PastExpenses'
import MutualFunds  from './pages/MutualFunds'
import NetWorth     from './pages/NetWorth'
import Goals        from './pages/Goals'
import Budgets      from './pages/Budgets'
import SIPs         from './pages/SIPs'
import Debts        from './pages/Debts'
import Reports      from './pages/Reports'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner text="Loading..." />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"  element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/"              element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard"     element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/transactions"  element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
      <Route path="/mutual-funds"  element={<ProtectedRoute><MutualFunds /></ProtectedRoute>} />
      <Route path="/net-worth"     element={<ProtectedRoute><NetWorth /></ProtectedRoute>} />
      <Route path="/goals"         element={<ProtectedRoute><Goals /></ProtectedRoute>} />
      <Route path="/budgets"       element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
      <Route path="/past-expenses" element={<ProtectedRoute><PastExpenses /></ProtectedRoute>} />
      <Route path="/sips"          element={<ProtectedRoute><SIPs /></ProtectedRoute>} />
      <Route path="/debts"         element={<ProtectedRoute><Debts /></ProtectedRoute>} />
      <Route path="/reports"       element={<ProtectedRoute><Reports /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <AdminProvider>
              <AppRoutes />
            </AdminProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
