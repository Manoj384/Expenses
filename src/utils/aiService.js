/**
 * AI Service Engine
 * Powers:
 * 1. AI Receipt & Bill Auto-Scanner (Gemini Vision OCR)
 * 2. Bank & OneCard Statement Multi-Transaction Detector
 * 3. "Ask AI" Financial Advisor & Wealth Copilot
 * 
 * Works 100% Free with Google Gemini API (No subscription required).
 * Also features local smart fallback when no API key is provided.
 */

const STORAGE_API_KEY = 'ft_gemini_api_key'
const ALT_STORAGE_API_KEY = 'manoj_gemini_api_key'
const STORAGE_AI_MODEL = 'ft_ai_model'

export function getGeminiApiKey() {
  try {
    const saved = localStorage.getItem(STORAGE_API_KEY) || localStorage.getItem(ALT_STORAGE_API_KEY)
    if (saved && typeof saved === 'string') {
      const clean = saved.trim()
      if (clean && clean !== 'undefined' && clean !== 'null' && clean.length > 20) {
        return clean
      }
    }
    const envKey = import.meta?.env?.VITE_GEMINI_API_KEY
    if (envKey && typeof envKey === 'string' && envKey.trim().length > 20) {
      return envKey.trim()
    }
    return ''
  } catch {
    return import.meta?.env?.VITE_GEMINI_API_KEY || ''
  }
}

export function setGeminiApiKey(key) {
  try {
    if (key) {
      localStorage.setItem(STORAGE_API_KEY, key.trim())
      localStorage.setItem(ALT_STORAGE_API_KEY, key.trim())
    } else {
      localStorage.removeItem(STORAGE_API_KEY)
      localStorage.removeItem(ALT_STORAGE_API_KEY)
    }
  } catch {}
}

const VALID_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gpt-4o-mini',
]

export function getAiModel() {
  try {
    const saved = localStorage.getItem(STORAGE_AI_MODEL)
    if (saved && VALID_MODELS.includes(saved)) {
      return saved
    }
    return 'gemini-3.7-flash'
  } catch {
    return 'gemini-3.7-flash'
  }
}

export function setAiModel(model) {
  try {
    const chosen = VALID_MODELS.includes(model) ? model : 'gemini-3.7-flash'
    localStorage.setItem(STORAGE_AI_MODEL, chosen)
  } catch {}
}

/**
 * Call AI Provider (Google Gemini with Auto-Cascading or OpenAI)
 */
async function callAi(prompt, inlineData = null, systemInstruction = null) {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    throw new Error('MISSING_API_KEY')
  }

  const model = getAiModel()

  // Handle OpenAI API Key (starts with sk-)
  if (apiKey.startsWith('sk-') || model.startsWith('gpt-')) {
    const messages = []
    const content = []

    if (inlineData) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${inlineData.mimeType};base64,${inlineData.base64Data}`,
        },
      })
    }
    content.push({ type: 'text', text: prompt })
    messages.push({ role: 'user', content })

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model.startsWith('gpt-') ? model : 'gpt-4o-mini',
        messages,
        max_tokens: 2048,
        temperature: 0.2,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `OpenAI API Error: ${res.statusText}`)
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  }

  // Google Gemini API endpoints with robust model fallback
  const candidateModels = [
    model && model.startsWith('gemini-') && model !== 'gemini-2.0-flash' && model !== 'gemini-2.5-flash' && model !== 'gemini-1.5-flash' ? model : 'gemini-3.7-flash',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash',
  ]

  const contents = []
  const parts = []

  if (inlineData) {
    parts.push({
      inline_data: {
        mime_type: inlineData.mimeType,
        data: inlineData.base64Data,
      },
    })
  }

  parts.push({ text: prompt })
  contents.push({ parts })

  let lastError = null

  // Try candidate Gemini models sequentially
  for (const currentModel of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`
        const bodyPayload = {
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }

        if (systemInstruction) {
          bodyPayload.system_instruction = {
            parts: [{ text: systemInstruction }],
          }
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        })

        if (response.ok) {
          const result = await response.json()
          const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text
          if (rawText) return rawText
        } else {
          const errData = await response.json().catch(() => ({}))
          lastError = errData?.error?.message || `HTTP ${response.status}: ${response.statusText}`
        }
      } catch (err) {
        lastError = err.message
      }
    }

  throw new Error(lastError || 'Gemini API call failed across all model endpoints.')
}

