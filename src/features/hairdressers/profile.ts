import type { HairdresserCatalogCategory } from './types'

export type { HairdresserCatalogCategory } from './types'

export type HairdresserPublicProfile = {
  presentation: string
  specialties: string
  neighborhoods: string
  experience: string
  languages: string
  social: string
  bringKit: boolean
  photo?: string
}

export type HairdresserCatalogItem = {
  id: string
  name: string
  category: HairdresserCatalogCategory
  price: number
  duration: string
  description: string
  photo?: string
}

export function getHairdresserProfileCompletion(
  firstName: string,
  profile: HairdresserPublicProfile,
  services: HairdresserCatalogItem[],
) {
  const experience = profile.experience.trim() ? Number(profile.experience) : null
  return (firstName.trim() ? 10 : 0)
    + (profile.presentation.trim() ? 15 : 0)
    + (profile.photo?.trim() ? 10 : 0)
    + (splitProfileList(profile.specialties).length ? 15 : 0)
    + (splitProfileList(profile.neighborhoods).length ? 15 : 0)
    + (experience !== null && Number.isInteger(experience) && experience >= 0 ? 10 : 0)
    + (splitProfileList(profile.languages).length ? 10 : 0)
    + (profile.social.trim() ? 5 : 0)
    + (services.length ? 10 : 0)
}

export function splitProfileList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}
