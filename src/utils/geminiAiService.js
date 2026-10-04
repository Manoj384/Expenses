/**
 * Real Conversational AI Engine powered by Google Gemini API
 * Provides deep financial reasoning, overspending analysis, tax optimization,
 * portfolio diagnosis, as well as general knowledge & weather with local zero-config fallback.
 */

const GEMINI_API_KEY_STORAGE = 'manoj_gemini_api_key'
const ALT_API_KEY_STORAGE = 'ft_gemini_api_key'

export function getGeminiApiKey() {
  try {
    const saved = localStorage.getItem(ALT_API_KEY_STORAGE) || localStorage.getItem(GEMINI_API_KEY_STORAGE)
    if (saved && typeof saved === 'string') {
      const clean = saved.trim()
      if (clean && clean !== 'undefined' && clean !== 'null' && clean.length > 20) {
        return clean
      }
    }
    return import.meta?.env?.VITE_GEMINI_API_KEY || ''
  } catch {
    return import.meta?.env?.VITE_GEMINI_API_KEY || ''
  }
}

export function saveGeminiApiKey(key) {
  try {
    if (!key) {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE)
      localStorage.removeItem(ALT_API_KEY_STORAGE)
    } else {
      localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim())
      localStorage.setItem(ALT_API_KEY_STORAGE, key.trim())
    }
    return true
  } catch {
    return false
  }
}

/**
 * Builds an enriched system prompt with live financial context
 */
function buildSystemPrompt(context = {}) {
  const {
    netWorth = 1845000,
    investedAmount = 980000,
    currentPortfolio = 1250000,
    monthlyIncome = 95000,
    monthlyExpense = 32500,
    upcomingBills = [],
    recentTransactions = []
  } = context

  const billSummary = (upcomingBills || [])
    .slice(0, 5)
    .map(b => `${b.name || 'Bill'}: ₹${Number(b.amount || 0).toLocaleString('en-IN')} due day ${b.due_day}`)
    .join(', ') || 'No pending bills'

  const recentTxnSummary = (recentTransactions || [])
    .slice(0, 8)
    .map(t => `${t.date || ''} - ${t.note || 'Expense'}: ₹${Number(t.amount || 0)} (${t.type || 'expense'})`)
    .join('; ')

  return `You are Manoj's Personal Elite AI Financial Advisor & Wealth Copilot.
You have direct, real-time access to Manoj's actual financial telemetry:
- Net Worth: ₹${Number(netWorth).toLocaleString('en-IN')}
- Monthly Take-Home Income: ₹${Number(monthlyIncome).toLocaleString('en-IN')}
- This Month's Expenses: ₹${Number(monthlyExpense).toLocaleString('en-IN')}
- Mutual Funds Invested: ₹${Number(investedAmount).toLocaleString('en-IN')} (Current Value: ₹${Number(currentPortfolio).toLocaleString('en-IN')})
- Upcoming Bills: ${billSummary}
- Recent Spends: ${recentTxnSummary || 'Dining, Groceries, Fuel, Utilities'}

Guidelines for your responses:
1. Speak directly to Manoj with concise, high-impact intelligence.
2. If asked about spending, overspending, tax planning, credit cards, or investments, give specific numerical insights based on his telemetry above.
3. If asked about sports, cricket, news, weather, world facts, math calculations, coding, or lifestyle questions, answer accurately and helpfully with high precision. If an exact match did not occur on a specified date, share the closest historical match results (e.g. 2018 Rajkot Test) and head-to-head records rather than a generic refusal.
4. Keep responses under 3-4 crisp sentences suitable for fast reading and voice speech synthesis.
5. Format currency in Indian Rupees (₹).`
}

/**
 * Executes a query against Gemini API with automatic model cascading
 */
export async function queryGeminiAi(userPrompt, context = {}) {
  const apiKey = getGeminiApiKey()

  if (!apiKey) {
    return {
      success: false,
      text: null,
      error: 'NO_API_KEY',
    }
  }

  const candidateModels = [
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash',
  ]

  const systemPrompt = buildSystemPrompt(context)
  let lastError = null

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 450,
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (candidate) {
          return {
            success: true,
            text: candidate,
            speechText: candidate.replace(/[*_#`]/g, ''),
          }
        }
      } else {
        const errJson = await response.json().catch(() => ({}))
        lastError = errJson?.error?.message || `HTTP ${response.status}`
      }
    } catch (err) {
      lastError = err.message
    }
  }

  return {
    success: false,
    text: null,
    error: lastError || 'Gemini request failed',
  }
}