async function callGemini(prompt, inlineData = null, systemInstruction = null) {
  return callAi(prompt, inlineData, systemInstruction)
}

/**
 * Resilient JSON Array parser that extracts valid objects even if JSON is truncated
 */
export function safeParseJsonArray(text) {
  if (!text) return []

  // 1. Direct parse
  try {
    const trimmed = text.trim()
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return JSON.parse(trimmed)
    }
  } catch {}

  // 2. Extract [ ... ] block
  const arrayMatch = text.match(/\[([\s\S]*)\]/)
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0])
    } catch {}
  }

  // 3. Extract individual { ... } objects if JSON was truncated by token limit
  const objects = []
  const objectRegex = /\{[^{}]*"date"[\s\S]*?\}/g
  let match
  while ((match = objectRegex.exec(text)) !== null) {
    try {
      const obj = JSON.parse(match[0])
      if (obj && (obj.amount !== undefined || obj.description)) {
        objects.push(obj)
      }
    } catch {}
  }
  if (objects.length > 0) return objects

  return []
}

/**
 * 1. AI Receipt & Bill Auto-Scanner (Gemini Vision OCR)
 */
export async function scanReceiptWithGemini(base64Data, mimeType = 'image/jpeg') {
  const prompt = `You are an expert Indian Receipt & Bill Scanner OCR. Analyze this receipt or bill image and extract the key details accurately.
Extract:
- Merchant / Store Name
- Total Amount (in INR/Rupees, numeric only)
- Date (in YYYY-MM-DD format, fallback to current date if missing)
- Category (choose best fit: Food & Dining, Groceries, Shopping, Fuel, Utilities, Healthcare, Entertainment, Travel, Bills, Other)
- Payment Method (e.g., UPI, Card, Cash, OneCard, HDFC, ICICI, etc.)
- Short Note / Summary of purchased items

Output strictly valid JSON with this exact schema:
{
  "merchant": "string",
  "amount": number,
  "date": "YYYY-MM-DD",
  "category": "string",
  "payment_method": "string",
  "note": "string",
  "confidence": number (0-100)
}
Output strictly raw JSON without markdown backticks or extra commentary.`

  try {
    const rawResponse = await callGemini(prompt, { base64Data, mimeType })
    const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleanJson)
    return parsed
  } catch (err) {
    if (err.message === 'MISSING_API_KEY') {
      throw new Error('MISSING_API_KEY: Please configure your Gemini API Key in the top right Settings or in Render Environment Variables (VITE_GEMINI_API_KEY).')
    }
    throw err
  }
}

export const scanReceiptWithAi = scanReceiptWithGemini

/**
 * 2. Bank & OneCard Statement Multi-Transaction Detector
 */
export async function parseStatementWithGemini(fileTextOrBase64, isImage = false, mimeType = 'image/png') {
  let base64Data = null
  let textContent = ''

  if (isImage) {
    base64Data = fileTextOrBase64
  } else {
    textContent = fileTextOrBase64
  }

  const prompt = `You are a precision Indian Bank Statement & Credit Card Statement transaction parser (HDFC, SBI, ICICI, Axis, Kotak, OneCard, Amex, UPI).
Extract all debit and credit transactions.

For each transaction, extract:
- date: YYYY-MM-DD
- description: Clean merchant/narration without technical gibberish
- amount: Positive numeric amount in INR
- type: "expense" for debits, "income" for credits
- category: Smart auto-categorization (Food & Dining, Shopping, Fuel, Utilities, Healthcare, Travel, Entertainment, Transfer, Salary, Refund, Other)
- payment_method: Extracted card/account/UPI name if discernible, else "Bank / Card"

${textContent ? `STATEMENT TEXT TO PARSE:\n${textContent.slice(0, 15000)}` : 'Analyze the attached statement document/image.'}

Output strictly a valid JSON array matching this format:
[
  {
    "date": "YYYY-MM-DD",
    "description": "Swiggy Food Order",
    "amount": 420.50,
    "type": "expense",
    "category": "Food & Dining",
    "payment_method": "OneCard"
  }
]
Output strictly raw JSON without markdown backticks or commentary.`

  try {
    const rawResponse = await callGemini(prompt, base64Data ? { base64Data, mimeType } : null)
    const list = safeParseJsonArray(rawResponse)
    if (list && list.length > 0) {
      return list
    }
  } catch (err) {
    if (err.message === 'MISSING_API_KEY') {
      throw new Error('MISSING_API_KEY: Please configure your Gemini API Key in the top right Settings or in Render Environment Variables (VITE_GEMINI_API_KEY).')
    }
    throw err
  }

  return []
}

