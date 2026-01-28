import { initializeApp, getApp, getApps } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'

function firebaseConfigFromEnv() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  }
}

export function isFirebaseAuthConfigured() {
  const cfg = firebaseConfigFromEnv()
  return Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId)
}

export function getFirebaseApp() {
  const cfg = firebaseConfigFromEnv()
  if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId || !cfg.appId) {
    throw new Error(
      'Firebase Auth is not configured. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID.',
    )
  }

  if (getApps().length > 0) return getApp()
  return initializeApp(cfg)
}

export function getFirebaseAuth() {
  const app = getFirebaseApp()
  return getAuth(app)
}

export function onAuthStateChangedSafe(callback) {
  const auth = getFirebaseAuth()
  return onAuthStateChanged(auth, callback)
}

export async function signInWithGoogle() {
  const auth = getFirebaseAuth()
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  try {
    // Best UX on desktop.
    return await signInWithPopup(auth, provider)
  } catch (e) {
    // Some browsers block popups; redirect is a safe fallback.
    const code = String(e?.code || '')
    const popupBlocked = code.includes('popup-blocked') || code.includes('popup-closed-by-user')
    if (popupBlocked) {
      await signInWithRedirect(auth, provider)
      return null
    }
    throw e
  }
}

export async function signOutUser() {
  const auth = getFirebaseAuth()
  await signOut(auth)
}
