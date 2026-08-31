import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

/**
 * Firebase is used ONLY as the SMS-OTP delivery + verification layer for phone login.
 * The student record itself still comes from Supabase (`students` table) — Firebase never
 * owns the profile. If the VITE_FIREBASE_* env vars are not set, the app falls back to the
 * built-in demo OTP so login keeps working without a Firebase project.
 */
const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || "AIzaSyCbfahCOpBprqewPzzaU84NjL7lUL74Ovg",
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || "apirelms.firebaseapp.com",
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || "apirelms",
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || "apirelms.firebasestorage.app",
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || "360412624184",
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || "1:360412624184:web:15348ef41365a669ac7dcd",
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string) || "G-CCYDPR31QQ",
};

/** True only when the minimum config needed for phone auth is present. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig as Record<string, string>);
  authInstance = getAuth(app);
}

/** Returns the initialized Firebase Auth, or throws if Firebase is not configured. */
export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    throw new Error('Firebase is not configured (VITE_FIREBASE_* env vars missing).');
  }
  return authInstance;
}

export { app as firebaseApp };
