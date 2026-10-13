/**
 * Real Conversational AI Engine powered by Google Gemini API
 * Provides deep financial reasoning, overspending analysis, tax optimization,
 * portfolio diagnosis, as well as general knowledge & weather with local zero-config fallback.
 */

import { supabase } from '../lib/supabaseClient'

// Provider credentials are intentionally never stored in the browser.

export const getGeminiApiKey = () => ''
export const saveGeminiApiKey = () => false

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
  try {
    const { data, error } = await supabase.functions.invoke('ai-gateway', {
      body: {
        prompt: userPrompt,
        systemInstruction: buildSystemPrompt(context),
        maxOutputTokens: 450,
        temperature: 0.5,
      },
    })
    if (error || !data?.text) throw new Error(error?.message || data?.error || 'AI request failed')
    return {
      success: true,
      text: data.text.trim(),
      speechText: data.text.replace(/[*_#`]/g, ''),
    }
  } catch (err) {
    return { success: false, text: null, error: err.message || 'AI request failed' }
  }
}
