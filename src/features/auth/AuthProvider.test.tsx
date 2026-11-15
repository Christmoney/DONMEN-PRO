// @vitest-environment jsdom

import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn(),
  getProfile: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      onAuthStateChange: mocks.onAuthStateChange,
      getSession: mocks.getSession,
    },
  },
}))

vi.mock('./api', () => ({
  getProfile: mocks.getProfile,
  login: vi.fn(),
  signOut: vi.fn(),
  signup: vi.fn(),
}))

import { AuthProvider, useAuth } from './AuthProvider'

type TestUser = { id: string }
type AuthListener = (event: string, session: { user: TestUser } | null) => void

function ProfileState() {
  const { profile, loading } = useAuth()
  return <div>{loading ? 'loading' : profile?.first_name ?? 'signed out'}</div>
}

describe('AuthProvider profile freshness', () => {
  let authListener: AuthListener

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockReturnValue(new Promise(() => {}))
    mocks.onAuthStateChange.mockImplementation((listener: AuthListener) => {
      authListener = listener
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
  })

  it('does not let an older user profile overwrite the currently signed-in user', async () => {
    let resolveFirstProfile: (profile: { first_name: string; username: string; phone: string; role: 'client' }) => void = () => {}
    let resolveSecondProfile: (profile: { first_name: string; username: string; phone: string; role: 'client' }) => void = () => {}
    const firstProfile = new Promise<{ first_name: string; username: string; phone: string; role: 'client' }>((resolve) => {
      resolveFirstProfile = resolve
    })
    const secondProfile = new Promise<{ first_name: string; username: string; phone: string; role: 'client' }>((resolve) => {
      resolveSecondProfile = resolve
    })
    mocks.getProfile.mockReturnValueOnce(firstProfile).mockReturnValueOnce(secondProfile)

    render(
      <AuthProvider>
        <ProfileState />
      </AuthProvider>,
    )

    await act(async () => {
      authListener('SIGNED_IN', { user: { id: 'user-a' } })
    })
    await waitFor(() => expect(mocks.getProfile).toHaveBeenCalledTimes(1))

    await act(async () => {
      authListener('SIGNED_IN', { user: { id: 'user-b' } })
    })
    await waitFor(() => expect(mocks.getProfile).toHaveBeenCalledTimes(2))

    await act(async () => {
      resolveSecondProfile({ first_name: 'Current', username: 'current', phone: '+237600000001', role: 'client' })
    })
    expect(await screen.findByText('Current')).toBeTruthy()

    await act(async () => {
      resolveFirstProfile({ first_name: 'Previous', username: 'previous', phone: '+237600000002', role: 'client' })
    })

    expect(screen.getByText('Current')).toBeTruthy()
    expect(mocks.getProfile).toHaveBeenNthCalledWith(1, 'user-a')
    expect(mocks.getProfile).toHaveBeenNthCalledWith(2, 'user-b')
  })
})
