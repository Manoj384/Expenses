import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Wallet, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { user, login, loading } = useAuth()
  const [form, setForm]         = useState({ email: '', password: '' })
  const [error, setError]       = useState('')
  const [info, setInfo]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)

  // Already logged in
  if (!loading && user) return <Navigate to="/" replace />

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
    setInfo('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!form.email || !form.password) { setError('Email and password are required.'); return }
    setSubmitting(true)
    try {
      await login({ email: form.email, password: form.password })
    } catch (err) {
      const msg = err?.message || ''
      if (msg.toLowerCase().includes('rate limit')) {
        setError('Too many login attempts. Please wait a moment and try again.')
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        setError('Please check your inbox to confirm your email before logging in.')
      } else {
        setError('Invalid email or password.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter your valid email address first to reset your password.')
      return
    }
    setResettingPassword(true)
    setError('')
    setInfo('')
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(form.email, {
        redirectTo: `${window.location.origin}/login`,
      })
      if (resetErr) throw resetErr
      setInfo('Password reset link sent! Please check your email inbox.')
    } catch (err) {
      setError(err?.message || 'Unable to send password reset email. Please try again.')
    } finally {
      setResettingPassword(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-blue-600 rounded-2xl p-4 mb-4">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Finance Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">
              {error}
            </div>
          )}
          {info && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-lg mb-4" role="status">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className="input-field"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0" htmlFor="password">Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resettingPassword}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {resettingPassword ? 'Sending link...' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input-field pr-10"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full mt-6"
              disabled={submitting}
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
