import { describe, expect, it } from 'vitest'

import { clientSignupSchema } from './validation'

const validClient = {
  username: 'Christ_1',
  email: 'christ@example.com',
  password: 'secret1',
  confirmPassword: 'secret1',
}

describe('clientSignupSchema', () => {
  it('accepts the email and username signup fields', () => {
    expect(clientSignupSchema.safeParse(validClient).success).toBe(true)
  })

  it('rejects short usernames, invalid emails, and mismatched passwords', () => {
    expect(clientSignupSchema.safeParse({ ...validClient, username: 'ab' }).success).toBe(false)
    expect(clientSignupSchema.safeParse({ ...validClient, email: 'invalid' }).success).toBe(false)
    expect(clientSignupSchema.safeParse({ ...validClient, confirmPassword: 'different' }).success).toBe(false)
  })
})
