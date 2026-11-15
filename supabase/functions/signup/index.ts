import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod'
import { MIN_PASSWORD_LENGTH } from '../../../src/config/brand.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const commonSignup = {
  username: z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9._-]+$/),
  email: z.string().trim().toLowerCase().email().max(254),
  firstName: z.string().trim().min(1).max(100),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(256),
  gender: z.enum(['female', 'male']),
  acceptedTerms: z.literal(true),
}

const signupSchema = z.discriminatedUnion('role', [
  z.object({ ...commonSignup, role: z.literal('client') }),
  z.object({
    ...commonSignup,
    role: z.literal('hairdresser'),
    lastName: z.string().trim().min(1).max(100),
    city: z.string().trim().min(1).max(100),
    coverageAreas: z.string().trim().min(1).max(500),
    specialties: z.array(z.string().trim().min(1).max(50)).min(1).max(10),
    yearsExperience: z.number().int().min(0).max(80),
  }),
])

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

if (!supabaseUrl || !anonKey) {
  throw new Error('Missing Supabase Edge Function configuration')
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ message: 'Method not allowed' }, 405)

  let input: z.infer<typeof signupSchema>
  try {
    input = signupSchema.parse(await request.json())
  } catch {
    return jsonResponse({ message: 'Vérifiez les informations saisies.' }, 400)
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await authClient.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        username: input.username,
        first_name: input.firstName,
        last_name: 'lastName' in input ? input.lastName : null,
        gender: input.gender,
        role: input.role,
        city: 'city' in input ? input.city : null,
        coverage_areas: 'coverageAreas' in input ? input.coverageAreas : null,
        specialties: 'specialties' in input ? input.specialties : [],
        years_experience: 'yearsExperience' in input ? input.yearsExperience : null,
      },
    },
  })

  if (error) {
    return jsonResponse({ message: 'Impossible de créer le compte. Vérifiez l’adresse e-mail et le pseudo.' }, 400)
  }
  if (!data.user) {
    return jsonResponse({ message: 'Le service d’inscription n’a pas confirmé la création du compte.' }, 502)
  }
  if (data.user.identities?.length === 0) {
    return jsonResponse({ message: 'Cette adresse e-mail est déjà associée à un compte.' }, 409)
  }
  if (!data.session) {
    return jsonResponse({ confirmationRequired: true }, 202)
  }

  return jsonResponse({
    confirmationRequired: false,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  })
})
