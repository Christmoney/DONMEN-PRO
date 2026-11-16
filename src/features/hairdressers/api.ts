import { z } from 'zod'

import type { HairdresserPublicProfile, HairdresserCatalogItem } from './profile'
import { splitProfileList } from './profile'
import type { ClientBooking, Hairdresser, HairdresserService } from './types'
import { supabase } from '../../lib/supabase'

const publicProfileSchema = z.object({
  user_id: z.string().uuid(),
  display_name: z.string(),
  zone: z.string(),
  specialties: z.array(z.string()),
  bio: z.string(),
  rating: z.coerce.number().min(0).max(5),
  starting_price: z.coerce.number().int().nonnegative(),
  service_names: z.array(z.string()),
  profile_completion: z.number().int().min(0).max(100),
  years_experience: z.number().int().nonnegative().nullable(),
  avatar_path: z.string().nullable(),
  is_available: z.boolean(),
  updated_at: z.string(),
})

const serviceRowSchema = z.object({
  id: z.string().uuid(),
  hairdresser_id: z.string().uuid(),
  name: z.string(),
  category: z.enum(['Tresses', 'Tissage', 'Coupe', 'Soins']),
  description: z.string(),
  price_fcfa: z.number().int().nonnegative(),
  duration_min: z.number().int().positive(),
  photo_path: z.string().nullable(),
  is_active: z.boolean(),
})

const bookingRowSchema = z.object({
  id: z.string().uuid(),
  hairdresser_id: z.string().uuid(),
  hairdresser_display_name: z.string(),
  scheduled_at: z.string(),
  ends_at: z.string(),
  total_price_fcfa: z.number().int().nonnegative(),
  status: z.enum(['pending', 'accepted', 'on_the_way', 'in_progress', 'completed', 'declined', 'cancelled', 'expired']),
  booking_items: z.array(z.object({
    name: z.string(),
    duration_min: z.number().int().positive(),
  })),
})

type PublicProfileRow = z.infer<typeof publicProfileSchema>
type ServiceRow = z.infer<typeof serviceRowSchema>

function getClient() {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré. Les profils et réservations ne sont pas disponibles.')
  }
  return supabase
}

function publicAssetUrl(bucket: 'avatars' | 'gallery', path: string | null) {
  if (!path) return undefined
  return getClient().storage.from(bucket).getPublicUrl(path).data.publicUrl
}

function toDurationLabel(durationMinutes: number) {
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  if (!hours) return `${minutes} min`
  return minutes ? `${hours} h ${minutes}` : `${hours} h`
}

function toHairdresser(row: PublicProfileRow): Hairdresser {
  return {
    id: row.user_id,
    userId: row.user_id,
    name: row.display_name,
    rating: row.rating,
    price: row.starting_price,
    zone: row.zone,
    specialties: row.specialties,
    avatar: row.display_name.slice(0, 1).toUpperCase(),
    avatarUrl: publicAssetUrl('avatars', row.avatar_path),
    bio: row.bio,
    serviceNames: row.service_names,
    profileCompletion: row.profile_completion,
  }
}

function toHairdresserService(row: ServiceRow): HairdresserService {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price_fcfa,
    duration: toDurationLabel(row.duration_min),
    durationMinutes: row.duration_min,
    description: row.description,
    photo: publicAssetUrl('gallery', row.photo_path),
  }
}

