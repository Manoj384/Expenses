import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // Corrupted/expired session — wipe it so user gets clean login
        console.warn('[Auth] getSession error, clearing session:', error.message)
        supabase.auth.signOut()
        setSession(null)
        setUser(null)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }
      setLoading(false)
    })

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // TOKEN_REFRESHED_FAILED fires when the 400 refresh_token error happens
      if (event === 'TOKEN_REFRESHED_FAILED' || event === 'SIGNED_OUT') {
        // Clear the bad session from storage
        supabase.auth.signOut().catch(() => {})
        setSession(null)
        setUser(null)
        setLoading(false)
        // Redirect to login — window.location for hard navigation clears all component state
        if (event === 'TOKEN_REFRESHED_FAILED') {
          window.location.href = '/login'
        }
        return
      }
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signup = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  const login = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const logout = async () => {
    // Clear any bad stored tokens first
    try { await supabase.auth.signOut() } catch {}
    setSession(null)
    setUser(null)
    // Hard navigation to /login ensures all component state + service worker data is fresh
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
