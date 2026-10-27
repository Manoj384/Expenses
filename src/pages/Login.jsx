import { useState, useEffect, useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Wallet, Eye, EyeOff, KeyRound, MailCheck } from 'lucide-react'

export default function Login() {
  const { user, login, loading } = useAuth()
  const [form, setForm]         = useState({ email: '', password: '' })
  const [error, setError]       = useState('')
  const [info, setInfo]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [resendingConfirmation, setResendingConfirmation] = useState(false)

  // Recovery / Reset Password Completion State
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  const passwordStrength = useMemo(() => {
    const p = newPassword
    if (!p) return { score: 0, label: '', color: '' }
    let score = 0
    if (p.length >= 6) score += 1
    if (p.length >= 8) score += 1
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score += 1
    if (/[0-9]/.test(p)) score += 1
    if (/[^A-Za-z0-9]/.test(p)) score += 1

    if (score <= 2) return { score, label: 'Weak', color: 'bg-rose-500 text-rose-600' }
    if (score <= 4) return { score, label: 'Moderate', color: 'bg-amber-500 text-amber-600' }
    return { score, label: 'Strong', color: 'bg-emerald-500 text-emerald-600' }
  }, [newPassword])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setIsRecoveryMode(true)
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Already logged in (and not currently resetting password)
  if (!loading && user && !isRecoveryMode) return <Navigate to="/" replace />

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

  const handleResendConfirmation = async () => {
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter your email address to resend confirmation.')
      return
    }
    setResendingConfirmation(true)
    setError('')
    setInfo('')
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: form.email,
      })
      if (resendErr) throw resendErr
      setInfo('Confirmation email resent! Please check your inbox.')
    } catch (err) {
      setError(err?.message || 'Unable to resend confirmation email.')
    } finally {
      setResendingConfirmation(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setUpdatingPassword(true)
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
      if (updateErr) throw updateErr
      setInfo('Password successfully updated! You can now sign in with your new password.')
      setIsRecoveryMode(false)
      setNewPassword('')
      setConfirmPassword('')
      if (window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname)
      }
    } catch (err) {
      setError(err?.message || 'Failed to update password. Please request a new reset link.')
    } finally {
      setUpdatingPassword(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-blue-600 rounded-2xl p-4 mb-4 shadow-lg shadow-blue-500/30">
            {isRecoveryMode ? <KeyRound className="h-8 w-8 text-white" /> : <Wallet className="h-8 w-8 text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Finance Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isRecoveryMode ? 'Create a new secure password' : 'Sign in to your account'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4" role="alert">
              <div>{error}</div>
              {error.toLowerCase().includes('confirm your email') && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resendingConfirmation}
                  className="mt-2 text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <MailCheck className="h-3.5 w-3.5" />
                  {resendingConfirmation ? 'Sending...' : 'Resend confirmation email'}
                </button>
              )}
            </div>
          )}
          {info && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl mb-4" role="status">
              {info}
            </div>
          )}

          {isRecoveryMode ? (
            /* Set New Password Form */
            <form onSubmit={handleUpdatePassword} noValidate className="space-y-4">
              <div>
                <label className="label" htmlFor="newPassword">New Password</label>
                <div className="relative">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    className="input-field pr-10"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError('') }}
                    placeholder="At least 6 characters"
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

                {newPassword.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">Strength:</span>
                      <span className={`font-bold ${passwordStrength.color.split(' ')[1]}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <div
                          key={lvl}
                          className={`h-full flex-1 rounded-full transition-colors ${
                            passwordStrength.score >= lvl ? passwordStrength.color.split(' ')[0] : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="label" htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                  placeholder="Repeat new password"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full mt-6"
                disabled={updatingPassword}
              >
                {updatingPassword ? 'Updating Password...' : 'Save New Password'}
              </button>

              <button
                type="button"
                onClick={() => setIsRecoveryMode(false)}
                className="text-center text-xs text-gray-500 hover:text-gray-700 block w-full mt-2"
              >
                Cancel and return to sign in
              </button>
            </form>
          ) : (
            /* Standard Sign In Form */
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
          )}

          {!isRecoveryMode && (
            <p className="text-center text-sm text-gray-500 mt-6">
              Don't have an account?{' '}
              <Link to="/signup" className="text-blue-600 hover:underline font-medium">
                Sign up
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
