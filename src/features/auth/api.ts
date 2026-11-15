import { z } from 'zod'

import { supabase } from '../../lib/supabase'
import type { SignupInput } from './validation'

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

export type SignupResult = { confirmationRequired: boolean }

function getClient() {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.')
  }
  return supabase
}

function readSession(data: unknown): { access_token: string; refresh_token: string } {
  const parsed = z.object({
    access_token: z.string(),
    refresh_token: z.string(),
  }).safeParse(data)
  if (!parsed.success) {
    throw new Error('La réponse d’authentification est invalide.')
  }
  return parsed.data
}

export async function login(email: string, password: string): Promise<void> {
  const input = credentialsSchema.parse({ email, password })
  const client = getClient()
  const { data, error } = await client.functions.invoke('login', {
    body: {
      email: input.email,
      password: input.password,
    },
  })

  if (error) {
    const status = error.context instanceof Response ? error.context.status : 0
    if (status === 400 || status === 401 || status === 422 || status === 429) {
      throw new Error('Adresse e-mail ou mot de passe incorrect.')
    }
    throw new Error('Service temporairement indisponible. Réessayez plus tard.')
  }
  if (!data?.session) {
    throw new Error('Identifiants incorrects')
  }

  const session = readSession(data.session)
  const { error: sessionError } = await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
  if (sessionError) {
    throw sessionError
  }
}

export async function signup(input: SignupInput): Promise<SignupResult> {
  const client = getClient()
  const role = 'lastName' in input ? 'hairdresser' : 'client'
  const { data, error } = await client.functions.invoke('signup', {
    body: {
      ...input,
      email: input.email,
      role,
    },
  })

  if (error) {
    if (error.context instanceof Response) {
      const body = z.object({ message: z.string() }).safeParse(await error.context.json())
      if (body.success) {
        throw new Error(body.data.message)
      }
    }
    throw new Error('Service temporairement indisponible. Réessayez plus tard.')
  }
  if (data?.confirmationRequired === true) {
    return { confirmationRequired: true }
  }
  if (!data?.session) {
    throw new Error(data?.message || 'Impossible de créer le compte. Vérifiez vos informations et réessayez.')
  }

  const session = readSession(data.session)
  const { error: sessionError } = await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
  if (sessionError) {
    throw sessionError
  }
  return { confirmationRequired: false }
}

export async function signOut(): Promise<void> {
  const { error } = await getClient().auth.signOut()
  if (error) {
    throw error
  }
}

export async function getProfile(userId: string) {
  const client = getClient()
  const { data: { user: authenticatedUser }, error: authError } = await client.auth.getUser()

  if (authError) {
    throw authError
  }
  if (!authenticatedUser || authenticatedUser.id !== userId) {
    throw new Error('La session a changé. Veuillez vous reconnecter.')
  }

  const [profileResult, roleResult] = await Promise.all([
    client
      .from('profiles')
      .select('first_name, username, phone')
      .eq('id', authenticatedUser.id)
      .single(),
    client
      .from('user_roles')
      .select('role')
      .eq('user_id', authenticatedUser.id)
      .single(),
  ])

  if (profileResult.error) {
    throw profileResult.error
  }
  if (roleResult.error) {
    throw roleResult.error
  }

  const role = z.enum(['client', 'hairdresser', 'admin']).parse(roleResult.data.role)
  return { ...profileResult.data, role }
}
