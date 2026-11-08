/**
 * Itemized Bill OCR & Dish-by-Dish Splitwise Engine
 * Extracts individual dishes, drinks, tax, and service charges,
 * allocates shared items among selected friends, and generates
 * direct UPI WhatsApp collection deep-links.
 */

/**
 * Parses raw text (from camera OCR or paste) into structured itemized lines
 */
export function parseItemizedBillText(rawText) {
  if (!rawText || typeof rawText !== 'string') return { items: [], tax: 0, serviceCharge: 0, total: 0 }

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
  const items = []
  let tax = 0
  let serviceCharge = 0
  let explicitTotal = 0

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx]
    const lower = line.toLowerCase()

    // Detect Tax / GST / VAT
    if (lower.includes('gst') || lower.includes('tax') || lower.includes('vat') || lower.includes('cgst') || lower.includes('sgst')) {
      const match = line.match(/(?:₹|rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i)
      if (match) {
        tax += parseFloat(match[1].replace(/,/g, '')) || 0
      }
      continue
    }

    // Detect Service Charge / Tip
    if (lower.includes('service') || lower.includes('tip') || lower.includes('packing')) {
      const match = line.match(/(?:₹|rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i)
      if (match) {
        serviceCharge += parseFloat(match[1].replace(/,/g, '')) || 0
      }
      continue
    }

    // Detect Grand Total / Subtotal
    if (lower.startsWith('total') || lower.startsWith('grand total') || lower.startsWith('net amount')) {
      const match = line.match(/(?:₹|rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i)
      if (match) {
        explicitTotal = parseFloat(match[1].replace(/,/g, '')) || 0
      }
      continue
    }

    // Match dish lines like "2x Butter Chicken 540.00" or "Paneer Tikka ... 320"
    const priceMatch = line.match(/(?:₹|rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)$/i)
    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(/,/g, ''))
      if (!isNaN(price) && price > 0) {
        const rawName = line.replace(priceMatch[0], '').trim().replace(/[-–:.]+$/, '').trim()
        if (rawName.length > 1) {
          // Detect quantity if present (e.g., "2x" or "2 ")
          const qtyMatch = rawName.match(/^([0-9]+)\s*[xX*]?\s*(.+)/)
          const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1
          const name = qtyMatch ? qtyMatch[2] : rawName

          items.push({
            id: `item_${idx}_${Date.now()}`,
            name,
            qty,
            price,
            assignedFriends: [], // list of friend IDs or names
          })
        }
      }
    }
  }

  const itemsSubtotal = items.reduce((s, it) => s + it.price, 0)
  const computedTotal = explicitTotal > 0 ? explicitTotal : (itemsSubtotal + tax + serviceCharge)

  return {
    items,
    tax: Math.round(tax * 100) / 100,
    serviceCharge: Math.round(serviceCharge * 100) / 100,
    subtotal: Math.round(itemsSubtotal * 100) / 100,
    total: Math.round(computedTotal * 100) / 100,
  }
}

/**
 * Calculates exact owes per friend including proportional shared tax and service charges
 */
export function calculateItemizedFriendSplits({ items = [], tax = 0, serviceCharge = 0, friends = [] }) {
  const result = {}
  friends.forEach(f => {
    result[f] = {
      name: f,
      itemsTotal: 0,
      assignedDishes: [],
      proportionalTax: 0,
      proportionalService: 0,
      finalShare: 0,
    }
  })

  let totalAssignedFoodSpend = 0

  // 1. Calculate each friend's direct food spend
  for (const item of items) {
    const assigned = item.assignedFriends || []
    if (assigned.length === 0) continue

    const perPersonPrice = item.price / assigned.length
    for (const friendName of assigned) {
      if (!result[friendName]) {
        result[friendName] = {
          name: friendName,
          itemsTotal: 0,
          assignedDishes: [],
          proportionalTax: 0,
          proportionalService: 0,
          finalShare: 0,
        }
      }
      result[friendName].itemsTotal += perPersonPrice
      result[friendName].assignedDishes.push({
        dish: item.name,
        share: Math.round(perPersonPrice * 100) / 100,
      })
      totalAssignedFoodSpend += perPersonPrice
    }
  }

  // 2. Allocate shared tax and service charge proportionally to food consumed
  for (const friendName of Object.keys(result)) {
    const entry = result[friendName]
    if (totalAssignedFoodSpend > 0) {
      const ratio = entry.itemsTotal / totalAssignedFoodSpend
      entry.proportionalTax = Math.round(tax * ratio * 100) / 100
      entry.proportionalService = Math.round(serviceCharge * ratio * 100) / 100
    }
    entry.finalShare = Math.round((entry.itemsTotal + entry.proportionalTax + entry.proportionalService) * 100) / 100
  }

  return Object.values(result)
}

/**
 * Generates an instant WhatsApp message with UPI payment collection link
 */
export function generateWhatsAppUpiLink({ friendName, amount, upiId = 'manoj@upi', billTitle = 'Dinner' }) {
  const cleanAmount = Number(amount || 0).toFixed(2)
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('Manoj Shankar')}&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent(`Split for ${billTitle}`)}`
  
  const msg = `Hey ${friendName}! Here is your split for *${billTitle}*: ₹${cleanAmount}.\n\nTap to pay instantly via any UPI app (GPay / PhonePe / Paytm):\n${upiLink}`
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`
}
