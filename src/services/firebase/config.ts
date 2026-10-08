import AsyncStorage from '@react-native-async-storage/async-storage'
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyB20TY1sKpIW4u3bob3A0hWCK0MgE_Dl6A',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'gen-lang-client-0201344960.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'gen-lang-client-0201344960',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'gen-lang-client-0201344960.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '223516053542',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '1:223516053542:web:74fe1f74a03673722496e7',
}

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

// Persistence over AsyncStorage. The RN-only `getReactNativePersistence` export from
// '@firebase/auth' does NOT resolve under this project's tsconfig (tsc TS2305 — the inner
// package's React Native entry is not selected by the configured module resolution), so per
// design.md step 3 we use a tiny hand-written Persistence adapter over AsyncStorage instead of
// forcing the import. It implements the `_isAvailable/_set/_get/_remove` surface the Auth
// internals call at runtime and is cast to the public `Persistence` type for `initializeAuth`.
const asyncStoragePersistence = {
  type: 'LOCAL' as const,
  async _isAvailable(): Promise<boolean> {
    try {
      await AsyncStorage.setItem('__firebase_persistence_probe__', '1')
      await AsyncStorage.removeItem('__firebase_persistence_probe__')
      return true
    } catch {
      return false
    }
  },
  async _set(key: string, value: object | string): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  },
  async _get<T extends object | string>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  },
  async _remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key)
  },
  // No-op cross-tab listeners: AsyncStorage has no storage events on native.
  _addListener(_key: string, _listener: unknown): void {},
  _removeListener(_key: string, _listener: unknown): void {},
} as unknown as Persistence

// initializeAuth must run exactly once; on Fast Refresh it throws auth/already-initialized,
// in which case we reuse the existing instance via getAuth(app).
let auth: Auth
try {
  auth = initializeAuth(app, { persistence: asyncStoragePersistence })
} catch {
  auth = getAuth(app)
}

const db: Firestore = getFirestore(app)
const storage: FirebaseStorage = getStorage(app)

export { app, auth, db, storage }
