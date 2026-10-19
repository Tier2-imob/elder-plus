import AsyncStorage from '@react-native-async-storage/async-storage'
// `getReactNativePersistence` lives only in the inner `@firebase/auth` package's React Native
// entry, not the umbrella `firebase/auth`. Metro resolves `@firebase/auth` via its
// `"react-native": "dist/rn/index.js"` field at runtime, and the `@firebase/auth` → RN `.d.ts`
// entry in tsconfig `paths` supplies the matching types — so this is fully typed (no TS2305).
import { getReactNativePersistence } from '@firebase/auth'
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, initializeAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyA_11LPGbNIiCwZTN1zLTKE9bgBWNH9efk',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'elder-29dc3.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'elder-29dc3',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'elder-29dc3.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '282903276795',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '1:282903276795:web:8722efa5f6e4de5e5d945e',
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
const storage: FirebaseStorage = getStorage(app)

export { app, auth, db, storage }
