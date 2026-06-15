// Browser-only Firebase wiring for App Check (anti-bot attestation) and Auth
// (end-user sign-in). The site is a static export with no server runtime, so all
// of this runs client-side and is initialised lazily on first use.
//
// Everything degrades gracefully when the NEXT_PUBLIC_FIREBASE_* env vars are
// absent (e.g. local dev against a backend with the gates disabled): token
// helpers return null and `isAuthConfigured()` is false, so the checkout login
// gate is skipped. Configure the vars in production to turn the protections on.
import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import {
  getToken,
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from 'firebase/app-check';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';

export type { User } from 'firebase/auth';

const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
// reCAPTCHA v3 (NOT Enterprise — v3 is free) site key that backs App Check.
const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

let app: FirebaseApp | undefined;
let appCheck: AppCheck | undefined;
let authInstance: Auth | undefined;

/** Whether the Firebase config is present — drives whether the login gate applies. */
export function isAuthConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId);
}

function ensureApp(): FirebaseApp | undefined {
  if (typeof window === 'undefined' || !isAuthConfigured()) return undefined;
  if (!app) {
    app = initializeApp(config);
    if (recaptchaSiteKey) {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  }
  return app;
}

function auth(): Auth | undefined {
  const a = ensureApp();
  if (!a) return undefined;
  if (!authInstance) authInstance = getAuth(a);
  return authInstance;
}

/** App Check attestation token for the `X-Firebase-AppCheck` header; null if unconfigured. */
export async function appCheckToken(): Promise<string | null> {
  ensureApp();
  if (!appCheck) return null;
  try {
    return (await getToken(appCheck, false)).token;
  } catch {
    return null;
  }
}

/** Firebase ID token for the `Authorization: Bearer` header; null if signed out/unconfigured. */
export async function idToken(): Promise<string | null> {
  const user = auth()?.currentUser;
  return user ? user.getIdToken() : null;
}

export async function signInWithGoogle(): Promise<User | null> {
  const a = auth();
  if (!a) return null;
  return (await signInWithPopup(a, new GoogleAuthProvider())).user;
}

export async function signOutUser(): Promise<void> {
  const a = auth();
  if (a) await signOut(a);
}

/** Subscribe to auth state; calls back with null immediately when unconfigured. */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  const a = auth();
  if (!a) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(a, callback);
}
