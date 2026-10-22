import React from 'react'
import {
  UtensilsCrossed,
  Fuel,
  Home,
  Car,
  ShoppingCart,
  Ticket,
  Receipt,
  FileText,
  DollarSign,
  Coffee,
  Plane,
  HeartPulse,
} from 'lucide-react'

/**
 * Format currency in Splitwise style (e.g. INR380.00, -INR54.29)
 */
export function formatSplitwiseCurrency(amount, currency = 'INR') {
  const num = Number(amount) || 0
  const isNegative = num < -0.009
  const absVal = Math.abs(num).toFixed(2)
  const prefix = isNegative ? `-${currency}` : currency
  return `${prefix}${absVal}`
}

/**
 * Detect category and return matching icon & pastel color styling
 * Matches Splitwise signature category tiles
 */
export function getExpenseCategoryVisuals(title = '', notes = '') {
  const t = (title + ' ' + (notes || '')).toLowerCase()

  // 1. Fuel / Gas / Diesel
  if (t.includes('diesel') || t.includes('petrol') || t.includes('fuel') || t.includes('gas') || t.includes('cng')) {
    return {
      icon: Fuel,
      label: 'Fuel',
      bgClass: 'bg-[#fce4ec] dark:bg-pink-950/50',
      textClass: 'text-[#c2185b] dark:text-pink-300',
      borderClass: 'border-pink-200 dark:border-pink-900',
    }
  }

  // 2. Food / Dining / Burger / Restaurant / Drinks
  if (
    t.includes('dinner') ||
    t.includes('lunch') ||
    t.includes('breakfast') ||
    t.includes('food') ||
    t.includes('burger') ||
    t.includes('king') ||
    t.includes('restaurant') ||
    t.includes('cafe') ||
    t.includes('coffee') ||
    t.includes('tea') ||
    t.includes('pizza') ||
    t.includes('snack') ||
    t.includes('meal') ||
    t.includes('shack') ||
    t.includes('bar') ||
    t.includes('drink') ||
    t.includes('beer')
  ) {
    return {
      icon: UtensilsCrossed,
      label: 'Food & Drink',
      bgClass: 'bg-[#e8f5e9] dark:bg-emerald-950/50',
      textClass: 'text-[#2e7d32] dark:text-emerald-300',
      borderClass: 'border-emerald-200 dark:border-emerald-900',
    }
  }

  // 3. Room / Stay / Hotel / Advance / Accommodation
  if (
    t.includes('room') ||
    t.includes('stay') ||
    t.includes('hotel') ||
    t.includes('villa') ||
    t.includes('airbnb') ||
    t.includes('resort') ||
    t.includes('booking') ||
    t.includes('lodge') ||
    t.includes('advance') ||
    t.includes('hostel') ||
    t.includes('rent')
  ) {
    return {
      icon: Home,
      label: 'Lodging',
      bgClass: 'bg-[#fff9c4] dark:bg-amber-950/50',
      textClass: 'text-[#f57f17] dark:text-amber-300',
      borderClass: 'border-amber-200 dark:border-amber-900',
    }
  }

  // 4. Transport / Car / Taxi / Cleaning
  if (
    t.includes('car') ||
    t.includes('cleaning') ||
    t.includes('taxi') ||
    t.includes('cab') ||
    t.includes('uber') ||
    t.includes('ola') ||
    t.includes('scooter') ||
    t.includes('bike') ||
    t.includes('toll') ||
    t.includes('parking') ||
    t.includes('auto')
  ) {
    return {
      icon: Car,
      label: 'Transport',
      bgClass: 'bg-[#fce4ec] dark:bg-rose-950/50',
      textClass: 'text-[#ad1457] dark:text-rose-300',
      borderClass: 'border-rose-200 dark:border-rose-900',
    }
  }

  // 5. Groceries / Shopping / Ice cream / Blinkit / Supermarket
  if (
    t.includes('ice cream') ||
    t.includes('blinkit') ||
    t.includes('zepto') ||
    t.includes('instamart') ||
    t.includes('grocery') ||
    t.includes('market') ||
    t.includes('mart') ||
    t.includes('shopping') ||
    t.includes('chocolates') ||
    t.includes('dettol') ||
    t.includes('supermarket') ||
    t.includes('supplies')
  ) {
    return {
      icon: ShoppingCart,
      label: 'Groceries',
      bgClass: 'bg-[#e0f2f1] dark:bg-teal-950/50',
      textClass: 'text-[#00796b] dark:text-teal-300',
      borderClass: 'border-teal-200 dark:border-teal-900',
    }
  }

  // 6. Tickets / Trek / Guide / Entry / Flight
  if (
    t.includes('trek') ||
    t.includes('guide') ||
    t.includes('ticket') ||
    t.includes('pass') ||
    t.includes('flight') ||
    t.includes('entry') ||
    t.includes('movie') ||
    t.includes('safari')
  ) {
    return {
      icon: Ticket,
      label: 'Activities',
      bgClass: 'bg-[#eceff1] dark:bg-slate-800',
      textClass: 'text-[#455a64] dark:text-slate-300',
      borderClass: 'border-slate-200 dark:border-slate-700',
    }
  }

  // Default: General Bill / Receipt
  return {
    icon: Receipt,
    label: 'General',
    bgClass: 'bg-[#f5f5f5] dark:bg-slate-800',
    textClass: 'text-[#616161] dark:text-slate-300',
    borderClass: 'border-slate-200 dark:border-slate-700',
  }
}

/**
 * Group expenses by Month & Year string (e.g. "OCTOBER 2026")
 */
export function groupExpensesByMonth(expenses = []) {
  const groups = {}

  // Sort newest first
  const sorted = [...expenses].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))

  sorted.forEach(exp => {
    let dateObj
    try {
      dateObj = new Date(exp.date || Date.now())
      if (isNaN(dateObj.getTime())) dateObj = new Date()
    } catch {
      dateObj = new Date()
    }

    const monthName = dateObj.toLocaleString('en-US', { month: 'long' }).toUpperCase()
    const year = dateObj.getFullYear()
    const monthKey = `${monthName} ${year}`

    if (!groups[monthKey]) {
      groups[monthKey] = []
    }
    groups[monthKey].push(exp)
  })

  return groups
}
