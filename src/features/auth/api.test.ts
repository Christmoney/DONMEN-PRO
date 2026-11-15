import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  setSession: vi.fn(),
  signInWithOAuth: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  from: vi.fn(),
  invoke: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
      setSession: mocks.setSession,
      signInWithOAuth: mocks.signInWithOAuth,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      updateUser: mocks.updateUser,
    },
    from: mocks.from,
    functions: { invoke: mocks.invoke },
  },
}))

import { getProfile, requestPasswordReset, signInWithOAuth, signup, updatePassword } from './api'

describe('getProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refuses to load a profile for a different authenticated user', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'current-user' } },
      error: null,
    })

    await expect(getProfile('previous-user')).rejects.toThrow('La session a changé.')
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('queries the profile and role belonging to the verified auth user', async () => {
    const profileQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn().mockResolvedValue({
        data: { first_name: 'Current', username: 'current', phone: '+237600000001' },
        error: null,
      }),
    }
    const roleQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn().mockResolvedValue({ data: { role: 'client' }, error: null }),
    }
    profileQuery.select.mockReturnValue(profileQuery)
    profileQuery.eq.mockReturnValue(profileQuery)
    roleQuery.select.mockReturnValue(roleQuery)
    roleQuery.eq.mockReturnValue(roleQuery)
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'current-user' } },
      error: null,
    })
    mocks.from.mockReturnValueOnce(profileQuery).mockReturnValueOnce(roleQuery)

    await expect(getProfile('current-user')).resolves.toEqual({
      first_name: 'Current',
      username: 'current',
      phone: '+237600000001',
      role: 'client',
    })
    expect(profileQuery.eq).toHaveBeenCalledWith('id', 'current-user')
    expect(roleQuery.eq).toHaveBeenCalledWith('user_id', 'current-user')
  })

  it('returns an email-confirmation state without trying to create a session', async () => {
    mocks.invoke.mockResolvedValue({
      data: { confirmationRequired: true },
      error: null,
    })

    await expect(signup({
      username: 'new-client',
      email: 'new@example.com',
      password: 'secret1',
      confirmPassword: 'secret1',
    }, 'client')).resolves.toEqual({ confirmationRequired: true })

    expect(mocks.invoke).toHaveBeenCalledWith('signup', {
      body: {
        username: 'new-client',
        email: 'new@example.com',
        password: 'secret1',
        role: 'client',
      },
    })
    expect(mocks.setSession).not.toHaveBeenCalled()
  })
})

describe('social and password recovery auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('window', { location: { origin: 'http://localhost' } })
    mocks.signInWithOAuth.mockResolvedValue({ error: null })
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null })
    mocks.updateUser.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts the requested social provider with the app callback', async () => {
    await signInWithOAuth('apple')
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    })
  })

  it('sends password recovery links to the password update screen', async () => {
    await requestPasswordReset('person@example.com')
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith('person@example.com', {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    })
  })

  it('updates the password through Supabase Auth', async () => {
    await updatePassword('new-secret')
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'new-secret' })
  })
})
