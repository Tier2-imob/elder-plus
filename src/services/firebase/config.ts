import AsyncStorage from '@react-native-async-storage/async-storage'
// `getReactNativePersistence` lives only in the inner `@firebase/auth` package's React Native
// entry, not the umbrella `firebase/auth`. Metro resolves `@firebase/auth` via its
// `"react-native": "dist/rn/index.js"` field at runtime, and the `@firebase/auth` → RN `.d.ts`
// entry in tsconfig `paths` supplies the matching types — so this is fully typed (no TS2305).
import { getReactNativePersistence } from '@firebase/auth'
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, initializeAuth, type Auth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

// Config comes only from the environment (.env locally, EAS environment variables in builds) —
// never committed. Each var is read with a static `process.env.EXPO_PUBLIC_*` access because Expo
// inlines only that exact form at build time (a dynamic process.env[name] would be undefined).
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} não configurada. Copie .env.example para .env (local) ou crie a variável no EAS (builds).`
    )
  }
  return value
}

const firebaseConfig = {
  apiKey: requireEnv('EXPO_PUBLIC_FIREBASE_API_KEY', process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
  authDomain: requireEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: requireEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: requireEnv(
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
  ),
  messagingSenderId: requireEnv(
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  ),
  appId: requireEnv('EXPO_PUBLIC_FIREBASE_APP_ID', process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
}

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

// AsyncStorage-backed LOCAL persistence. `getReactNativePersistence` is the SDK's own factory:
// it returns a real Persistence class/constructor that Auth's internals instantiate with `new`.
// This is why it does not throw "Expected a class definition" like the previous hand-written
// object-literal adapter did. async-storage here is v2 (2.2.0), so the default AsyncStorage
// export is passed directly (the v3 `createAsyncStorage` shape does not apply).
const persistence = getReactNativePersistence(AsyncStorage)

// initializeAuth must run exactly once. On Fast Refresh it throws auth/already-initialized;
// in that case only, reuse the existing instance via getAuth(app). Any other error is a real
// initialization failure and is re-thrown rather than silently masked.
let auth: Auth
try {
  auth = initializeAuth(app, { persistence })
} catch (error) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'auth/already-initialized'
  ) {
    auth = getAuth(app)
  } else {
    throw error
  }
}

const db: Firestore = getFirestore(app)

// Desenvolvimento local: com EXPO_PUBLIC_FIREBASE_EMULATOR_HOST (o IP do computador na rede, em
// .env.local) o app usa o Firebase Emulator (`npm run emulators`) em vez de homologação. O
// EXPO_PUBLIC_FIREBASE_PROJECT_ID precisa ser "demo-elder", o projeto do emulador.
const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST
if (emulatorHost) {
  try {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true })
    connectFirestoreEmulator(db, emulatorHost, 8080)
  } catch (error) {
    // Fast Refresh re-runs this module: the emulator connection is already set up.
    console.warn('Firebase emulator already connected', error)
  }
}
const storage: FirebaseStorage = getStorage(app)

export { app, auth, db, storage }
