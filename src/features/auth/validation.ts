import { z } from 'zod'

import { MIN_PASSWORD_LENGTH } from '../../config/brand'

const signupFields = {
  username: z.string().trim().min(3, 'Le nom d’utilisateur doit contenir au moins 3 caractères.').max(20, 'Le nom d’utilisateur doit contenir au plus 20 caractères.').regex(/^[a-zA-Z0-9._-]+$/, 'Utilisez uniquement des lettres, chiffres, points, tirets et tirets bas.'),
  email: z.string().trim().toLowerCase().email('Saisissez une adresse e-mail valide.').max(254),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`).max(256),
  confirmPassword: z.string().min(1, 'Confirmez votre mot de passe.').max(256),
}

export const clientSignupSchema = z.object(signupFields).refine(
  ({ password, confirmPassword }) => password === confirmPassword,
  { path: ['confirmPassword'], message: 'Les mots de passe ne correspondent pas.' },
)

export type SignupInput = z.infer<typeof clientSignupSchema>
