import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AdminProvider } from './context/AdminContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'
import { NotificationProvider } from './context/NotificationContext'
import { CurrencyProvider } from './context/CurrencyContext'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorBoundary from './components/ErrorBoundary'


const Login        = lazy(() => import('./pages/Login'))
const Signup       = lazy(() => import('./pages/Signup'))
const Dashboard    = lazy(() => import('./pages/Dashboard'))
const Transactions = lazy(() => import('./pages/Transactions'))
const PastExpenses = lazy(() => import('./pages/PastExpenses'))
const MutualFunds  = lazy(() => import('./pages/MutualFunds'))
const NetWorth     = lazy(() => import('./pages/NetWorth'))
const Goals        = lazy(() => import('./pages/Goals'))
const Budgets      = lazy(() => import('./pages/Budgets'))
const SIPs         = lazy(() => import('./pages/SIPs'))
const Debts        = lazy(() => import('./pages/Debts'))
const Statements   = lazy(() => import('./pages/Statements'))
const Reports      = lazy(() => import('./pages/Reports'))
const Splitwise    = lazy(() => import('./pages/Splitwise'))
const BillReminders = lazy(() => import('./pages/BillReminders'))

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <LoadingSpinner text="Loading..." />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PageSuspense({ children }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
          <LoadingSpinner text="Loading page..." />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

function AppRoutes() {
  return (
    <PageSuspense>
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
        <Route path="/splitwise"     element={<ProtectedRoute><Splitwise /></ProtectedRoute>} />
        <Route path="/bills"         element={<ProtectedRoute><BillReminders /></ProtectedRoute>} />
        <Route path="/past-expenses" element={<ProtectedRoute><PastExpenses /></ProtectedRoute>} />
        <Route path="/sips"          element={<ProtectedRoute><SIPs /></ProtectedRoute>} />
        <Route path="/debts"         element={<ProtectedRoute><Debts /></ProtectedRoute>} />
        <Route path="/statements"    element={<ProtectedRoute><Statements /></ProtectedRoute>} />
        <Route path="/reports"       element={<ProtectedRoute><Reports /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PageSuspense>
  )
}


export default function App() {

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <ToastProvider>
            <CurrencyProvider>
              <AuthProvider>
                <NotificationProvider>
                  <AdminProvider>
                    <AppRoutes />
                  </AdminProvider>
                </NotificationProvider>
              </AuthProvider>
            </CurrencyProvider>
          </ToastProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  )
}