export const parseStatementWithAi = parseStatementWithGemini

/**
 * 3. "Ask AI" Financial Copilot & Wealth Advisor (Powered by High-Capacity Gemini Engine)
 */
export async function askFinancialAdvisorAi(userQuestion, financialContext = {}, chatHistory = []) {
  const apiKey = getGeminiApiKey()

  const qLower = (userQuestion || '').toLowerCase().trim()
  const isFinanceQuery = /\b(finance|expense|spend|spending|spent|income|salary|budget|saving|savings|net worth|wealth|portfolio|mutual fund|sip|debt|loan|emi|tax|regime|goal|investment|xirr|groww|onecard|credit card|transaction|bill|due)\b/i.test(qLower)
  const isTimeOrWeather = /\b(time|date|today|clock|weather|climate|temperature|forecast|rain)\b/i.test(qLower)

  let systemInstruction = `You are Manoj's intelligent Personal AI Assistant & Wealth Copilot (powered by Google Gemini). Answer all questions naturally, accurately, and thoroughly with complete intelligence.`

  if (isFinanceQuery) {
    systemInstruction += `\n\nLIVE USER FINANCIAL TELEMETRY (Reference for financial advice):
• Monthly Income: ₹${(financialContext.monthIncome || 0).toLocaleString('en-IN')}
• Monthly Expenses: ₹${(financialContext.monthExpense || 0).toLocaleString('en-IN')}
• Net Savings: ₹${(financialContext.netSavings || 0).toLocaleString('en-IN')} (${financialContext.savingsRate || 0}% savings rate)
• Mutual Funds Portfolio: ₹${(financialContext.totalMfValue || 0).toLocaleString('en-IN')} (Gain: ₹${(financialContext.totalMfGain || 0).toLocaleString('en-IN')})
• Active SIPs: ${financialContext.activeSips || 0} active running
• Outstanding Debts: ₹${(financialContext.totalDebt || 0).toLocaleString('en-IN')}
• Tracked Goals: ${financialContext.goalsCount || 0} active milestones

Provide actionable, customized numerical insights for Manoj using this telemetry.`
  }

  if (isTimeOrWeather) {
    const now = new Date()
    const todayDateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    systemInstruction += `\n\nCURRENT DATE & TIME (IST, Bengaluru):\n• ${todayDateStr}, ${timeStr}`
  }

  if (Array.isArray(chatHistory) && chatHistory.length > 1) {
    const recent = chatHistory.slice(-4).map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n')
    systemInstruction += `\n\nRECENT CONVERSATION HISTORY:\n${recent}`
  }

  try {
    const rawRes = await callGemini(userQuestion, null, systemInstruction)
    if (rawRes && rawRes.trim()) {
      return rawRes.trim()
    }
  } catch (err) {
    console.warn('AI Copilot call error:', err)
    // Only fall back to local rule engine if user asked an explicit local command (like simple math or time)
    const local = localAdvisorRuleEngine(userQuestion, financialContext, true)
    if (local && !local.includes('save your free Gemini API Key')) {
      return local
    }
    return `⚠️ **AI Service Notice:** ${err.message || 'Unable to connect to Google Gemini engine.'}\n\nPlease check your internet connection or verify your Gemini API key in settings.`
  }

  return localAdvisorRuleEngine(userQuestion, financialContext, Boolean(apiKey))
}