function parseDuration(duration: string) {
  const hourMatch = duration.match(/^\s*(\d+)\s*h(?:\s*(\d+))?/i)
  if (hourMatch) return Number(hourMatch[1]) * 60 + Number(hourMatch[2] ?? 0)
  const minuteMatch = duration.match(/^\s*(\d+)\s*min/i)
  if (minuteMatch) return Number(minuteMatch[1])
  throw new Error(`Durée de prestation non reconnue : ${duration}`)
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function getStoragePath(bucket: 'avatars' | 'gallery', value: string) {
  const prefix = `${getClient().storage.from(bucket).getPublicUrl('').data.publicUrl}`
  const marker = `/storage/v1/object/public/${bucket}/`
  const markerIndex = prefix.indexOf(marker)
  const publicPrefix = markerIndex >= 0 ? prefix.slice(0, markerIndex + marker.length) : ''
  if (publicPrefix && value.startsWith(publicPrefix)) {
    return decodeURIComponent(value.slice(publicPrefix.length))
  }
  return null
}

async function uploadImage(bucket: 'avatars' | 'gallery', userId: string, id: string, image: string) {
  if (!image) return null
  const client = getClient()
  const savedPath = getStoragePath(bucket, image)
  if (savedPath) return savedPath
  if (!image.startsWith('data:image/')) {
    throw new Error('La photo doit être une image envoyée dans votre espace DONMEN.')
  }

  const blob = await fetch(image).then((response) => response.blob())
  const path = `${userId}/${id}`
  const { error } = await client.storage.from(bucket).upload(path, blob, {
    upsert: true,
    contentType: blob.type,
  })
  if (error) throw error
  return path
}

async function loadServices(hairdresserId: string, activeOnly: boolean) {
  let request = getClient()
    .from('services')
    .select('id, hairdresser_id, name, category, description, price_fcfa, duration_min, photo_path, is_active')
    .eq('hairdresser_id', hairdresserId)
  if (activeOnly) request = request.eq('is_active', true)

  const { data, error } = await request.order('created_at', { ascending: true })
  if (error) throw error
  return z.array(serviceRowSchema).parse(data).map(toHairdresserService)
}

export async function getPublishedHairdressers(): Promise<Hairdresser[]> {
  const { data, error } = await getClient()
    .from('public_hairdressers')
    .select('user_id, display_name, zone, specialties, bio, rating, starting_price, service_names, profile_completion, years_experience, avatar_path, is_available, updated_at')
    .gte('profile_completion', 50)
    .eq('is_available', true)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return z.array(publicProfileSchema).parse(data).map(toHairdresser)
}

export async function getHairdresserServices(hairdresserId: string) {
  return loadServices(hairdresserId, true)
}

export async function getMyHairdresserPublicProfile(userId: string): Promise<{
  profile: HairdresserPublicProfile
  services: HairdresserCatalogItem[]
  available: boolean
  hours: Array<{ open: boolean; start: string; end: string }>
} | null> {
  const { data, error } = await getClient()
    .from('hairdresser_public_profiles')
    .select('user_id, display_name, zone, specialties, bio, rating, profile_completion, years_experience, languages, social_url, brings_kit, avatar_path, is_available')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = z.object({
    user_id: z.string().uuid(),
    display_name: z.string(),
    zone: z.string(),
    specialties: z.array(z.string()),
    bio: z.string(),
    rating: z.coerce.number(),
    profile_completion: z.number().int(),
    years_experience: z.number().int().nullable(),
    languages: z.array(z.string()),
    social_url: z.string().nullable(),
    brings_kit: z.boolean(),
    avatar_path: z.string().nullable(),
    is_available: z.boolean(),
  }).parse(data)
  const [services, availabilityResult] = await Promise.all([
    loadServices(userId, false),
    getClient()
      .from('availabilities')
      .select('weekday, start_time, end_time')
      .eq('hairdresser_id', userId)
      .order('weekday', { ascending: true }),
  ])
  if (availabilityResult.error) throw availabilityResult.error

  const hours = Array.from({ length: 7 }, (_, index) => {
    const weekday = index + 1
    const day = availabilityResult.data.find((entry) => entry.weekday === weekday)
    return {
      open: Boolean(day),
      start: day ? String(day.start_time).slice(0, 5) : '08:00',
      end: day ? String(day.end_time).slice(0, 5) : '18:00',
    }
  })

  return {
    profile: {
      presentation: row.bio,
      specialties: row.specialties.join(', '),
      neighborhoods: row.zone,
      experience: row.years_experience === null ? '' : String(row.years_experience),
      languages: row.languages.join(', '),
      social: row.social_url ?? '',
      bringKit: row.brings_kit,
      photo: publicAssetUrl('avatars', row.avatar_path) ?? '',
    },
    services: services.map((service) => ({ ...service, photo: service.photo ?? '' })),
    available: row.is_available,
    hours,
  }
}

export async function saveHairdresserPublicProfile(
  userId: string,
  firstName: string,
  profile: HairdresserPublicProfile,
  services: HairdresserCatalogItem[],
  available: boolean,
  hours: Array<{ open: boolean; start: string; end: string }>,
) {
  const client = getClient()
  const yearsExperience = profile.experience.trim() ? Number(profile.experience) : null
  if (yearsExperience !== null && (!Number.isInteger(yearsExperience) || yearsExperience < 0)) {
    throw new Error('Les années d’expérience doivent être un nombre entier positif.')
  }

  const avatarPath = await uploadImage('avatars', userId, 'profile', profile.photo ?? '')
  const row = {
    user_id: userId,
    display_name: firstName.trim(),
    zone: splitProfileList(profile.neighborhoods).join(', '),
    specialties: splitProfileList(profile.specialties),
    bio: profile.presentation.trim(),
    years_experience: yearsExperience,
    languages: splitProfileList(profile.languages),
    social_url: profile.social.trim() || null,
    brings_kit: profile.bringKit,
    avatar_path: avatarPath,
    is_available: available,
    updated_at: new Date().toISOString(),
  }

  const { error: profileError } = await client
    .from('hairdresser_public_profiles')
    .upsert(row, { onConflict: 'user_id' })
  if (profileError) throw profileError

  const savedServices = await Promise.all(services.map(async (service) => {
    const id = isUuid(service.id) ? service.id : crypto.randomUUID()
    const photoPath = await uploadImage('gallery', userId, id, service.photo ?? '')
    return {
      id,
      hairdresser_id: userId,
      name: service.name.trim(),
      category: service.category,
      description: service.description.trim(),
      price_fcfa: service.price,
      duration_min: parseDuration(service.duration),
      photo_path: photoPath,
      is_active: true,
    }
  }))

  if (savedServices.length) {
    const { error: servicesError } = await client
      .from('services')
      .upsert(savedServices, { onConflict: 'id' })
    if (servicesError) throw servicesError
  }

  let staleServicesRequest = client.from('services').delete().eq('hairdresser_id', userId)
  if (savedServices.length) {
    staleServicesRequest = staleServicesRequest.not(
      'id',
      'in',
      `(${savedServices.map((service) => service.id).join(',')})`,
    )
  }
  const { error: staleServicesError } = await staleServicesRequest
  if (staleServicesError) throw staleServicesError

  const schedule = hours.flatMap((day, index) => day.open ? [{
    hairdresser_id: userId,
    weekday: index + 1,
    start_time: day.start,
    end_time: day.end,
  }] : [])
  const { error: clearAvailabilityError } = await client
    .from('availabilities')
    .delete()
    .eq('hairdresser_id', userId)
  if (clearAvailabilityError) throw clearAvailabilityError
  if (schedule.length) {
    const { error: availabilityError } = await client.from('availabilities').insert(schedule)
    if (availabilityError) throw availabilityError
  }

  const savedProfile: HairdresserPublicProfile = {
    ...profile,
    photo: publicAssetUrl('avatars', avatarPath) ?? '',
  }
  return {
    profile: savedProfile,
    services: savedServices.map((service) => ({
      id: service.id,
      name: service.name,
      category: service.category,
      price: service.price_fcfa,
      duration: toDurationLabel(service.duration_min),
      description: service.description,
      photo: publicAssetUrl('gallery', service.photo_path) ?? '',
    })),
  }
}

export async function getAvailableSlots(hairdresserId: string, date: string, serviceIds: string[]) {
  if (!serviceIds.length) return []
  const { data, error } = await getClient().rpc('get_available_slots', {
    p_hairdresser_id: hairdresserId,
    p_date: date,
    p_service_ids: serviceIds,
  })
  if (error) throw error
  return z.array(z.object({ slot: z.string() })).parse(data).map(({ slot }) => slot)
}

export async function createBooking(input: {
  hairdresserId: string
  serviceIds: string[]
  scheduledAt: string
  address: string
  accessNotes: string
}) {
  const { data, error } = await getClient().rpc('create_booking', {
    p_hairdresser_id: input.hairdresserId,
    p_service_ids: input.serviceIds,
    p_scheduled_at: input.scheduledAt,
    p_address_text: input.address.trim(),
    p_access_notes: input.accessNotes.trim() || null,
    p_latitude: null,
    p_longitude: null,
  })
  if (error) throw error
  return z.string().uuid().parse(data)
}

export async function getClientBookings(): Promise<ClientBooking[]> {
  const client = getClient()
  const { data: userResult, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!userResult.user) throw new Error('Connectez-vous pour consulter vos rendez-vous.')

  const { data, error } = await client
    .from('bookings')
    .select('id, hairdresser_id, hairdresser_display_name, scheduled_at, ends_at, total_price_fcfa, status, booking_items(name, duration_min)')
    .eq('client_id', userResult.user.id)
    .order('scheduled_at', { ascending: true })
  if (error) throw error

  return z.array(bookingRowSchema).parse(data).map((booking) => ({
    id: booking.id,
    hairdresserId: booking.hairdresser_id,
    hairdresserName: booking.hairdresser_display_name,
    scheduledAt: booking.scheduled_at,
    endsAt: booking.ends_at,
    totalPrice: booking.total_price_fcfa,
    status: booking.status,
    services: booking.booking_items.map((service) => ({
      name: service.name,
      durationMinutes: service.duration_min,
    })),
  }))
}

export async function cancelBooking(bookingId: string) {
  const { error } = await getClient().rpc('cancel_booking', { p_booking_id: bookingId })
  if (error) throw error
}
