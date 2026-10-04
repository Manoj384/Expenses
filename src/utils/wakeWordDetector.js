/**
 * Hands-Free Wake Word Detector & Voice Fingerprint Engine
 *
 * v3 – Precision Trigger Edition
 * ─────────────────────────────────────────────────────────
 * 1. Background listening ONLY runs if user explicitly turns ON
 *    Hands-Free Wake Word in settings / modal (default: OFF).
 * 2. Strict phrase matching ("Hey Manoj", "OK Manoj", "Okay Manoj").
 * 3. 5-second debounce cooldown to prevent repeated/rapid firing.
 * 4. Biometric voice fingerprint matching (when enrolled).
 */

const PROFILE_KEY   = 'manoj_voice_profile'
const WAKE_ENABLED_KEY = 'manoj_wake_word_enabled'
const SIMILARITY_THRESHOLD = 0.70   // 0–1; 1 = identical voice
const ENROLL_DURATION_MS   = 3500   // ms of audio captured during enrolment
const LIVE_CAPTURE_MS      = 1800   // ms of audio analysed during wake check

// ─── Wake-Word Toggle Persistence ─────────────────────────────────────────────

export function isWakeWordEnabled() {
  try {
    return localStorage.getItem(WAKE_ENABLED_KEY) === 'true'
  } catch {
    return false
  }
}

export function setWakeWordEnabled(enabled) {
  try {
    localStorage.setItem(WAKE_ENABLED_KEY, enabled ? 'true' : 'false')
    window.dispatchEvent(new CustomEvent('wake-word-setting-changed', { detail: { enabled } }))
  } catch {}
}

// ─── Audio chimes ────────────────────────────────────────────────────────────

export function playWakeChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx  = new AudioContext()
    const now  = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, now)
    osc1.frequency.setValueAtTime(880, now + 0.12)

    gain.gain.setValueAtTime(0.01, now)
    gain.gain.exponentialRampToValueAtTime(0.3,   now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

    osc1.connect(gain)
    gain.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.4)
  } catch {}
}

export function playSuccessChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain= ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880,    now)
    osc.frequency.setValueAtTime(1046.5, now + 0.1)

    gain.gain.setValueAtTime(0.01, now)
    gain.gain.exponentialRampToValueAtTime(0.2,   now + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.35)
  } catch {}
}

// ─── Voice fingerprint helpers ────────────────────────────────────────────────

/**
 * Capture frequency-spectrum fingerprint from the microphone for `durationMs`.
 * Returns a normalised Float32Array of 128 frequency bins, or null on error.
 */
export async function captureVoiceFingerprint(durationMs = ENROLL_DURATION_MS) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    const AudioContext = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioContext()

    const source   = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256   // 128 frequency bins
    source.connect(analyser)

    const BIN_COUNT = analyser.frequencyBinCount   // 128
    const accumulator = new Float32Array(BIN_COUNT)
    let sampleCount = 0

    return await new Promise((resolve) => {
      const intervalMs = 60  // sample every 60 ms
      const timerId = setInterval(() => {
        const data = new Uint8Array(BIN_COUNT)
        analyser.getByteFrequencyData(data)
        for (let i = 0; i < BIN_COUNT; i++) accumulator[i] += data[i]
        sampleCount++
      }, intervalMs)

      setTimeout(() => {
        clearInterval(timerId)
        // Stop mic
        stream.getTracks().forEach(t => t.stop())
        ctx.close()

        if (sampleCount === 0) { resolve(null); return }

        // Average and normalise to 0–1
        const avg    = new Float32Array(BIN_COUNT)
        let   maxVal = 0
        for (let i = 0; i < BIN_COUNT; i++) {
          avg[i] = accumulator[i] / sampleCount
          if (avg[i] > maxVal) maxVal = avg[i]
        }
        if (maxVal === 0) { resolve(null); return }
        for (let i = 0; i < BIN_COUNT; i++) avg[i] /= maxVal

        resolve(avg)
      }, durationMs)
    })
  } catch {
    return null
  }
}

/** Cosine similarity between two Float32Arrays. Returns 0–1. */
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dot   += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

// ─── Profile persistence ───────────────────────────────────────────────────────

/** Returns enrolled voice profile or null. */
export function getVoiceProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return null
    const { bins, enrolledAt } = JSON.parse(raw)
    return { bins: new Float32Array(bins), enrolledAt }
  } catch {
    return null
  }
}

