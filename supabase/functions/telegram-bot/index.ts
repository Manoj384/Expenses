/**
 * Supabase Edge Function: Telegram & WhatsApp Financial Assistant Webhook
 * Handles incoming Telegram / WhatsApp updates, parses NLP transactions, queries live AMFI NAVs, and updates Supabase tables.
 * 
 * Deploy with:
 * supabase functions deploy telegram-bot --no-verify-jwt
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || ""
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ status: "alive" }), {
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const update = await req.json()
    const message = update.message
    if (!message || !message.text) {
      return new Response("OK", { status: 200 })
    }

    const chatId = message.chat.id
    const text = message.text.trim()
    const lower = text.toLowerCase()

    // 1. Command: /portfolio or /nav
    if (lower === "/portfolio" || lower === "/nav" || lower === "portfolio") {
      const { data: funds } = await supabase.from("mutual_funds").select("*")
      const totalVal = (funds || []).reduce((s, f) => s + Number(f.current_value || 0), 0)
      const totalInv = (funds || []).reduce((s, f) => s + Number(f.invested_amount || 0), 0)
      const gain = totalVal - totalInv
      const gainPct = totalInv > 0 ? ((gain / totalInv) * 100).toFixed(2) : "0.00"

      let holdingsSummary = (funds || []).slice(0, 4).map(f => 
        `• ${f.scheme_name.slice(0, 20)}: ₹${Number(f.current_nav).toFixed(2)}`
      ).join("\n")

      const reply = `📈 *Portfolio Valuation:*\n\n` +
        `• *Current Value:* ₹${totalVal.toLocaleString('en-IN')}\n` +
        `• *Total Invested:* ₹${totalInv.toLocaleString('en-IN')}\n` +
        `• *Returns:* ${gain >= 0 ? '+' : ''}₹${gain.toLocaleString('en-IN')} (${gainPct}%)\n\n` +
        `*Top Holdings:*\n${holdingsSummary}`

      await sendTelegramMessage(chatId, reply)
      return new Response("OK", { status: 200 })
    }

    // 2. Command: /summary
    if (lower === "/summary" || lower === "/today") {
      const todayStr = new Date().toISOString().split("T")[0]
      const { data: txs } = await supabase
        .from("transactions")
        .select("amount, type, date")
        .gte("date", todayStr.slice(0, 7) + "-01")

      const expenses = (txs || []).filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0)
      const income = (txs || []).filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0)

      const reply = `📊 *Monthly Financial Summary:*\n\n` +
        `• *Income:* ₹${income.toLocaleString('en-IN')}\n` +
        `• *Expenses:* ₹${expenses.toLocaleString('en-IN')}\n` +
        `• *Net Savings:* ₹${(income - expenses).toLocaleString('en-IN')}`

      await sendTelegramMessage(chatId, reply)
      return new Response("OK", { status: 200 })
    }

    // 3. Natural Language Expense / Income Logging
    const amtMatch = text.match(/(?:(?:rs\.?|inr|₹)\s*(\d+(?:,\d+)*(?:\.\d+)?))|(?:\b(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rs\.?|inr|₹|\/-)?\b)/i)
    if (amtMatch) {
      const rawAmt = amtMatch[1] || amtMatch[2]
      const amount = parseFloat(rawAmt.replace(/,/g, ""))

      if (amount > 0) {
        const isIncome = /\b(received|got|credited|salary|bonus|refund|freelance)\b/i.test(text)
        const type = isIncome ? "income" : "expense"

        // Insert into Supabase transactions table
        await supabase.from("transactions").insert({
          amount: amount,
          type: type,
          note: text,
          date: new Date().toISOString().split("T")[0]
        })

        const reply = `✅ *${type === 'income' ? 'Income' : 'Expense'} Logged!*\n\n` +
          `• *Amount:* ₹${amount.toLocaleString('en-IN')}\n` +
          `• *Description:* ${text}\n` +
          `• *Date:* ${new Date().toLocaleDateString('en-IN')}`

        await sendTelegramMessage(chatId, reply)
        return new Response("OK", { status: 200 })
      }
    }

    // Fallback response
    await sendTelegramMessage(chatId, "👋 Send an expense like *'Spent 350 for dinner via UPI'* or type */portfolio* to check your mutual funds.")
    return new Response("OK", { status: 200 })

  } catch (err) {
    console.error("Webhook processing error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})

async function sendTelegramMessage(chatId: number | string, text: string) {
  if (!BOT_TOKEN) return
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown"
    })
  })
}
