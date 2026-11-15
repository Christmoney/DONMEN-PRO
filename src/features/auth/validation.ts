import { z } from 'zod'

import { MIN_PASSWORD_LENGTH } from '../../config/brand'

const commonSignupFields = {
  username: z.string().trim().min(3, 'Le nom d’utilisateur doit contenir au moins 3 caractères.').max(20, 'Le nom d’utilisateur doit contenir au plus 20 caractères.').regex(/^[a-zA-Z0-9._-]+$/, 'Utilisez uniquement des lettres, chiffres, points, tirets et tirets bas.'),
  email: z.string().trim().toLowerCase().email('Saisissez une adresse e-mail valide.').max(254),
  firstName: z.string().trim().min(1, 'Le prénom est obligatoire.'),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`),
  gender: z.enum(['female', 'male'], { message: 'Choisissez un genre.' }),
  acceptedTerms: z.literal(true, { message: 'Vous devez accepter les conditions d’utilisation.' }),
}

export const clientSignupSchema = z.object(commonSignupFields)

export const hairdresserSignupSchema = z.object({
  ...commonSignupFields,
  lastName: z.string().trim().min(1, 'Le nom est obligatoire.'),
  city: z.string().trim().min(1, 'La ville est obligatoire.'),
  coverageAreas: z.string().trim().min(1, 'Indiquez les quartiers couverts.'),
  specialties: z.array(z.string()).min(1, 'Choisissez au moins une spécialité.'),
  yearsExperience: z.number().int().min(0, 'Le nombre d’années doit être positif.').max(80, 'Le nombre d’années ne peut pas dépasser 80.'),
})

export type ClientSignupInput = z.infer<typeof clientSignupSchema>
export type HairdresserSignupInput = z.infer<typeof hairdresserSignupSchema>
export type SignupInput = ClientSignupInput | HairdresserSignupInput