/** Persist a voice profile. */
export function saveVoiceProfile(bins, enrolledAt = new Date().toISOString()) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({
      bins: Array.from(bins),
      enrolledAt,
    }))
    return true
  } catch {
    return false
  }
}

/** Delete stored voice profile. */
export function deleteVoiceProfile() {
  try { localStorage.removeItem(PROFILE_KEY) } catch {}
}

/** Has the user enrolled their voice? */
export function isVoiceEnrolled() {
  return getVoiceProfile() !== null
}

/**
 * Enrol user's voice:
 *  1. Capture fingerprint for ENROLL_DURATION_MS
 *  2. Save to localStorage
 * Returns { ok, profile } or { ok: false, error }
 */
export async function enrollVoice() {
  const bins = await captureVoiceFingerprint(ENROLL_DURATION_MS)
  if (!bins) return { ok: false, error: 'Could not access microphone or no audio captured.' }
  const enrolledAt = new Date().toISOString()
  saveVoiceProfile(bins, enrolledAt)
  return { ok: true, profile: { bins, enrolledAt } }
}

/**
 * Check if a freshly captured voice sample matches the enrolled profile.
 * Returns { match: bool, score: 0–1 }
 */
export async function verifyVoice() {
  const profile = getVoiceProfile()
  if (!profile) return { match: true, score: 1 }   // No profile → pass through

  const liveBins = await captureVoiceFingerprint(LIVE_CAPTURE_MS)
  if (!liveBins) return { match: false, score: 0 }

  const score = cosineSimilarity(profile.bins, liveBins)
  return { match: score >= SIMILARITY_THRESHOLD, score: Math.round(score * 100) / 100 }
}

// ─── Strict Keyword helpers ──────────────────────────────────────────────────

export function isWakeWordPresent(transcript) {
  if (!transcript || typeof transcript !== 'string') return false
  const text = transcript.toLowerCase().trim()
  const regex = /\b(hey|ok|okay|hello|hi)\s+(manoj|alexa|jarvis)\b/i
  return regex.test(text)
}

export function extractCommandAfterWakeWord(transcript) {
  if (!transcript) return ''
  return transcript
    .replace(/\b(hey|ok|okay|hello|hi)\s+(manoj|alexa|jarvis)\b/gi, '')
    .trim()
}

// ─── Background Wake-Word Listener Service ────────────────────────────────────

class WakeWordListenerService {
  constructor() {
    this.recognition = null
    this.isRunning   = false
    this.onWakeWordDetected = null
    this._verifying  = false
    this._lastTrigger = 0
  }

  start(onWake) {
    // If not enabled in user preferences, do not start background listening
    if (!isWakeWordEnabled()) {
      return false
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return false

    this.onWakeWordDetected = onWake
    this.isRunning = true

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous     = true
      recognition.interimResults = true
      recognition.lang           = 'en-IN'

      recognition.onresult = async (event) => {
        const now = Date.now()
        // 5-second cooldown between wake triggers
        if (now - this._lastTrigger < 5000) return

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript

          if (!isWakeWordPresent(transcript)) continue
          if (this._verifying) continue

          const profileExists = isVoiceEnrolled()

          if (!profileExists) {
            this._lastTrigger = Date.now()
            playWakeChime()
            const command = extractCommandAfterWakeWord(transcript)
            this.onWakeWordDetected?.(command)
            break
          } else {
            this._verifying = true
            try {
              const { match } = await verifyVoice()
              if (match) {
                this._lastTrigger = Date.now()
                playWakeChime()
                const command = extractCommandAfterWakeWord(transcript)
                this.onWakeWordDetected?.(command)
                break
              }
            } catch {}
            finally {
              this._verifying = false
            }
          }
        }
      }

      recognition.onerror = (event) => {
        if (this.isRunning && event.error !== 'not-allowed') {
          setTimeout(() => { if (this.isRunning) this.restart() }, 1500)
        }
      }

      recognition.onend = () => {
        if (this.isRunning) {
          setTimeout(() => { if (this.isRunning) this.restart() }, 1000)
        }
      }

      this.recognition = recognition
      recognition.start()
      return true
    } catch {
      return false
    }
  }

  restart() {
    try {
      if (this.recognition) {
        this.recognition.abort()
        this.recognition.start()
      }
    } catch {}
  }

  stop() {
    this.isRunning = false
    this._verifying = false
    try {
      if (this.recognition) {
        this.recognition.stop()
      }
    } catch {}
    this.recognition = null
  }
}

export const wakeWordService = new WakeWordListenerService()
