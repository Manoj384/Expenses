/**
 * Subscription Ghost Leak & Free Trial Cancellation Sentinel
 * Detects stealth price jumps, zombie recurring debits,
 * and provides direct 1-click cancellation deep-links.
 */

export const CANCELLATION_DIRECTORY = {
  netflix: {
    name: 'Netflix',
    cancelUrl: 'https://www.netflix.com/youraccount',
    steps: 'Sign in > Click Profile icon > Account > Click "Cancel Membership".',
  },
  prime: {
    name: 'Amazon Prime',
    cancelUrl: 'https://www.amazon.in/mc/manage',
    steps: 'Go to Your Account > Manage Prime Membership > End Membership & Benefits.',
  },
  spotify: {
    name: 'Spotify Premium',
    cancelUrl: 'https://www.spotify.com/account/overview/',
    steps: 'Log in > Under Your Plan, click "Change Plan" > Scroll to "Cancel Spotify".',
  },
  youtube: {
    name: 'YouTube Premium',
    cancelUrl: 'https://www.youtube.com/paid_memberships',
    steps: 'Avatar icon > Purchases and memberships > Manage membership > Deactivate.',
  },
  hotstar: {
    name: 'Disney+ Hotstar',
    cancelUrl: 'https://www.hotstar.com/in/my-account',
    steps: 'My Account > Help & Settings > Subscriptions > Cancel Subscription.',
  },
  apple: {
    name: 'Apple Services (iCloud / Music)',
    cancelUrl: 'https://support.apple.com/billing',
    steps: 'Settings on iPhone > Tap Name > Subscriptions > Tap Subscription > Cancel.',
  },
  google: {
    name: 'Google One / Play Store',
    cancelUrl: 'https://play.google.com/store/account/subscriptions',
    steps: 'Open Play Store > Payments & subscriptions > Subscriptions > Cancel.',
  },
  gym: {
    name: 'Gym / Fitness Membership (Cult.fit)',
    cancelUrl: 'https://www.cult.fit',
    steps: 'Profile > Orders & Subscriptions > Pause or Cancel Membership.',
  },
}

/**
 * Scans transaction history to identify recurring subscriptions and price hikes
 */
export function auditSubscriptions(transactions = []) {
  const recurringMap = {}

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue
    const note = (tx.note || '').toLowerCase()

    for (const [key, meta] of Object.entries(CANCELLATION_DIRECTORY)) {
      if (note.includes(key) || note.includes(meta.name.toLowerCase())) {
        if (!recurringMap[key]) {
          recurringMap[key] = {
            id: key,
            name: meta.name,
            cancelUrl: meta.cancelUrl,
            steps: meta.steps,
            charges: [],
            totalPaid: 0,
            latestAmount: 0,
            previousAmount: 0,
            hasHike: false,
            hikePercentage: 0,
          }
        }
        recurringMap[key].charges.push({
          amount: Number(tx.amount || 0),
          date: tx.date,
        })
        recurringMap[key].totalPaid += Number(tx.amount || 0)
      }
    }
  }

  // Analyze price hikes
  const results = Object.values(recurringMap).map(sub => {
    // Sort chronologically
    sub.charges.sort((a, b) => new Date(a.date) - new Date(b.date))
    const len = sub.charges.length
    if (len >= 1) {
      sub.latestAmount = sub.charges[len - 1].amount
    }
    if (len >= 2) {
      sub.previousAmount = sub.charges[len - 2].amount
      if (sub.latestAmount > sub.previousAmount) {
        sub.hasHike = true
        sub.hikePercentage = Math.round(((sub.latestAmount - sub.previousAmount) / sub.previousAmount) * 100)
      }
    }
    return sub
  })

  const totalMonthlyBurn = results.reduce((s, sub) => s + (sub.latestAmount || 0), 0)
  const annualBurn = totalMonthlyBurn * 12

  return {
    subscriptions: results,
    totalMonthlyBurn,
    annualBurn,
    hikeCount: results.filter(s => s.hasHike).length,
  }
}
