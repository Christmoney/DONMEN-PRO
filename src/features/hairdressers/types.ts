export type HairdresserCatalogCategory = 'Tresses' | 'Tissage' | 'Coupe' | 'Soins'

export type HairdresserService = {
  id: string
  name: string
  category: HairdresserCatalogCategory
  price: number
  duration: string
  durationMinutes: number
  description: string
  photo?: string
}

export type Hairdresser = {
  id: string
  userId: string
  name: string
  rating: number
  price: number
  zone: string
  specialties: string[]
  avatar: string
  avatarUrl?: string
  bio: string
  serviceNames?: string[]
  services?: HairdresserService[]
  profileCompletion: number
}

export type ClientBookingStatus =
  | 'pending'
  | 'accepted'
  | 'on_the_way'
  | 'in_progress'
  | 'completed'
  | 'declined'
  | 'cancelled'
  | 'expired'

export type ClientBooking = {
  id: string
  hairdresserId: string
  hairdresserName: string
  scheduledAt: string
  endsAt: string
  totalPrice: number
  status: ClientBookingStatus
  services: Array<{ name: string; durationMinutes: number }>
}
