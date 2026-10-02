/**
 * Hands-Free Wake Word Detector & Earcon Audio Synthesizer
 * Enables Alexa / Google Assistant style "Hey Manoj" hands-free voice wake-up.
 */

// Web Audio API Chime Synthesizer (Zero External Assets Required)
export function playWakeChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()

    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc2.type = 'sine'

    // Ascending Alexa-style two-tone wake chime (587Hz D5 -> 880Hz A5)
    osc1.frequency.setValueAtTime(587.33, now)
    osc1.frequency.setValueAtTime(880, now + 0.12)

    gain.gain.setValueAtTime(0.01, now)
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.05)
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
    const gain = ctx.createGain()

    osc.type = 'sine'
    // Gentle confirmation chime (880Hz -> 1046Hz)
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.setValueAtTime(1046.5, now + 0.1)

    gain.gain.setValueAtTime(0.01, now)
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.35)
  } catch {}
}

export function isWakeWordPresent(transcript) {
  if (!transcript || typeof transcript !== 'string') return false
  const text = transcript.toLowerCase().trim()
  // Matches "Hey Manoj", "Hi Manoj", "Hello Manoj", "OK Manoj", "Hey Alexa", "Hey Finance"
  const regex = /\b(hey|hi|hello|ok|okay)\s+(manoj|alexa|finance|assistant|buddy|jarvis)\b/i
  return regex.test(text)
}

export function extractCommandAfterWakeWord(transcript) {
  if (!transcript) return ''
  const cleaned = transcript
    .replace(/\b(hey|hi|hello|ok|okay)\s+(manoj|alexa|finance|assistant|buddy|jarvis)\b/gi, '')
    .trim()
  return cleaned
}

/**
 * Background Continuous Wake-Word Listener Service
 */
class WakeWordListenerService {
  constructor() {
    this.recognition = null
    this.isRunning = false
    this.onWakeWordDetected = null
  }

  start(onWake) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return false

    this.onWakeWordDetected = onWake
    this.isRunning = true

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-IN'

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript
          if (isWakeWordPresent(transcript)) {
            playWakeChime()
            const command = extractCommandAfterWakeWord(transcript)
            if (this.onWakeWordDetected) {
              this.onWakeWordDetected(command)
            }
          }
        }
      }

      recognition.onerror = (event) => {
        // Silently restart on temporary timeout unless explicitly stopped
        if (this.isRunning && event.error !== 'not-allowed') {
          setTimeout(() => {
            if (this.isRunning) this.restart()
          }, 1000)
        }
      }

      recognition.onend = () => {
        if (this.isRunning) {
          setTimeout(() => {
            if (this.isRunning) this.restart()
          }, 500)
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
    try {
      if (this.recognition) {
        this.recognition.stop()
      }
    } catch {}
  }
}

export const wakeWordService = new WakeWordListenerService()
