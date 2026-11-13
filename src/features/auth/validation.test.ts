import { describe, expect, it } from 'vitest'

import { clientSignupSchema, hairdresserSignupSchema, normalizeCameroonPhone } from './validation'

const validClient = {
  username: 'Christ_1',
  firstName: 'Christ',
  phone: '+237 6 12 34 56 78',
  password: 'secret1',
  gender: 'male' as const,
  acceptedTerms: true as const,
}

describe('clientSignupSchema', () => {
  it('accepts a valid Cameroon client signup and formatted phone', () => {
    expect(clientSignupSchema.safeParse(validClient).success).toBe(true)
    expect(normalizeCameroonPhone(validClient.phone)).toBe('+237612345678')
  })

  it('rejects short usernames, invalid phones, and missing consent', () => {
    expect(clientSignupSchema.safeParse({ ...validClient, username: 'ab' }).success).toBe(false)
    expect(clientSignupSchema.safeParse({ ...validClient, phone: '612345678' }).success).toBe(false)
    expect(clientSignupSchema.safeParse({ ...validClient, acceptedTerms: false }).success).toBe(false)
  })

  it('requires complete professional details and at least one specialty', () => {
    const result = hairdresserSignupSchema.safeParse({
      ...validClient,
      lastName: 'Moua',
      city: 'Douala',
      coverageAreas: 'Akwa',
      specialties: [],
      yearsExperience: 3,
    })
    expect(result.success).toBe(false)
  })
})
