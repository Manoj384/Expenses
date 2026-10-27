import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const appOrigin = Deno.env.get('APP_ORIGIN') || ''
const allowedOrigins = new Set(['http://localhost:5173', appOrigin].filter(Boolean))
// Accept existing legacy links while new links use 192 bits of cryptographic entropy.
const SHARE_TOKEN_PATTERN = /^trip_(?:[a-f0-9]{48}|[a-z0-9]{9})$/
const MAX_NAME_LENGTH = 160
const MAX_DESCRIPTION_LENGTH = 20_000
const MAX_MEMBERS = 100
const MAX_EXPENSES = 5_000

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validateToken(value: unknown): value is string {
  return typeof value === 'string' && SHARE_TOKEN_PATTERN.test(value)
}

function validateUpdates(value: unknown) {
  if (!isRecord(value)) return null
  const updates: Record<string, unknown> = {}
  if (value.name !== undefined) {
    if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > MAX_NAME_LENGTH) return null
    updates.name = value.name.trim()
  }
  if (value.icon !== undefined) {
    if (typeof value.icon !== 'string' || value.icon.length > 16) return null
    updates.icon = value.icon
  }
  if (value.budget !== undefined) {
    const budget = Number(value.budget)
    if (!Number.isFinite(budget) || budget < 0 || budget > 100_000_000) return null
    updates.budget = budget
  }
  if (value.description !== undefined) {
    if (typeof value.description !== 'string' || value.description.length > MAX_DESCRIPTION_LENGTH) return null
    updates.description = value.description
  }
  if (value.members !== undefined) {
    if (!Array.isArray(value.members) || value.members.length > MAX_MEMBERS) return null
    updates.members = value.members
  }
  if (value.expenses !== undefined) {
    if (!Array.isArray(value.expenses) || value.expenses.length > MAX_EXPENSES) return null
    updates.expenses = value.expenses
  }
  return Object.keys(updates).length ? updates : null
}

serve(async (request) => {
  const headers = corsHeaders(request.headers.get('origin'))
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed.' }), { status: 405, headers })
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Shared trip service is not configured.' }), { status: 503, headers })
  }

  try {
    const body = await request.json()
    const { action, shareToken } = body
    if (!validateToken(shareToken)) {
      return new Response(JSON.stringify({ error: 'Invalid shared trip link.' }), { status: 400, headers })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    if (action === 'get') {
      const { data, error } = await supabase
        .from('shared_splitwise_groups')
        .select('id, share_token, name, description, icon, budget, members, expenses, created_at, updated_at')
        .eq('share_token', shareToken)
        .maybeSingle()
      if (error) throw error
      if (!data) return new Response(JSON.stringify({ error: 'Shared trip not found or link has expired.' }), { status: 404, headers })
      return new Response(JSON.stringify({ group: data }), { headers })
    }

    if (action === 'update') {
      const updates = validateUpdates(body.updates)
      if (!updates) return new Response(JSON.stringify({ error: 'Invalid shared trip update.' }), { status: 400, headers })
      const { data, error } = await supabase
        .from('shared_splitwise_groups')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('share_token', shareToken)
        .select('id, share_token, name, description, icon, budget, members, expenses, created_at, updated_at')
        .maybeSingle()
      if (error) throw error
      if (!data) return new Response(JSON.stringify({ error: 'Shared trip not found or link has expired.' }), { status: 404, headers })
      return new Response(JSON.stringify({ group: data }), { headers })
    }

    return new Response(JSON.stringify({ error: 'Unsupported action.' }), { status: 400, headers })
  } catch (error) {
    console.error('shared-trip error', error instanceof Error ? error.message : 'Unknown error')
    return new Response(JSON.stringify({ error: 'Unable to process the shared trip request.' }), { status: 500, headers })
  }
})
