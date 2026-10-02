/**
 * WebAuthn Hardware Biometric Authentication Utility
 * Supports Face ID, Touch ID, Windows Hello, and Android Fingerprint.
 */

const BIOMETRIC_ENABLED_KEY = 'ft_biometric_enabled'
const BIOMETRIC_CRED_KEY = 'ft_biometric_cred_id'
const AUTO_LOCK_KEY = 'ft_auto_lock_inactivity'

// Convert string to Uint8Array buffer
function strToBuffer(str) {
  return Uint8Array.from(str, c => c.charCodeAt(0))
}

// Convert ArrayBuffer to Base64
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Convert Base64 to Uint8Array
function base64ToBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export async function isBiometricsAvailable() {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) return false
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function isBiometricsEnabled() {
  try {
    return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true'
  } catch {
    return false
  }
}

export function setBiometricsEnabled(enabled) {
  try {
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false')
  } catch {}
}

export async function registerBiometrics(username = 'Personal Finance User') {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      // Graceful fallback for non-WebAuthn environments
      setBiometricsEnabled(true)
      return { success: true, fallback: true }
    }

    const challenge = new Uint8Array(32)
    window.crypto.getRandomValues(challenge)
    const userId = strToBuffer(username + '_' + Date.now())

    const createOptions = {
      publicKey: {
        challenge,
        rp: {
          name: 'Personal Wealth Tracker',
          id: window.location.hostname === 'localhost' ? 'localhost' : undefined,
        },
        user: {
          id: userId,
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    }

    const credential = await navigator.credentials.create(createOptions)
    if (credential) {
      const rawId = bufferToBase64(credential.rawId)
      localStorage.setItem(BIOMETRIC_CRED_KEY, rawId)
      setBiometricsEnabled(true)
      return { success: true }
    }
    return { success: false, error: 'Registration failed' }
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Biometric registration was cancelled.' }
    }
    // Fallback enable anyway with PIN fallback
    setBiometricsEnabled(true)
    return { success: true, fallback: true }
  }
}

export async function authenticateBiometrics() {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return { success: false, error: 'Biometrics not supported on this browser.' }
    }

    const challenge = new Uint8Array(32)
    window.crypto.getRandomValues(challenge)

    const savedCred = localStorage.getItem(BIOMETRIC_CRED_KEY)
    const allowCredentials = savedCred
      ? [{ id: base64ToBuffer(savedCred), type: 'public-key' }]
      : []

    const getOptions = {
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'preferred',
        ...(allowCredentials.length > 0 ? { allowCredentials } : {}),
      },
    }

    const assertion = await navigator.credentials.get(getOptions)
    if (assertion) {
      return { success: true }
    }
    return { success: false, error: 'Biometric verification failed.' }
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Biometric prompt cancelled or timed out.' }
    }
    return { success: false, error: err.message || 'Biometric verification error.' }
  }
}
