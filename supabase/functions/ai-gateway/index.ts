import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || ''
const allowedOrigins = new Set([
  'http://localhost:5173',
  Deno.env.get('APP_ORIGIN') || '',
].filter(Boolean))

const MAX_PROMPT_LENGTH = 20_000
const MAX_INLINE_DATA_LENGTH = 7_000_000
const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const CANDIDATE_MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest']

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  }
}

serve(async (request) => {
  const headers = corsHeaders(request.headers.get('origin'))
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed.' }), { status: 405, headers })
  if (!supabaseUrl || !supabaseAnonKey || !geminiApiKey) {
    return new Response(JSON.stringify({ error: 'AI gateway is not configured.' }), { status: 503, headers })
  }

  // Pre-parse request body size validation
  const contentLength = Number(request.headers.get('content-length') || '0')
  if (contentLength > MAX_REQUEST_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'Request body exceeds maximum allowed size (10 MB).' }), { status: 413, headers })
  }

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication is required.' }), { status: 401, headers })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid authentication session.' }), { status: 401, headers })
  }

  try {
    const { prompt, systemInstruction, inlineData, maxOutputTokens, temperature } = await request.json()
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > MAX_PROMPT_LENGTH) {
      return new Response(JSON.stringify({ error: 'Prompt must be between 1 and 20,000 characters.' }), { status: 400, headers })
    }

    const parts: Array<Record<string, unknown>> = [{ text: prompt.trim() }]
    if (inlineData?.base64Data) {
      if (typeof inlineData.base64Data !== 'string' || inlineData.base64Data.length > MAX_INLINE_DATA_LENGTH) {
        return new Response(JSON.stringify({ error: 'Attachment is too large for AI processing.' }), { status: 413, headers })
      }
      const match = inlineData.base64Data.match(/^data:([^;]+);base64,(.*)$/)
      const mime = match?.[1] || inlineData.mimeType || 'image/jpeg'
      if (!ALLOWED_MIME_TYPES.has(mime.toLowerCase())) {
        return new Response(JSON.stringify({ error: 'Unsupported attachment type. Allowed: JPEG, PNG, WEBP, PDF.' }), { status: 400, headers })
      }

      parts.unshift({
        inline_data: {
          mime_type: mime,
          data: match?.[2] || inlineData.base64Data,
        },
      })
    }

    let lastError = null
    for (const model of CANDIDATE_MODELS) {
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => abortController.abort(), 20_000)

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: abortController.signal,
            body: JSON.stringify({
              contents: [{ role: 'user', parts }],
              ...(typeof systemInstruction === 'string' && systemInstruction.length <= MAX_PROMPT_LENGTH
                ? { system_instruction: { parts: [{ text: systemInstruction }] } }
                : {}),
              generationConfig: {
                temperature: typeof temperature === 'number' ? Math.min(Math.max(temperature, 0), 1) : 0.4,
                maxOutputTokens: typeof maxOutputTokens === 'number' ? Math.min(Math.max(Math.floor(maxOutputTokens), 64), 2048) : 1024,
              },
            }),
          },
        )
        clearTimeout(timeoutId)

        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          console.warn(`AI provider error for ${model}:`, response.status, body?.error?.status)
          lastError = body?.error?.message || response.statusText
          continue
        }

        const body = await response.json()
        const text = body.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('').trim()
        if (text) {
          return new Response(JSON.stringify({ text }), { status: 200, headers })
        }
      } catch (err) {
        clearTimeout(timeoutId)
        lastError = err instanceof Error ? err.message : 'Fetch failed'
      }
    }

    return new Response(JSON.stringify({ error: 'The AI provider could not complete this request.' }), { status: 502, headers })
  } catch (error) {
    console.error('AI gateway error', error instanceof Error ? error.message : 'Unknown error')
    return new Response(JSON.stringify({ error: 'Unable to process the AI request.' }), { status: 500, headers })
  }
})
