/**
 * Cross-Platform Haptic Feedback Engine
 * Provides subtle tactile micro-interactions on mobile devices via the Vibration API
 * with graceful fallbacks on desktop/unsupported browsers.
 */

function canVibrate() {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

/**
 * 10ms light tick: tab change, filter click, chip selection
 */
export function hapticLight() {
  if (canVibrate()) {
    try {
      navigator.vibrate(10)
    } catch {}
  }
}

/**
 * 20ms medium tap: button press, modal open/close, card selection
 */
export function hapticMedium() {
  if (canVibrate()) {
    try {
      navigator.vibrate(20)
    } catch {}
  }
}

/**
 * 35ms heavy impact: pull-to-refresh trigger, destructive swipe
 */
export function hapticHeavy() {
  if (canVibrate()) {
    try {
      navigator.vibrate(35)
    } catch {}
  }
}

/**
 * Double-tick pulse: transaction saved, target achieved, PIN matched
 */
export function hapticSuccess() {
  if (canVibrate()) {
    try {
      navigator.vibrate([15, 60, 20])
    } catch {}
  }
}

/**
 * Rapid warning pulse: validation error, PIN mismatch, duplicate warning
 */
export function hapticError() {
  if (canVibrate()) {
    try {
      navigator.vibrate([40, 50, 40])
    } catch {}
  }
}

/**
 * Micro selection tick for scrolling dials or number pickers
 */
export function hapticSelection() {
  if (canVibrate()) {
    try {
      navigator.vibrate(8)
    } catch {}
  }
}
