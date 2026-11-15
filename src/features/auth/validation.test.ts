import { describe, expect, it } from 'vitest'

import { clientSignupSchema, hairdresserSignupSchema } from './validation'

const validClient = {
  username: 'Christ_1',
  email: 'christ@example.com',
  firstName: 'Christ',
  password: 'secret1',
  gender: 'male' as const,
  acceptedTerms: true as const,
}

describe('clientSignupSchema', () => {
  it('accepts a valid client signup without a phone number', () => {
    expect(clientSignupSchema.safeParse(validClient).success).toBe(true)
  })

  it('rejects short usernames, invalid emails, and missing consent', () => {
    expect(clientSignupSchema.safeParse({ ...validClient, username: 'ab' }).success).toBe(false)
    expect(clientSignupSchema.safeParse({ ...validClient, email: 'invalid' }).success).toBe(false)
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
