import { describe, expect, it } from 'vitest'

import { getHairdresserProfileCompletion } from './profile'

const emptyProfile = {
  presentation: '',
  specialties: '',
  neighborhoods: '',
  experience: '',
  languages: '',
  social: '',
  bringKit: false,
}

describe('getHairdresserProfileCompletion', () => {
  it('does not count the untouched default profile as complete', () => {
    expect(getHairdresserProfileCompletion('Aline', emptyProfile, [])).toBe(10)
  })

  it('calculates the profile completion used by the 50 percent publication threshold', () => {
    const belowThreshold = {
      ...emptyProfile,
      presentation: 'Coiffeuse professionnelle.',
      specialties: 'Tresses',
    }
    const eligible = { ...belowThreshold, neighborhoods: 'Akwa' }

    expect(getHairdresserProfileCompletion('Aline', belowThreshold, [])).toBe(40)
    expect(getHairdresserProfileCompletion('Aline', eligible, [])).toBe(55)
    expect(getHairdresserProfileCompletion('Aline', eligible, []) >= 50).toBe(true)
  })

  it('ignores empty list separators and invalid experience values', () => {
    const incomplete = {
      ...emptyProfile,
      specialties: ' , ',
      neighborhoods: ' , ',
      experience: 'not a number',
      languages: ' , ',
    }

    expect(getHairdresserProfileCompletion('Aline', incomplete, [])).toBe(10)
  })
})
