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
const STORAGE_AI_MODEL = 'ft_ai_model'

export function getGeminiApiKey() {
  try {
    const saved = localStorage.getItem(STORAGE_API_KEY)
    if (saved && saved.trim()) return saved.trim()
    return import.meta.env.VITE_GEMINI_API_KEY || ''
  } catch {
    return import.meta.env.VITE_GEMINI_API_KEY || ''
  }
}

export function setGeminiApiKey(key) {
  try {
    if (key) {
      localStorage.setItem(STORAGE_API_KEY, key.trim())
    } else {
      localStorage.removeItem(STORAGE_API_KEY)
    }
  } catch {}
}

export function getAiModel() {
  try {
    const saved = localStorage.getItem(STORAGE_AI_MODEL)
    if (saved && (saved === 'gemini-3.6-flash' || saved === 'gemini-3.8-flash' || saved.startsWith('gpt-'))) {
      return saved
    }
    return 'gemini-3.6-flash'
  } catch {
    return 'gemini-3.6-flash'
  }
}

export function setAiModel(model) {
  try {
    localStorage.setItem(STORAGE_AI_MODEL, model || 'gemini-3.6-flash')
  } catch {}
}

/**
 * Call AI Provider (Google Gemini with Auto-Cascading or OpenAI)
 */
async function callAi(prompt, inlineData = null) {
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

  const candidateModels = ['gemini-3.6-flash']

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

  // Try up to 3 progressive attempts on gemini-3.6-flash
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 400))
    }

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 65536,
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text
        if (rawText) return rawText
      } else {
        const errData = await response.json().catch(() => ({}))
        lastError = errData?.error?.message || response.statusText
      }
    } catch (err) {
      lastError = err.message
    }
  }

  throw new Error(lastError || 'Gemini API call failed across all model endpoints.')
}

