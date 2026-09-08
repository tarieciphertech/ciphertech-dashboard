import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadProfile(user) {
    if (!user || !supabase) return null
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (profileError) throw profileError
    return data
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return undefined
    }

    let active = true
    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
      try {
        setProfile(await loadProfile(data.session?.user))
      } catch (profileError) {
        setError(profileError.message)
      } finally {
        if (active) setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      try {
        setProfile(await loadProfile(nextSession?.user))
        setError('')
      } catch (profileError) {
        setError(profileError.message)
      } finally {
        setLoading(false)
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    if (!supabase) throw new Error('Authentication is not configured.')
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.error) throw result.error
    const nextProfile = await loadProfile(result.data.user)
    if (!['admin', 'staff'].includes(nextProfile?.role)) {
      await supabase.auth.signOut()
      throw new Error('Your account is not authorized for the Cypher Technologies admin portal.')
    }
    setProfile(nextProfile)
    return result.data
  }

  const requestPasswordReset = async (email) => {
    if (!supabase) throw new Error('Authentication is not configured.')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (resetError) throw resetError
  }

  const updatePassword = async (password) => {
    if (!supabase) throw new Error('Authentication is not configured.')
    const { data, error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) throw updateError
    const nextProfile = await loadProfile(data.user)
    setProfile(nextProfile)
    return data
  }

  const signOut = () => supabase?.auth.signOut()

  const value = useMemo(() => ({
    session,
    profile,
    loading,
    error,
    signIn,
    requestPasswordReset,
    updatePassword,
    signOut,
  }), [session, profile, loading, error])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
