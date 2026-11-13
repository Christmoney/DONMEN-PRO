import { z } from 'zod'

import { supabase } from '../../lib/supabase'
import type { SignupInput } from './validation'
import { normalizeCameroonPhone } from './validation'

const credentialsSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
})

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

export async function login(identifier: string, password: string): Promise<void> {
  const input = credentialsSchema.parse({ identifier, password })
  const client = getClient()
  const { data, error } = await client.functions.invoke('login', {
    body: {
      identifier: input.identifier,
      password: input.password,
    },
  })

  if (error) {
    const status = error.context instanceof Response ? error.context.status : 0
    if (status === 400 || status === 401 || status === 429) {
      throw new Error('Identifiants incorrects')
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

export async function signup(input: SignupInput): Promise<void> {
  const client = getClient()
  const role = 'lastName' in input ? 'hairdresser' : 'client'
  const { data, error } = await client.functions.invoke('signup', {
    body: {
      ...input,
      phone: normalizeCameroonPhone(input.phone),
      role,
    },
  })

  if (error) {
    const status = error.context instanceof Response ? error.context.status : 0
    if (status === 400 || status === 409) {
      throw new Error('Impossible de créer le compte. Vérifiez vos informations et réessayez.')
    }
    throw new Error('Service temporairement indisponible. Réessayez plus tard.')
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
}

export async function signOut(): Promise<void> {
  const { error } = await getClient().auth.signOut()
  if (error) {
    throw error
  }
}

export async function getProfile(userId: string) {
  const { data, error } = await getClient()
    .from('profiles')
    .select('first_name, username, phone')
    .eq('id', userId)
    .single()

  if (error) {
    throw error
  }

  const { data: roleData, error: roleError } = await getClient()
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (roleError) {
    throw roleError
  }

  const role = z.enum(['client', 'hairdresser', 'admin']).parse(roleData.role)
  return { ...data, role }
}