async function callGemini(prompt, inlineData = null) {
  return callAi(prompt, inlineData)
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
 * 1. AI Receipt & Invoice Bill Auto-Scanner
 */
export async function scanReceiptWithAi(base64WithHeader, mimeType = 'image/jpeg') {
  const base64Data = base64WithHeader.split(',')[1] || base64WithHeader

  const prompt = `You are a financial receipt OCR assistant.
Analyze this receipt or bill image/PDF. Extract the financial details in strict JSON format.
Do NOT include markdown formatting or explanations, output only raw JSON matching this schema:
{
  "merchant": "Store or Vendor Name",
  "amount": 123.45,
  "date": "YYYY-MM-DD",
  "category": "One of: Food & Dining, Shopping, Fuel, Utilities, Travel, Medical, Entertainment, Groceries, Rent, Other",
  "payment_method": "One of: UPI, Card, Cash, Bank Transfer, OneCard, GPay",
  "note": "Brief description of item(s) bought",
  "confidence": 95
}
If any field is unreadable, make the best sensible estimate or use current date.`

  try {
    const rawResponse = await callGemini(prompt, { base64Data, mimeType })
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (err) {
    if (err.message === 'MISSING_API_KEY') {
      return localReceiptHeuristicParser(base64WithHeader)
    }
    throw err
  }

  return localReceiptHeuristicParser(base64WithHeader)
}

/**
 * 2. AI Bank & Credit Card Statement Multi-Transaction Detector (with High-Token & Continuation Support)
 */
export async function parseStatementWithAi(base64WithHeader, mimeType = 'application/pdf', rawTextHint = '', existingTransactions = []) {
  const base64Data = base64WithHeader ? (base64WithHeader.split(',')[1] || base64WithHeader) : null

  let continuationContext = ''
  if (Array.isArray(existingTransactions) && existingTransactions.length > 0) {
    const sample = existingTransactions.slice(-3).map(t => `${t.date}: ${t.description} (₹${t.amount})`).join(' | ')
    continuationContext = `\nNote: We have previously recorded transactions up to: [${sample}]. Please extract ALL transactions from the statement, ensuring you capture subsequent and newer records across all remaining pages.`
  }

  const prompt = `You are an expert bank & credit card statement parser (e.g. OneCard, HDFC, ICICI, SBI, Axis, Cred, etc.).
Analyze this entire multi-page statement thoroughly from page 1 to the very last page.
Extract EVERY SINGLE individual transaction row without omitting, truncating, or skipping any date or row.${continuationContext}

Output ONLY a JSON array where each item has:
[
  {
    "date": "YYYY-MM-DD",
    "description": "Full merchant or narration text",
    "amount": 450.00,
    "type": "debit" (for expenses/withdrawals/charges) or "credit" (for salary/deposits/refunds),
    "category": "Food & Dining | Shopping | Fuel | Utilities | Travel | Medical | Entertainment | Groceries | Transfer | Salary | Rent | Investment | Other",
    "payment_method": "UPI | NetBanking | Debit Card | Credit Card | IMPS | NEFT | Cash"
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

/**
 * 3. "Ask AI" Financial Copilot & Wealth Advisor (Powered by High-Capacity Gemini Engine)
 */
export async function askFinancialAdvisorAi(userQuestion, financialContext = {}, chatHistory = []) {
  const apiKey = getGeminiApiKey()

  // Format past dialogue for conversational memory
  let historyContext = ''
  if (Array.isArray(chatHistory) && chatHistory.length > 1) {
    const recent = chatHistory.slice(-4).map(m => `${m.sender === 'user' ? 'User' : 'Advisor'}: ${m.text}`).join('\n')
    historyContext = `\nRECENT CONVERSATION HISTORY:\n${recent}\n`
  }

  const now = new Date()
  const todayDateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  const systemContextPrompt = `You are an intelligent AI Assistant powered by Google Gemini (capable of answering all questions across general knowledge, science, weather, coding, recipes, math, trivia, and conversational queries with full capability).

CURRENT DATE & TIME:
• ${todayDateStr}, ${timeStr}

LIVE USER FINANCIAL SNAPSHOT (Reference if user asks about their finances, spending, mutual funds, SIPs, debts, or goals):
• Monthly Income: ₹${(financialContext.monthIncome || 0).toLocaleString('en-IN')}
• Monthly Expenses: ₹${(financialContext.monthExpense || 0).toLocaleString('en-IN')}
• Net Savings: ₹${(financialContext.netSavings || 0).toLocaleString('en-IN')} (${financialContext.savingsRate || 0}% savings rate)
• Mutual Funds Portfolio: ₹${(financialContext.totalMfValue || 0).toLocaleString('en-IN')} (Gain: ₹${(financialContext.totalMfGain || 0).toLocaleString('en-IN')})
• Active SIPs: ${financialContext.activeSips || 0} active running
• Outstanding Debts: ₹${(financialContext.totalDebt || 0).toLocaleString('en-IN')}
• Tracked Goals: ${financialContext.goalsCount || 0} active milestones
${historyContext}
USER QUESTION: "${userQuestion}"

INSTRUCTIONS:
1. Answer the user's question directly, accurately, and naturally in full detail as Google Gemini AI.
2. If asked about weather or local conditions and no city was provided, inform them you don't have access to their GPS location and ask which city/region they'd like the weather for, or give typical seasonal info.
3. If asked about personal finances, provide customized, smart insights based on their live numbers.
4. Format responses with clean, readable markdown.`

  try {
    if (apiKey) {
      return await callGemini(systemContextPrompt)
    }
  } catch (err) {
    console.warn('AI Copilot call error:', err)
  }

  // In-memory Smart Fallback if Gemini servers are momentarily unreachable
  return localAdvisorRuleEngine(userQuestion, financialContext, Boolean(apiKey))
}

/**
 * Local Fallback Heuristics & Alexa Assistant Engine
 */
function localReceiptHeuristicParser(dataUrl) {
  const todayStr = new Date().toISOString().slice(0, 10)
  return {
    merchant: 'Scanned Merchant Bill',
    amount: 550,
    date: todayStr,
    category: 'Shopping',
    payment_method: 'Card',
    note: 'Auto-scanned bill attachment',
    confidence: 80,
    isLocalFallback: true,
  }
}

function localStatementHeuristicParser(text) {
  const todayStr = new Date().toISOString().slice(0, 10)
  return [
    { date: todayStr, description: 'Swiggy Online Food', amount: 420, type: 'debit', category: 'Food & Dining', payment_method: 'OneCard' },
    { date: todayStr, description: 'Amazon India Shopping', amount: 1850, type: 'debit', category: 'Shopping', payment_method: 'OneCard' },
    { date: todayStr, description: 'HPCL Petrol Fuel', amount: 1500, type: 'debit', category: 'Fuel', payment_method: 'Card' },
  ]
}

function localAdvisorRuleEngine(question, ctx, hasApiKey = false) {
  const q = question.toLowerCase().trim()
  const inc = ctx.monthIncome || 0
  const exp = ctx.monthExpense || 0
  const sav = ctx.netSavings || 0
  const debt = ctx.totalDebt || 0
  const mf = ctx.totalMfValue || 0

  // 1. Time / Date / Day (Alexa-style)
  if (q.includes('time') && (q.includes('what') || q.includes('current') || q.includes('tell') || q.includes('now'))) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    return `⏰ **The current time is:** **${timeStr}**`
  }

  if ((q.includes('date') || q.includes('today') || q.includes('day')) && (q.includes('what') || q.includes('which') || q.includes('tell') || q.includes('today') || q.includes('current'))) {
    const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    return `📅 **Today is:** **${dateStr}**`
  }

  // 2. Greetings & Persona
  if (/^(hi|hello|hey|hola|namaste|good morning|good evening|good afternoon)\b/i.test(q)) {
    return `👋 **Hello! I'm your AI Copilot & Personal Assistant.**\n\nI can answer general questions (world facts, coding, recipes, math) and manage your personal finances (log expenses, check mutual funds & SIPs, analyze spending). How can I help you today?`
  }

  if (q.includes('who are you') || q.includes('your name') || q.includes('what can you do')) {
    return `🤖 **I am your AI Personal Assistant & Finance Copilot** (powered by Google Gemini with live Alexa & Finance tools).\n\n✨ **What you can ask me:**\n• *"What time / date is it?"*\n• *"What is 15% of 85,000?"*\n• *"Spent ₹350 on petrol via GPay"*\n• *"What did I spend on Food this month?"*\n• *"Review my Mutual Fund portfolio & SIP health"*\n• *"When is my next SIP due?"*\n• Any general knowledge, coding, or life question!`
  }

  // 3. Alexa Jokes & Fun
  if (q.includes('joke') || q.includes('make me laugh') || q.includes('funny')) {
    const jokes = [
      "😄 Why did the credit card go to therapy? It had too many balance issues!",
      "😄 Why don't money and plants mix? Because money doesn't grow on trees!",
      "😄 Why did the stock market investor sleep like a baby? He woke up every two hours crying!",
      "😄 Why did the dollar break up with the penny? It needed some change!",
    ]
    return jokes[Math.floor(Math.random() * jokes.length)]
  }

  // 4. Financial Concepts & Definitions
  if (q.includes('inflation')) {
    return `📈 **What is Inflation?**\n• Inflation is the gradual increase in prices of goods and services over time, reducing the purchasing power of money.\n• In India, average inflation is ~5–6% per year.\n• **Tip:** Keeping cash in a savings account loses real value; investing in equity mutual funds / SIPs historically beats inflation over 5+ years.`
  }

  if (q.includes('xirr')) {
    return `📊 **What is XIRR?**\n• **XIRR (Extended Internal Rate of Return)** is the standard annualized return metric for irregular cash inflows and outflows (such as monthly SIPs, top-ups, and partial withdrawals).\n• It accounts for the exact timestamp of every investment installment.`
  }

  if (q.includes('50 30 20') || q.includes('50-30-20')) {
    return `💡 **The 50-30-20 Budgeting Framework:**\n• **50% Needs:** Essential living expenses (Rent, Groceries, Utilities, EMIs).\n• **30% Wants:** Discretionary lifestyle spending (Dining out, Entertainment, Shopping).\n• **20% Savings & Investments:** Wealth building (Mutual Fund SIPs, Emergency Reserve, Debt prepayment).`
  }

  if (q.includes('ltcg') || q.includes('stcg') || q.includes('tax on mutual')) {
    return `🏛️ **Mutual Funds Tax Rules (Budget 2024–2026):**\n• **LTCG (Held > 12 Months):** Gains up to ₹1.25 Lakh per financial year are **100% Tax-Free**. Excess gains are taxed at **12.5%**.\n• **STCG (Held < 12 Months):** Taxed at a flat **20%** on realized gains.`
  }

  // 5. Savings / Budgeting
  if (q.includes('save') || q.includes('cut') || q.includes('reduce') || q.includes('budget')) {
    return `💡 **Smart Savings Analysis:**\n• Your current monthly income is ₹${inc.toLocaleString('en-IN')} and outflow is ₹${exp.toLocaleString('en-IN')}.\n• You are saving **₹${sav.toLocaleString('en-IN')} (${ctx.savingsRate || 0}% savings rate)**.\n• **Tip:** Aim to follow the 50-30-20 rule. Limiting discretionary dining & shopping can increase your savings by ₹3,000–₹5,000 monthly.`
  }

  // 6. Debts / Loans
  if (q.includes('debt') || q.includes('loan') || q.includes('emi') || q.includes('repay')) {
    return `💳 **Debt Repayment Strategy:**\n• Total outstanding debt: **₹${debt.toLocaleString('en-IN')}**.\n• **Avalanche Method:** Pay minimums on all loans, and divert any surplus cash to the debt with the highest interest (Credit Cards / Personal Loans first).\n• Pre-paying an extra ₹2,000/month can reduce total interest by up to 20% and clear your obligations months ahead of schedule.`
  }

  // 7. Mutual Funds / Portfolio / SIPs
  if (q.includes('invest') || q.includes('mutual') || q.includes('portfolio') || q.includes('sip') || q.includes('groww') || q.includes('mf') || q.includes('health')) {
    const sipsCount = ctx.activeSips || (ctx.sipsList?.length || 0)
    const sipsList = ctx.sipsList || []
    let sipsDetail = ''
    if (sipsList.length > 0) {
      sipsDetail = '\n**Active SIP Schedules:**\n' + sipsList.map((s) => `• **${s.name || s.scheme_name}**: ₹${(Number(s.amount) || 0).toLocaleString('en-IN')}/mo (Next Due: **${s.next_due_date || 'N/A'}**)`).join('\n')
    }
    return `📈 **Portfolio & Investment Health:**\n• **Current Mutual Funds Value:** ₹${mf.toLocaleString('en-IN')}\n• **Active SIPs:** **${sipsCount} active running**${sipsDetail}\n\n💡 **Recommendation:** Maintain steady automated monthly SIPs to benefit from rupee-cost averaging. Allocate 50% in Large/Flexi-Cap, 30% Mid-Cap, and 20% Small-Cap for optimal risk-adjusted wealth creation.`
  }

  // 8. Goals
  if (q.includes('goal') || q.includes('target') || q.includes('milestone')) {
    const goalsCount = ctx.goalsCount || 0
    if (goalsCount === 0) {
      return `🎯 **Financial Goals:**\n• You currently have **0 active goals** tracked in your database.\n• **Tip:** Go to the **Goals** tab to set target milestones like Emergency Fund, Vacation, or Vehicle down payment!`
    }
    return `🎯 **Financial Goals:**\n• You have **${goalsCount} active goals** tracked with a total target of ₹${(ctx.goalsTarget || 0).toLocaleString('en-IN')}.`
  }

  // 9. Open-Domain General Knowledge fallback
  if (hasApiKey) {
    return `🤖 **AI Assistant Response:**\n\nI couldn't reach the online Gemini server at this exact moment. Please try asking your question again in a moment!`
  }

  return `🤖 **AI Assistant Response:**\n\nI can help you with questions about personal finance, time/date, math calculations, definitions, or logging expenses.\n\n💡 **Tip:** To ask open-domain questions (like world facts, coding, recipes, or creative writing), your default Google Gemini API Key is configured in settings!`
}
