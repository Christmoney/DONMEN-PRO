import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(256),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error('Missing Supabase Edge Function configuration')
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function hashIdentifier(email: string) {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase())
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(serviceRoleKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign('HMAC', key, bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ message: 'Method not allowed' }, 405)

  let input: z.infer<typeof loginSchema>
  try {
    input = loginSchema.parse(await request.json())
  } catch {
    return jsonResponse({ message: 'Identifiants incorrects' }, 400)
  }

  const identifierHash = await hashIdentifier(input.email)
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { count, error: countError } = await admin
    .from('auth_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('identifier_hash', identifierHash)
    .eq('succeeded', false)
    .gte('attempted_at', since)

  if (countError) return jsonResponse({ message: 'Service temporairement indisponible.' }, 503)
  if ((count ?? 0) >= 10) return jsonResponse({ message: 'Identifiants incorrects' }, 429)

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await authClient.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })

  const { error: attemptError } = await admin.from('auth_attempts').insert({
    identifier_hash: identifierHash,
    succeeded: !error && Boolean(data.session),
  })
  if (attemptError) return jsonResponse({ message: 'Service temporairement indisponible.' }, 503)

  if (error || !data.session) return jsonResponse({ message: 'Identifiants incorrects' }, 401)

  return jsonResponse({
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  })
})
