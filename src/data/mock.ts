export type Hairdresser = {
  id: number
  name: string
  rating: number
  price: number
  zone: string
  specialties: string[]
  avatar: string
  bio: string
}

export const hairdressers: Hairdresser[] = [
  {
    id: 1,
    name: 'Aline M.',
    rating: 4.8,
    price: 15000,
    zone: 'Mokolo',
    specialties: ['Tresses', 'Soins'],
    avatar: 'A',
    bio: 'Coiffeuse spécialisée dans les tresses et les soins capillaires pour cheveux crépus.',
  },
  {
    id: 2,
    name: 'Grace T.',
    rating: 4.9,
    price: 18500,
    zone: 'Bastos',
    specialties: ['Coupe', 'Tissage'],
    avatar: 'G',
    bio: 'Fine coupe et tissage pour un look structuré, propre et durable.',
  },
  {
    id: 3,
    name: 'Léa B.',
    rating: 4.7,
    price: 12000,
    zone: 'Bonamoussadi',
    specialties: ['Coloration', 'Soins'],
    avatar: 'L',
    bio: 'Mieux vaut des soins doux et une coloration maîtrisée pour un rendu naturel.',
  },
]

export const services = [
  { id: 'tresses', name: 'Tresses', duration: '2 h 30', price: 15000 },
  { id: 'coupe', name: 'Coupe', duration: '1 h 15', price: 8500 },
  { id: 'tissage', name: 'Tissage', duration: '2 h 00', price: 12000 },
  { id: 'soins', name: 'Soins', duration: '1 h 00', price: 7000 },
]

export const timeSlots = ['08:30', '09:00', '10:30', '12:00', '14:00', '15:30', '17:00', '18:30']

export const upcomingAppointments = [
  { id: 'apt-1', title: 'Tresses · 2 h 30', date: 'Samedi 14 juin · 08:30', status: 'Accepté' },
  { id: 'apt-2', title: 'Coupe + soin', date: 'Lundi 16 juin · 15:30', status: 'Coiffeur en route' },
]
