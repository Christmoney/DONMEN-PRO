import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  setSession: vi.fn(),
  from: vi.fn(),
  invoke: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: mocks.getUser, setSession: mocks.setSession },
    from: mocks.from,
    functions: { invoke: mocks.invoke },
  },
}))

import { getProfile, signup } from './api'

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
      firstName: 'New',
      password: 'secret1',
      gender: 'male',
      acceptedTerms: true,
    })).resolves.toEqual({ confirmationRequired: true })

    expect(mocks.invoke).toHaveBeenCalledWith('signup', {
      body: expect.objectContaining({
        email: 'new@example.com',
        role: 'client',
      }),
    })
    expect(mocks.invoke.mock.calls[0][1].body).not.toHaveProperty('phone')
    expect(mocks.setSession).not.toHaveBeenCalled()
  })
})