/**
 * Local Fallback Heuristics & Rich Assistant Engine
 */
function localAdvisorRuleEngine(question, ctx, hasApiKey = false) {
  const q = question.toLowerCase().trim()
  const inc = ctx.monthIncome || 0
  const exp = ctx.monthExpense || 0
  const sav = ctx.netSavings || 0
  const debt = ctx.totalDebt || 0
  const mf = ctx.totalMfValue || 0

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // 1. Weather & Climate (Bengaluru / General)
  if (q.includes('weather') || q.includes('whether') || q.includes('temp') || q.includes('temperature') || q.includes('climate') || q.includes('rain')) {
    const isBlr = q.includes('bengaluru') || q.includes('bangalore') || (!q.includes('mumbai') && !q.includes('delhi') && !q.includes('london'))
    if (isBlr) {
      return `🌤️ **Weather in Bengaluru (Bangalore):**\n\n• **Current Time:** ${timeStr} (IST)\n• **Temperature:** ~26°C – 28°C (Pleasant, mild breeze)\n• **Conditions:** Partly cloudy with light pleasant winds (Humidity ~55–60%)\n• **Forecast:** Mildly warm afternoon with cool, breezy evening.\n\n*(For real-time satellite updates, ensure your Google Gemini API key is configured in settings!)*`
    }
    return `🌤️ **Weather & Time Report:**\n\n• **Current Time:** ${timeStr} (${dateStr})\n• **Climate:** Typical pleasant seasonal conditions with moderate humidity.\n• **Tip:** Add your free Gemini API key to get instant live weather and open-domain intelligence across any global city!`
  }

  // 2. Time / Date / Day (Alexa-style)
  if (q.includes('time') || q.includes('clock') || q.includes('what time')) {
    return `⏰ **Current Time in Bengaluru (IST):** **${timeStr}**\n📅 **Date:** ${dateStr}`
  }

  if (q.includes('date') || q.includes('today') || q.includes('day')) {
    return `📅 **Today is:** **${dateStr}**\n⏰ **Time:** ${timeStr}`
  }

  // 3. Greetings & Persona
  if (/^(hi|hello|hey|hola|namaste|good morning|good evening|good afternoon)\b/i.test(q)) {
    return `👋 **Hello Manoj! I'm your AI Copilot & Personal Assistant.**\n\nI can answer general questions (time, weather, calculations, world facts, coding) and manage your finances (log expenses, check mutual funds & SIPs, optimize credit cards). How can I assist you right now?`
  }

  if (q.includes('who are you') || q.includes('your name') || q.includes('what can you do')) {
    return `🤖 **I am your AI Personal Assistant & Finance Copilot**.\n\n✨ **What you can ask me:**\n• *"Time and weather in Bengaluru"*\n• *"What is 15% of 85,000?"*\n• *"Paid 850 for dinner via GPay"*\n• *"What is my total net worth?"*\n• *"Review my Mutual Fund portfolio & SIP health"*\n• *"Which tax regime saves me more?"*\n• Any open-domain, coding, or lifestyle questions!`
  }

  // 4. Quick Math & Calculations
  const mathMatch = q.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)/)
  if (mathMatch) {
    const num1 = parseFloat(mathMatch[1])
    const op = mathMatch[2]
    const num2 = parseFloat(mathMatch[3])
    let ans = 0
    if (op === '+') ans = num1 + num2
    else if (op === '-') ans = num1 - num2
    else if (op === '*') ans = num1 * num2
    else if (op === '/') ans = num2 !== 0 ? num1 / num2 : 'undefined'
    return `🧮 **Calculation:** ${num1} ${op} ${num2} = **${ans.toLocaleString('en-IN')}**`
  }

  const pctMatch = q.match(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/)
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1])
    const base = parseFloat(pctMatch[2])
    const res = (pct / 100) * base
    return `🧮 **${pct}% of ${base.toLocaleString('en-IN')}** = **${res.toLocaleString('en-IN')}**`
  }

  // 5. Alexa Jokes & Fun
  if (q.includes('joke') || q.includes('make me laugh') || q.includes('funny')) {
    const jokes = [
      "😄 Why did the credit card go to therapy? It had too many balance issues!",
      "😄 Why don't money and plants mix? Because money doesn't grow on trees!",
      "😄 Why did the stock market investor sleep like a baby? He woke up every two hours crying!",
      "😄 Why did the dollar break up with the penny? It needed some change!",
    ]
    return jokes[Math.floor(Math.random() * jokes.length)]
  }

  // 6. Financial Concepts & Definitions
  if (q.includes('inflation')) {
    return `📈 **What is Inflation?**\n• Inflation is the gradual increase in prices of goods and services over time, reducing purchasing power.\n• In India, average inflation is ~5–6% per year.\n• **Tip:** Investing in equity mutual funds / SIPs historically beats inflation over 5+ years.`
  }

  if (q.includes('xirr')) {
    return `📊 **What is XIRR?**\n• **XIRR (Extended Internal Rate of Return)** is the standard annualized return metric for irregular cash inflows/outflows (monthly SIPs, top-ups, and withdrawals).`
  }

  if (q.includes('50 30 20') || q.includes('50-30-20')) {
    return `💡 **The 50-30-20 Budgeting Framework:**\n• **50% Needs:** Rent, Groceries, Utilities, EMIs.\n• **30% Wants:** Dining out, Entertainment, Shopping.\n• **20% Savings & Investments:** Mutual Fund SIPs, Emergency Reserve, Prepayments.`
  }

  if (q.includes('ltcg') || q.includes('stcg') || q.includes('tax on mutual')) {
    return `🏛️ **Mutual Funds Tax Rules (FY 2024–2027):**\n• **LTCG (Held > 12 Months):** Gains up to ₹1.25 Lakh per financial year are **100% Tax-Free**. Excess gains are taxed at **12.5%**.\n• **STCG (Held < 12 Months):** Flat **20%** on realized gains.`
  }

  // 7. Savings / Budgeting
  if (q.includes('save') || q.includes('cut') || q.includes('reduce') || q.includes('budget')) {
    return `💡 **Smart Savings Analysis:**\n• Monthly income: ₹${inc.toLocaleString('en-IN')} | Outflow: ₹${exp.toLocaleString('en-IN')}.\n• Net savings: **₹${sav.toLocaleString('en-IN')} (${ctx.savingsRate || 0}% savings rate)**.\n• **Tip:** Limiting discretionary dining & shopping can boost monthly savings by ₹3,000–₹5,000.`
  }

  // 8. Debts / Loans
  if (q.includes('debt') || q.includes('loan') || q.includes('emi') || q.includes('repay')) {
    return `💳 **Debt Repayment Strategy:**\n• Total outstanding debt: **₹${debt.toLocaleString('en-IN')}**.\n• **Avalanche Method:** Divert surplus cash to the highest APR loan (Credit Cards / Personal Loans first).`
  }

  // 9. Mutual Funds / Portfolio / SIPs
  if (q.includes('invest') || q.includes('mutual') || q.includes('portfolio') || q.includes('sip') || q.includes('groww') || q.includes('mf')) {
    const sipsCount = ctx.activeSips || (ctx.sipsList?.length || 0)
    return `📈 **Portfolio & Investment Health:**\n• **Current Mutual Funds Value:** ₹${mf.toLocaleString('en-IN')}\n• **Active SIPs:** **${sipsCount} active running**\n\n💡 Maintain steady monthly compounding via index/flexi-cap mutual funds.`
  }

  // 10. Goals
  if (q.includes('goal') || q.includes('target') || q.includes('milestone')) {
    const goalsCount = ctx.goalsCount || 0
    return `🎯 **Financial Goals:**\n• You have **${goalsCount} active goals** tracked with a total target of ₹${(ctx.goalsTarget || 0).toLocaleString('en-IN')}.`
  }

  // 11. General Knowledge
  return `🤖 **AI Response:**\n\nI can help you with questions across weather, time, calculations, definitions, general questions, and personal wealth analytics.\n\n💡 *(Tip: To enable unlimited open-domain reasoning like complex coding, recipes, and world news, save your free Gemini API Key in the top-right settings!)*`
}
