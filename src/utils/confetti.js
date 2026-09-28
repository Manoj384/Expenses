import confetti from 'canvas-confetti'

/**
 * Triggers full-screen milestone celebration confetti
 */
export function fireMilestoneConfetti() {
  try {
    // Left burst
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'],
    })

    // Right burst
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'],
    })
  } catch (e) {
    console.warn('Confetti animation error:', e)
  }
}
