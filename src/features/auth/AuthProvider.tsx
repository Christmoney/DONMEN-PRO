import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'

import { getProfile, login as loginRequest, signOut, signup as signupRequest } from './api'
import type { SignupResult } from './api'
import type { SignupInput } from './validation'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'

export type AppRole = 'client' | 'hairdresser' | 'admin'

export type AuthProfile = {
  first_name: string
  username: string
  phone: string | null
  role: AppRole
}

type AuthContextValue = {
  user: User | null
  profile: AuthProfile | null
  loading: boolean
  error: string | null
  isNewSignup: boolean
  configured: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (input: SignupInput) => Promise<SignupResult>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState<string | null>(null)
  const [isNewSignup, setIsNewSignup] = useState(false)

  useEffect(() => {
    if (!supabase) {
      return
    }

    let active = true
    let authRevision = 0
    let profileRequest = 0
    let currentUserId: string | null = null

    const fetchProfile = async (nextUser: User, requestId: number) => {
      try {
        const nextProfile = await getProfile(nextUser.id)
        if (!active || requestId !== profileRequest || currentUserId !== nextUser.id) return
        setProfile(nextProfile)
        setError(null)
      } catch (caughtError) {
        if (!active || requestId !== profileRequest || currentUserId !== nextUser.id) return
        setProfile(null)
        setError(caughtError instanceof Error ? caughtError.message : 'Impossible de charger votre profil.')
      } finally {
        if (active && requestId === profileRequest && currentUserId === nextUser.id) {
          setLoading(false)
        }
      }
    }

    const applyUser = (nextUser: User | null, deferProfileFetch = false) => {
      const previousUserId = currentUserId
      currentUserId = nextUser?.id ?? null
      const requestId = ++profileRequest

      setUser(nextUser)
      setProfile(null)
      setError(null)
      if (previousUserId !== currentUserId) setIsNewSignup(false)

      if (!nextUser) {
        setLoading(false)
        return
      }

      setLoading(true)
      const load = () => {
        if (active && requestId === profileRequest && currentUserId === nextUser.id) {
          void fetchProfile(nextUser, requestId)
        }
      }

      if (deferProfileFetch) {
        window.setTimeout(load, 0)
      } else {
        load()
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return

      authRevision += 1
      applyUser(event === 'SIGNED_OUT' ? null : nextSession?.user ?? null, true)
    })

    const initialAuthRevision = authRevision
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || authRevision !== initialAuthRevision) return
      if (sessionError) {
        currentUserId = null
        profileRequest += 1
        setUser(null)
        setProfile(null)
        setError(sessionError.message)
        setLoading(false)
        return
      }
      applyUser(data.session?.user ?? null)
    })

    return () => {
      active = false
      profileRequest += 1
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    setIsNewSignup(false)
    await loginRequest(email, password)
  }, [])

  const signup = useCallback(async (input: SignupInput) => {
    setError(null)
    const result = await signupRequest(input)
    setIsNewSignup(!result.confirmationRequired)
    return result
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
