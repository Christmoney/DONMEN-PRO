import { beforeEach, describe, expect, it, vi } from 'vitest'

const query = vi.hoisted(() => ({
  select: vi.fn(),
  gte: vi.fn(),
  order: vi.fn(),
  eq: vi.fn(),
}))
const from = vi.hoisted(() => vi.fn())
const rpc = vi.hoisted(() => vi.fn())

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from,
    rpc,
    storage: {
      from: () => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.example/${path}` } }) }),
    },
  },
}))

import { getAvailableSlots, getHairdresserServices, getPublishedHairdressers } from './api'

beforeEach(() => {
  vi.clearAllMocks()
  query.select.mockReturnValue(query)
  query.gte.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.order.mockResolvedValue({ data: [], error: null })
  from.mockReturnValue(query)
  rpc.mockResolvedValue({ data: [], error: null })
})

describe('hairdresser client API', () => {
  it('only reads published profiles at or above 50 percent that are available', async () => {
    query.order.mockResolvedValue({
      data: [{
        user_id: '719343e1-659b-4c36-8a3c-7f53cc23407f',
        display_name: 'Aline',
        zone: 'Akwa',
        specialties: ['Tresses'],
        bio: 'Coiffeuse professionnelle.',
        rating: 0,
        starting_price: 18000,
        service_names: ['Knotless'],
        profile_completion: 50,
        years_experience: 5,
        avatar_path: null,
        is_available: true,
        updated_at: '2026-11-16T08:00:00Z',
      }],
      error: null,
    })

    const hairdressers = await getPublishedHairdressers()

    expect(from).toHaveBeenCalledWith('public_hairdressers')
    expect(query.gte).toHaveBeenCalledWith('profile_completion', 50)
    expect(query.eq).toHaveBeenCalledWith('is_available', true)
    expect(hairdressers).toHaveLength(1)
    expect(hairdressers[0]).toMatchObject({
      id: '719343e1-659b-4c36-8a3c-7f53cc23407f',
      name: 'Aline',
      price: 18000,
      zone: 'Akwa',
      profileCompletion: 50,
      serviceNames: ['Knotless'],
    })
  })

  it('loads active services from the linked catalog table', async () => {
    query.order.mockResolvedValue({
      data: [{
        id: '719343e1-659b-4c36-8a3c-7f53cc23407f',
        hairdresser_id: '6a9343e1-659b-4c36-8a3c-7f53cc23407f',
        name: 'Knotless',
        category: 'Tresses',
        description: 'Tresses légères.',
        price_fcfa: 18000,
        duration_min: 90,
        photo_path: null,
        is_active: true,
      }],
      error: null,
    })

    const services = await getHairdresserServices('6a9343e1-659b-4c36-8a3c-7f53cc23407f')

    expect(from).toHaveBeenCalledWith('services')
    expect(query.eq).toHaveBeenCalledWith('is_active', true)
    expect(services[0]).toMatchObject({
      name: 'Knotless',
      price: 18000,
      duration: '1 h 30',
      durationMinutes: 90,
    })
  })

  it('requests slots from the server with the selected real services', async () => {
    rpc.mockResolvedValue({
      data: [{ slot: '2026-11-17T09:00:00Z' }],
      error: null,
    })

    await expect(getAvailableSlots('6a9343e1-659b-4c36-8a3c-7f53cc23407f', '2026-11-17', [
      '719343e1-659b-4c36-8a3c-7f53cc23407f',
    ])).resolves.toEqual(['2026-11-17T09:00:00Z'])

    expect(rpc).toHaveBeenCalledWith('get_available_slots', {
      p_hairdresser_id: '6a9343e1-659b-4c36-8a3c-7f53cc23407f',
      p_date: '2026-11-17',
      p_service_ids: ['719343e1-659b-4c36-8a3c-7f53cc23407f'],
    })
  })
})
