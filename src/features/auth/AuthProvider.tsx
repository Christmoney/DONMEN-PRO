import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'

import { getProfile, login as loginRequest, signOut, signup as signupRequest } from './api'
import type { SignupInput } from './validation'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'

export type AppRole = 'client' | 'hairdresser' | 'admin'

export type AuthProfile = {
  first_name: string
  username: string
  phone: string
  role: AppRole
}

type AuthContextValue = {
  user: User | null
  profile: AuthProfile | null
  loading: boolean
  error: string | null
  isNewSignup: boolean
  configured: boolean
  login: (identifier: string, password: string) => Promise<void>
  signup: (input: SignupInput) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState<string | null>(null)
  const [isNewSignup, setIsNewSignup] = useState(false)

  const loadProfile = useCallback(async (nextUser: User) => {
    try {
      const nextProfile = await getProfile(nextUser.id)
      setProfile(nextProfile)
      setError(null)
    } catch (caughtError) {
      setProfile(null)
      setError(caughtError instanceof Error ? caughtError.message : 'Impossible de charger votre profil.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      return
    }

    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return

      const nextUser = nextSession?.user ?? null
      setUser(nextUser)

      if (event === 'SIGNED_OUT' || !nextUser) {
        setProfile(null)
        setLoading(false)
        return
      }

      setLoading(true)
      window.setTimeout(() => {
        if (active) void loadProfile(nextUser)
      }, 0)
    })

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) {
        setError(sessionError.message)
        setLoading(false)
        return
      }
      const currentUser = data.session?.user ?? null
      setUser(currentUser)
      if (currentUser) void loadProfile(currentUser)
      else setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const login = useCallback(async (identifier: string, password: string) => {
    setError(null)
    setIsNewSignup(false)
    await loginRequest(identifier, password)
  }, [])

  const signup = useCallback(async (input: SignupInput) => {
    setError(null)
    await signupRequest(input)
    setIsNewSignup(true)
  }, [])

  const logout = useCallback(async () => {
    setError(null)
    await signOut()
    setIsNewSignup(false)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    loading,
    error,
    isNewSignup,
    configured: isSupabaseConfigured,
    login,
    signup,
    logout,
  }), [user, profile, loading, error, isNewSignup, login, signup, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth doit être utilisé dans AuthProvider.')
  }
  return context
}
