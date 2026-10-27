import { useState, useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Wallet, Eye, EyeOff, ShieldCheck } from 'lucide-react'

export default function Signup() {
  const { user, signup, loading } = useAuth()
  const [form, setForm]         = useState({ email: '', password: '', confirm: '' })
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const passwordStrength = useMemo(() => {
    const p = form.password
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
  }, [form.password])

  if (!loading && user) return <Navigate to="/" replace />

  const validate = () => {
    if (!form.email) return 'Email is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address.'
    if (!form.password) return 'Password is required.'
    if (form.password.length < 6) return 'Password must be at least 6 characters.'
    if (form.password !== form.confirm) return 'Passwords do not match.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setSubmitting(true)
    try {
      await signup({ email: form.email, password: form.password })
      setSuccess('Account created! Please check your email to confirm your account, then sign in.')
      setForm({ email: '', password: '', confirm: '' })
    } catch (err) {
      const msg = err?.message || ''
      if (msg.toLowerCase().includes('already registered')) {
        setError('This email is already registered. Please sign in or use forgot password.')
      } else if (msg.toLowerCase().includes('rate limit')) {
        setError('Too many sign-up attempts. Please wait a few minutes.')
      } else {
        setError(msg || 'Unable to create account. Please check your email and password.')
      }
    } finally {
      setSubmitting(false)
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
          <p className="text-gray-500 text-sm mt-1">Create your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4 flex items-center gap-2" role="status">
              <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <span>{success}</span>
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
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="input-field pr-10"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
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

              {/* Password strength indicator */}
              {form.password && (
                <div className="mt-1.5 space-y-1">
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-300 ${passwordStrength.color.split(' ')[0]}`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Password Strength</span>
                    <span className={`font-semibold ${passwordStrength.color.split(' ')[1]}`}>{passwordStrength.label}</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="label" htmlFor="confirm">Confirm Password</label>
              <div className="relative">
                <input
                  id="confirm"
                  name="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="input-field pr-10"
                  value={form.confirm}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full mt-6"
              disabled={submitting}
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
