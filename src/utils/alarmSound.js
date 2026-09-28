/**
 * Web Audio API Clock & Alarm Chime Synthesizer
 * Generates an audible alarm sound without external MP3 dependencies.
 * Also triggers hardware vibration on supported mobile devices.
 */

let audioCtx = null
let alarmInterval = null
let isAlarmPlaying = false

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

/**
 * Play a single gentle alarm chime pulse (C5 -> E5 -> G5 -> C6)
 */
export function playChimeNote(freq = 587.33, duration = 0.25, timeOffset = 0) {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, ctx.currentTime + timeOffset)

    // Smooth attack and release envelope to sound like a digital clock chime
    gain.gain.setValueAtTime(0, ctx.currentTime + timeOffset)
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + timeOffset + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(ctx.currentTime + timeOffset)
    osc.stop(ctx.currentTime + timeOffset + duration)
  } catch (err) {
    console.warn('Audio chime play error:', err)
  }
}

/**
 * Play full 4-note clock alarm melody
 */
export function playClockAlarmSequence() {
  // Frequencies for D5 (587Hz), F#5 (739Hz), A5 (880Hz), D6 (1174Hz)
  playChimeNote(587.33, 0.18, 0)
  playChimeNote(739.99, 0.18, 0.15)
  playChimeNote(880.00, 0.18, 0.30)
  playChimeNote(1174.66, 0.35, 0.45)

  // Hardware vibration on Android / iOS (if supported)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([300, 100, 300, 100, 400])
    } catch {}
  }
}

/**
 * Start continuous looping clock alarm until user dismisses or snoozes
 */
export function startClockAlarm(maxLoops = 6) {
  stopClockAlarm()
  isAlarmPlaying = true
  playClockAlarmSequence()

  let count = 0
  alarmInterval = setInterval(() => {
    count++
    if (count >= maxLoops) {
      stopClockAlarm()
    } else {
      playClockAlarmSequence()
    }
  }, 2000)
}

/**
 * Stop any currently sounding alarm
 */
export function stopClockAlarm() {
  if (alarmInterval) {
    clearInterval(alarmInterval)
    alarmInterval = null
  }
  isAlarmPlaying = false
}

export function isAlarmSounding() {
  return isAlarmPlaying
}
