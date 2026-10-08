# Elder — Firebase Backend Integration (Wave 1) — Technical Design

> Revision 4 — resolves every finding of the Revision 3 review
> (`.agents/tasks/design-review.md` / `.json`): HIGH-1 (`users.ts`/`auth.ts` surfaces now have
> explicit signature blocks + a `UserProfile` DTO + an explicit layering decision), MED-2
> (`getReactNativePersistence` `customConditions` claim downgraded to an install-time `tsc` check
> with an AsyncStorage adapter catch-all fallback for any resolution failure), MED-3 (`signUp`
> awaits cleanup of the just-created auth user on a profile-write failure before rejecting, with one
> generic PT message), MED-4 (`WeekView` gets an explicit `{ tasks, done, onDone }` signature and
> filters the prop list), and the four NITs. See the Revision-4 note at the end of **Responses to
> design review**.
>
> Revision 3 — resolves every finding of the Revision 2 review
> (`.agents/tasks/design-review.md`): both HIGH (self-contradicting `_layout.tsx`
> snippet; signup/root double-navigation + partner regression), all three MEDIUM
> (loading-gate hang on favorites failure; implicit login validation rule; `onSubmitReview`
> contract), and the four NITs. See **Responses to design review** at the end for a
> finding-by-finding account.

## Overview

This design turns the Elder prototype into a product backed by Firebase, satisfying
the Wave 1 requirements (`requirements.md`). It introduces one new layer —
`src/services/firebase/` — that owns every Firebase call, and rewires the existing
`AccountContext` and route wrappers to consume that layer. The pure screens in
`src/screens/*.tsx` keep their current props-only contract and never import Firebase,
preserving the two-layer wrapper/screen split, the `@/` alias, and NativeWind styling.
Nothing about the palette, fonts, or visual layout changes beyond the two small,
explicitly-specified header affordances for logout and documents (both thin
callback-driven additions in the existing style, within NFR-4 tolerance).

The stack is **locked** to the Firebase JS SDK (modular, package `firebase`, latest
SDK-compatible, resolved via `npx expo install`), `@react-native-async-storage/async-storage`
for Auth persistence, and `expo-document-picker` + `expo-image-picker` for the documents
feature. No `@react-native-firebase`, no `getAnalytics`, no `expo-notifications`, no dev
build — the app stays runnable in Expo Go (Expo SDK 57, React Native 0.86, React 19 — all
confirmed in `package.json`).

The data lives in Firestore (`users/{uid}` with per-user subcollections for favorites and
tasks; `businesses/{businessId}/reviews` for globally visible reviews) and in Cloud Storage
(`users/{uid}/documents/`). The catalog (`CATEGORY_DATA` in `discover-data.ts`) stays a local
seed; `businessId` is the local `ServiceItem.id` (`s1`, `f2`, …).

## Technology stack (locked)

| Concern | Choice |
| --- | --- |
| Firebase client | `firebase` meta-package, modular v9+ API (installed version resolved via `npx expo install`; expected v13.x but confirmed at install time) |
| App init | `initializeApp` (singleton, guarded with `getApps()`) |
| Auth | `initializeAuth` + React Native persistence over AsyncStorage |
| Auth persistence storage | `@react-native-async-storage/async-storage` |
| Firestore | `getFirestore` (singleton) |
| Storage | `getStorage` (singleton) |
| File picking | `expo-document-picker` (any file) + `expo-image-picker` (camera roll images) |
| Analytics | **not used** (`getAnalytics` breaks under RN) |

### Decision pending install-time verification: the `getReactNativePersistence` import path

`requirements.md` (NFR-7 / FR-A1) flags this as the one API that must be confirmed against
the **installed** types rather than memory. `firebase` is **not yet installed** — it is absent
from `package.json` and there is no `node_modules` in this worktree — so the exact version and
`.d.ts` paths below are pre-install expectations, not verified facts. What **is** confirmed in
this tree: the project `tsconfig.json` extends `expo/tsconfig.base.json`. The resolution mechanism
this import relies on is that the base config sets `"moduleResolution": "bundler"` **and**
`"customConditions": ["react-native"]` — but because `node_modules` is absent in this worktree, the
**contents** of `expo/tsconfig.base.json` cannot be verified here. Treat the `customConditions`
claim as an **unverified expectation**, not a confirmed fact: it is checked at install time by the
ordered steps below, and if the import does not resolve for *any* reason, the AsyncStorage adapter
fallback (step 3) applies.

Expected shape (to re-verify at implementation time):

- `getReactNativePersistence` is **not** exported from the `firebase/auth` meta-package subpath
  in recent majors (v10–v13): the `./auth` export map declares only `types`/`node`/`browser`/
  `default` conditions and its public typings do not declare the symbol. Importing it from
  `'firebase/auth'` would therefore fail `tsc --noEmit`.
- The symbol **is** expected on the inner `@firebase/auth` package's React Native entry
  (`dist/rn/index.rn.d.ts`), which that package exposes through a `react-native` export condition.
  Under `customConditions: ["react-native"]` both `tsc` and Metro resolve that entry.

**Decision (import path):**

```ts
import { getReactNativePersistence } from '@firebase/auth' // RN-only export — verify at install time
```

**Mandatory, ordered implementation steps (do these before writing `config.ts`):**

1. Run `npx expo install firebase @react-native-async-storage/async-storage expo-document-picker expo-image-picker` **first**.
2. **Verify the import actually resolves**, not just that a `.d.ts` exists. Write the
   `import { getReactNativePersistence } from '@firebase/auth'` line (and the `config.ts` usage) and
   run `npx tsc --noEmit`; it must resolve the symbol with no error. A grep of
   `node_modules/@firebase/auth/dist/rn/index.rn.d.ts` is a useful cross-check, but the authoritative
   gate is that `tsc --noEmit` resolves the import under the project's real `tsconfig` (which is where
   the `customConditions` expectation is actually exercised). Only proceed with this import path if
   `tsc` resolves it.
3. **Catch-all fallback.** If `tsc --noEmit` does **not** resolve the import for *any* reason —
   `customConditions: ["react-native"]` not set by `expo/tsconfig.base.json`, the symbol moved or
   was removed from the RN entry, or an export-map/condition change in the installed major — do
   **not** force the `@firebase/auth` import. Instead implement a tiny hand-written `Persistence`
   adapter over AsyncStorage (`_isAvailable`/`_set`/`_get`/`_remove`) and pass it to
   `initializeAuth(app, { persistence: <adapter> })`. This fallback is the single catch-all for any
   resolution failure (not only the "symbol moved" case), so persistence works regardless of why the
   RN export did not resolve.

All other Auth symbols (`initializeApp`, `initializeAuth`, `getAuth`, `onAuthStateChanged`,
`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`, and the `Auth`/`User`
types) import normally from `firebase/auth`.

## Dependencies and configuration changes

Install with Expo's resolver so versions match the SDK (this is step 1 above):

```bash
npx expo install firebase @react-native-async-storage/async-storage expo-document-picker expo-image-picker
```

- `firebase` — JS SDK (no native modules; Expo Go compatible).
- `@react-native-async-storage/async-storage` — Expo Go bundles this native module, so no dev
  build is required.
- `expo-document-picker`, `expo-image-picker` — both included in Expo Go's native runtime
  (confirm against `https://docs.expo.dev/versions/v57.0.0/` at install time per NFR-7).

**app.json changes:** append `expo-image-picker` as a config plugin so its iOS/Android permission
strings are declared (harmless under Expo Go, correct for a future dev build). The existing
`plugins` array has exactly `expo-router` and the `expo-splash-screen` entry (confirmed); add the
third entry, leaving the first two verbatim:

```json
"plugins": [
  "expo-router",
  ["expo-splash-screen", { "backgroundColor": "#208AEF", "image": "./assets/images/splash-icon.png", "imageWidth": 76 }],
  ["expo-image-picker", {
    "photosPermission": "O Elder usa suas fotos para anexar exames e receitas ao seu perfil."
  }]
]
```

`expo-document-picker` needs no plugin entry. Do **not** add any `getAnalytics`, FCM, or
notifications plugin. Keep `experiments.typedRoutes` and `reactCompiler` as-is.

**Environment / `.env.example`:** `config.ts` reads `process.env.EXPO_PUBLIC_FIREBASE_*` with
committed defaults for project `gen-lang-client-0201344960` (public Expo client values, not
secrets — A-6/NFR-5). Add a committed `.env.example` at the repo root documenting the keys.
`.gitignore` already ignores `.env*.local`, so a developer's local override file is never
committed; `.env.example` itself is committed.

**`.env.example` is documentation only — do not copy it to a live `.env` (addresses review
Finding 6).** `config.ts` uses `process.env.EXPO_PUBLIC_FIREBASE_* ?? '<committed default>'`, and
`??` only triggers on `undefined`. If `.env.example`'s empty keys are copied into a real `.env`,
`process.env.*` resolves to the empty string `''` (not `undefined`), so the `??` committed default
**never applies** and Firebase initializes with blank credentials (contradicting NFR-5/A-6). The
committed defaults in `config.ts` are the intended working values; `.env.example` exists purely to
document the key names. Developers who want to override a value must set it to a real value — they
must **not** copy the empty example to `.env`, and must leave any key they are not overriding
**unset** (absent) rather than present-but-empty, so the `??` fallback can apply.

```
# .env.example — Firebase (valores públicos do cliente Expo, não são segredo)
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

## `src/services/firebase/` module layout

```
src/services/firebase/
  config.ts        # env-based config object + initializeApp/Auth/Firestore/Storage singletons
  auth.ts          # email+password signup/login/logout + onAuthStateChanged wrapper
  auth-errors.ts   # FirebaseError code → Portuguese message map
  users.ts         # users/{uid} profile create/read; AccountRole normalization
  favorites.ts     # users/{uid}/favorites per-user favorites CRUD
  reviews.ts       # businesses/{businessId}/reviews read + add
  tasks.ts         # users/{uid}/tasks read/seed/complete
  files.ts         # Storage users/{uid}/documents/ upload/list/delete
  types.ts         # shared DTO types (UserProfile, ReviewDoc, TaskDoc, StoredDocument)
```

Only `config.ts` calls `initializeApp`/`initializeAuth`/`getFirestore`/`getStorage`. Every other
module imports the singletons (`auth`, `db`, `storage`) from `config.ts`. No module calls
`getAnalytics` (FR-X4 / AC-27).

### `users.ts` and `auth.ts` — module surfaces (addresses review Finding 1)

These two modules carry the same explicit signature rigor as `favorites.ts`/`reviews.ts`/`tasks.ts`/
`files.ts`. The `UserProfile` DTO is declared in `types.ts`, and the `AccountRole` normalization
rule is pinned down so FR-U1/FR-U2/FR-U3, AC-3, and AC-8 have exact contracts rather than inferred
ones.

```ts
// types.ts — shared DTO
import type { Timestamp } from 'firebase/firestore'
import type { AccountRole } from '@/components/types'

export type UserProfile = { name: string; role: AccountRole; email: string; createdAt: Timestamp | null }
```

```ts
// users.ts — users/{uid} profile create/read + AccountRole normalization
normalizeRole(raw: unknown): AccountRole
  // returns `raw` when it is one of 'elder' | 'family' | 'partner'; otherwise falls back to 'family'
createProfile(uid: string, input: { name: string; role: AccountRole; email: string }): Promise<void>
  // setDoc(doc(db, 'users', uid), { ...input, createdAt: serverTimestamp() })
getProfile(uid: string): Promise<UserProfile | null>
  // getDoc(doc(db, 'users', uid)); if !snap.exists() → null; else map snap.data() through
  // normalizeRole and return { name, role: normalizeRole(data.role), email, createdAt: data.createdAt ?? null }
```

```ts
// auth.ts — thin wrapper over firebase/auth (email+password + auth-state subscription)
signUp(input: { name: string; role: AccountRole; email: string; password: string }): Promise<User>
  // createUserWithEmailAndPassword(auth, email, password) → users.createProfile(cred.user.uid, { name, role, email })
  // → returns cred.user. On a profile-write failure, cleans up the just-created auth user before
  //   rejecting (see "signUp profile-write-failure recovery" below).
signIn(input: { email: string; password: string }): Promise<UserCredential>
  // signInWithEmailAndPassword(auth, email, password)
logout(): Promise<void>
  // signOut(auth)   (imported as `firebaseSignOut` to avoid colliding with the context's own signOut)
observeAuth(cb: (user: User | null) => void): () => void
  // onAuthStateChanged(auth, cb) wrapper; returns the unsubscribe function
```

**Layering decision (explicit).** `AccountContext` consumes `auth.ts` — it calls
`auth.signUp` / `auth.signIn` / `auth.logout` / `auth.observeAuth` and **never** imports
`firebase/auth` directly. `auth.ts` is the only module (besides `config.ts`) that imports
`firebase/auth`. This keeps the layer boundary intact (pure screens → context → `auth.ts` →
`firebase/auth`) and gives FR-X1's required `auth.ts` module a real caller, instead of the context
reaching past it into `firebase/auth`. The `onAuthStateChanged`/`createUserWithEmailAndPassword`/
`signInWithEmailAndPassword`/`signOut` calls shown in the *AccountContext refactor* handler and
`signUp` snippets below are the bodies of these `auth.ts` functions; the context invokes them
through `auth.observeAuth`, `auth.signUp`, `auth.signIn`, and `auth.logout` respectively.

### `config.ts` — single authoritative version

There is exactly **one** `config.ts`. `initializeApp` is guarded with `getApps()`, and
`initializeAuth` is wrapped in a `try/catch` that falls back to `getAuth(app)` on the
`auth/already-initialized` error raised by Fast Refresh double-init. `getAuth` is imported in the
same statement as `initializeAuth`, so the file compiles. There is no second/alternate snippet.

```ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app'
import { initializeAuth, getAuth, type Auth } from 'firebase/auth'
import { getReactNativePersistence } from '@firebase/auth' // RN-only export — verify at install time
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            ?? '<committed default from console>',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? 'gen-lang-client-0201344960.firebaseapp.com',
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         ?? 'gen-lang-client-0201344960',
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? '<committed bucket from console — see note>',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '<committed default from console>',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID             ?? '<committed default from console>',
}

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

// initializeAuth must run exactly once; on Fast Refresh it throws auth/already-initialized,
// in which case we reuse the existing instance via getAuth(app).
let auth: Auth
try {
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
} catch {
  auth = getAuth(app)
}

const db: Firestore = getFirestore(app)
const storage: FirebaseStorage = getStorage(app)

export { app, auth, db, storage }
```

**Committed defaults.** `apiKey`, `messagingSenderId`, and `appId` come from the Firebase console
web-app config of `gen-lang-client-0201344960`; the implementer pastes the exact values during
implementation.

**MUST-fill-before-first-run (addresses review Finding 7) — ordered step.** `apiKey`,
`storageBucket`, `messagingSenderId`, and `appId` ship as literal `'<committed default from
console>'` placeholder strings; only `authDomain` and `projectId` are real defaults. These four
placeholder strings satisfy `tsc`/lint (they are valid strings), so a green typecheck/lint does
**not** mean the app is runnable. Therefore, as an explicit ordered implementation step: **before
the first run, replace all four placeholders with the exact values from the Firebase console web-app
config** (and smoke-test the `storageBucket` per the note below). A `tsc`/lint pass must not be
mistaken for "done" while any `'<committed default from console>'` placeholder remains.

**`storageBucket` — confirm, do not guess (addresses Finding 9).** Do **not** ship a `.appspot.com`
guess. Open the Firebase console web-app config for the project and commit the **exact**
`storageBucket` string it shows (projects created recently use the `.firebasestorage.app` form;
older ones use `.appspot.com`). **A wrong bucket fails silently: `initializeApp`/`getStorage`
succeed and only the first `uploadBytes`/`listAll` fails at runtime (AC-21/22/23).** Therefore the
implementer must smoke-test one real upload+list in Expo Go before declaring the documents feature
done — a passing `tsc`/lint does not catch a wrong bucket.

## Firestore data model

```
users/{uid}
  name: string                 // from signup
  role: 'elder' | 'family' | 'partner'
  email: string                // mirror of the auth email (convenience)
  createdAt: Timestamp         // serverTimestamp()

users/{uid}/favorites/{businessId}
  businessId: string           // == ServiceItem.id (doc id and field are equal)
  createdAt: Timestamp

users/{uid}/tasks/{taskId}
  dayKey: string               // 'mon'..'sun'
  title: string
  time: string                 // 'HH:mm'
  day: string                  // human label, e.g. 'Quarta-feira, 14'
  icon: string                 // MaterialIcons glyph name (exact glyph persisted on seed; see Tasks)
  done: boolean
  order: number                // preserve seed ordering
  createdAt: Timestamp

businesses/{businessId}/reviews/{reviewId}
  rating: number               // 1..5
  comment: string
  author: string               // profile name of the writer
  authorUid: string            // for future rules / moderation
  createdAt: Timestamp
```

Design choices:

- **Favorites as one doc per business** (doc id = `businessId`) rather than an array field. This
  makes `toggleFavorite` a single `setDoc`/`deleteDoc` and avoids array-union race conditions,
  and `isFavorite` a local `Set` lookup after an initial `getDocs` load.
- **Tasks keyed by `taskId`** keep the seed ids (`t1`, `t2`) so the first-access seed is
  idempotent: seeding writes docs with those ids; a second launch finds them and does not
  re-seed. `order` preserves the visual sequence independent of Firestore's default ordering.
- **Reviews are a global subcollection** under `businesses/{businessId}` (A-4). There is no
  `businesses/{businessId}` parent document in this wave; the subcollection exists on its own,
  which Firestore allows. `businessId` is the local catalog id (A-5).

All server-set timestamps use `serverTimestamp()` so ordering is consistent across clients.

## AccountContext refactor

`src/state/account-context.tsx` is rewritten on top of Firebase Auth. The public surface the
screens already consume (`toggleFavorite`, `isFavorite`) is preserved verbatim (FR-F2 / AC-10);
`setAccount` is removed (it was the prototype mutator) and replaced by `signUp`/`signIn`/`signOut`.
The current file is confirmed to export exactly `{ account: {name, role} | null, setAccount,
favorites, toggleFavorite, isFavorite }` with no `uid`/`loading`/auth methods.

New context value:

```ts
type Account = { name: string; role: AccountRole; uid: string } | null

type AccountContextValue = {
  account: Account
  loading: boolean
  signUp: (input: { name: string; role: AccountRole; email: string; password: string }) => Promise<void>
  signIn: (input: { email: string; password: string }) => Promise<void>
  signOut: () => Promise<void>
  favorites: Set<string>
  toggleFavorite: (id: string) => void
  isFavorite: (id: string) => boolean
}
```

Behavior:

- On mount, subscribe via `auth.observeAuth(handler)` (which wraps `onAuthStateChanged(auth, …)`,
  FR-A4 — the context does not import `firebase/auth`). The handler is `async` and
  structured so that **`setLoading(false)` runs exactly once in a `finally`, regardless of any load
  outcome** (addresses Finding 3 — the splash gate can never hang, AC-9):

  ```ts
  const unsub = auth.observeAuth(async (user) => {  // wraps onAuthStateChanged inside auth.ts
    try {
      if (!user) {
        setAccount(null)
        setFavorites(new Set())
        return
      }
      // profile load — failure (missing doc or Firestore error) → account=null, surface one-time error
      let profile: UserProfile | null = null
      try {
        profile = await users.getProfile(user.uid)
      } catch (e) {
        console.warn('profile load failed', e)
      }
      if (!profile) {
        // auth user exists but no app profile (e.g. signup interrupted after createUser but
        // before the profile write): treat as signed-out at the app layer + one-time error.
        setAccount(null)
        setFavorites(new Set())
        setProfileError('Não foi possível carregar seu perfil. Entre novamente.')
        return
      }
      setAccount({ name: profile.name, role: profile.role, uid: user.uid })
      // favorites load — isolated so a failure never blocks loading; empty Set on failure
      try {
        const ids = await favorites.listFavorites(user.uid)
        setFavorites(new Set(ids))
      } catch (e) {
        console.warn('favorites load failed', e)
        setFavorites(new Set())
      }
    } finally {
      setLoading(false) // exactly once, every path
    }
  })
  return unsub // cleanup on unmount
  ```

  Rule, stated explicitly: profile load failure → `account = null` (+ one-time `profileError`);
  favorites load failure → empty `Set`; in **all** cases `loading` is set `false` exactly once in
  the `finally`. Neither a rejected `getProfile` nor a rejected `listFavorites` can leave `loading`
  stuck at `true`.
- `loading` starts `true` and flips to `false` only after this first auth resolution (and the
  profile/favorites load attempt when signed in) — this is what the root layout gates on (AC-9).
- `signUp` (addresses Finding 2 — partner must not get a session in Wave 1): the role is first
  normalized through the `AccountRole` union (FR-U3; values outside `elder|family|partner` fall back
  to `family`). **If the normalized role is `partner`, `signUp` throws a sentinel error immediately —
  before any Firebase call — so no auth user and no `users/{uid}` profile are ever created for a
  partner.** The sentinel is a plain `Error` with `code: 'app/partner-not-available'` (not a
  `FirebaseError`); `auth-errors.ts` maps that code to the Portuguese "em breve" message
  ("O Portal do Parceiro ainda não está disponível. Em breve!"). For `elder`/`family`, the context
  delegates to `auth.signUp({ name, role, email, password })`, whose body runs
  `createUserWithEmailAndPassword` → `users.createProfile(uid, { name, role, email })` (with the
  profile-write-failure recovery below); the `onAuthStateChanged` handler then populates `account`
  and `RootNavigator` performs the single redirect to `/explore`. Because partner never reaches
  `createUserWithEmailAndPassword`, A-2 and Out-of-Scope ("Portal do Parceiro continua sem destino")
  hold with no partner session or profile in Firestore. (The partner guard runs in the context
  before `auth.signUp` is called, so no auth user is created for a partner.)
- `signIn`: delegates to `auth.signIn` (`signInWithEmailAndPassword`); the subscription handles the rest.
- `signOut`: delegates to `auth.logout` (`firebaseSignOut(auth)`); the subscription resets `account`/`favorites`.

**`signUp` profile-write-failure recovery (addresses review Finding 3).** Inside `auth.signUp`, the
auth user is created first (`createUserWithEmailAndPassword`) and the `users/{uid}` profile is
written second (`users.createProfile`). If the profile write throws (Firestore unavailable or
permission denied), `auth.signUp` **must `await` cleanup of the just-created auth user before it
rejects** — call `deleteUser(cred.user)` (preferred, so no credential lingers), and if that cleanup
itself fails, fall back to `await firebaseSignOut(auth)` so at least no live session remains. Only
after the awaited cleanup does `signUp` reject. This prevents a stranded half-account: without it,
the auth user exists with no profile, so a retry with the same email hits
`auth/email-already-in-use` while the `onAuthStateChanged` handler would see a profile-less user and
set `profileError`. With the cleanup, the email is freed and the user can retry cleanly. The single
generic message the user sees on this path is the Portuguese string
**"Não foi possível concluir o cadastro. Tente novamente."** (surfaced via the signup wrapper's
`errorMessage`). Because the cleanup is awaited before the promise rejects, the auth user is already
gone by the time the wrapper shows the message, so the `onAuthStateChanged` handler never races to
set `profileError` for this signup — the signup wrapper's `errorMessage` is the sole message shown.
- `toggleFavorite(id)` stays **optimistic** (FR-F3). The optimistic rollback reverses **only the
  single id's membership**, never a whole-`Set` snapshot: on an `addFavorite` rejection it
  removes `id`; on a `removeFavorite` rejection it re-adds `id`. This is race-safe when two toggles
  overlap because each rollback touches a different id. Guarded to no-op when `account` is null.

  ```ts
  const toggleFavorite = useCallback((id: string) => {
    if (!account) return
    const wasFavorite = favoritesRef.current.has(id)
    // optimistic flip
    setFavorites((prev) => {
      const next = new Set(prev)
      wasFavorite ? next.delete(id) : next.add(id)
      return next
    })
    const op = wasFavorite
      ? favorites.removeFavorite(account.uid, id)
      : favorites.addFavorite(account.uid, id)
    op.catch((e) => {
      console.warn('toggleFavorite failed', e)
      // revert only this id's membership
      setFavorites((prev) => {
        const next = new Set(prev)
        wasFavorite ? next.add(id) : next.delete(id)
        return next
      })
    })
  }, [account])
  ```

  (`favoritesRef` is a `useRef` mirror of the `Set` so the pre-flip membership read does not depend
  on a stale closure.)
- `isFavorite(id)` stays a pure `Set.has` lookup — unchanged signature, so `DiscoverScreen` and
  `BusinessScreen` need no API change (FR-F2, AC-10/11/12).

`signUp`/`signIn`/`signOut` propagate thrown errors to the caller (the signup/login wrappers) so
the UI can render a readable message (NFR-6): `signUp` throws either the plain `app/partner-not-available`
sentinel (partner) or a `FirebaseError` (e.g. `auth/email-already-in-use`); `signIn` throws the
credential `FirebaseError`s. The context itself does not render UI, so it only logs unexpected
failures at `console.warn` level and rethrows. The missing-profile edge case surfaces through an
internal one-time `profileError` string set in the `onAuthStateChanged` handler; it is consumed by
`RootNavigator`/entry screens as a transient notice and is not part of the public context value
below (it does not change screen contracts).

## Root layout splash/loading gate

`src/app/_layout.tsx` currently gates on fonts only and registers exactly
`index/signup/explore/discover/business/care` (confirmed). It is extended to also gate on
`useAccount().loading`, to drive navigation by auth state (FR-A5, AC-1/5), and to register the two
new routes. Because `useAccount` must run inside `AccountProvider`, the gate logic moves into a
child component rendered under the provider.

**Full, final `_layout.tsx` (no ellipsis — this snippet is authoritative; every behavior the prose
below describes is present in it, and every route is listed so typed routes compile):**

```tsx
import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'

import '../../global.css'
import { AccountProvider, useAccount } from '@/state/account-context'

SplashScreen.preventAutoHideAsync()

const AUTH_ROUTES = ['index', 'login', 'signup'] as const

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { account, loading } = useAccount()
  const segments = useSegments()
  const router = useRouter()

  // Hide the native splash only once BOTH fonts and the auth/profile state are resolved,
  // so the user never sees an unstyled or pre-auth frame (AC-1).
  useEffect(() => {
    if (fontsReady && !loading) SplashScreen.hideAsync()
  }, [fontsReady, loading])

  // Single source of truth for auth-state navigation (see "Post-auth navigation ownership").
  // The signup/login wrappers never call router.replace to a protected route; they only set
  // their local submitting/errorMessage. This effect owns every signed-in / signed-out redirect.
  useEffect(() => {
    if (!fontsReady || loading) return
    const current = segments[0] ?? 'index'
    const inAuthRoute = (AUTH_ROUTES as readonly string[]).includes(current)
    // signed out on a protected route → back to the role picker/login entry
    if (!account && !inAuthRoute) {
      router.replace('/')
      return
    }
    // signed in while sitting on an auth route (index/login/signup) → into the app.
    // partner never reaches here: signUp for partner is blocked before any session exists
    // (see Signup flow), so `account` is non-null only for elder/family.
    if (account && inAuthRoute) router.replace('/explore')
  }, [account, loading, fontsReady, segments, router])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="explore" />
      <Stack.Screen name="discover" />
      <Stack.Screen name="business" />
      <Stack.Screen name="care" />
      <Stack.Screen name="documents" />
    </Stack>
  )
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'HankenGrotesk-Regular':   require('@/assets/fonts/HankenGrotesk-Regular.ttf'),
    'HankenGrotesk-SemiBold':  require('@/assets/fonts/HankenGrotesk-SemiBold.ttf'),
    'HankenGrotesk-Bold':      require('@/assets/fonts/HankenGrotesk-Bold.ttf'),
    'HankenGrotesk-ExtraBold': require('@/assets/fonts/HankenGrotesk-ExtraBold.ttf'),
  })

  return (
    <AccountProvider>
      <RootNavigator fontsReady={!!(fontsLoaded || fontError)} />
    </AccountProvider>
  )
}
```

Splash timing (addresses Finding 1). `SplashScreen.preventAutoHideAsync()` stays at module load.
`RootLayout` computes `fontsReady = !!(fontsLoaded || fontError)` and passes it to `RootNavigator`.
`SplashScreen.hideAsync()` is called from a `useEffect` inside `RootNavigator` gated on
`fontsReady && !loading` — i.e. once **both** fonts are resolved **and** `AccountContext.loading`
is `false`. The snippet above contains exactly this `hideAsync()` effect and the `fontsReady` prop;
there is no separate "render `null` until fonts load" branch — the native splash stays up until
`hideAsync()`, so the `Stack` can mount underneath without a visible unstyled frame. This matches
and extends the current real behavior (which hid the splash on fonts alone) rather than regressing
it. The snippet is the single authoritative representation; the prose adds no field that is absent
from it.

Redirect rules (addresses Findings 2 and 4 — `RootNavigator` is the sole owner of auth-state
navigation):

- `inAuthRoute` is computed from an explicit `AUTH_ROUTES = ['index','login','signup']` list.
- **The `segments[0] ?? 'index'` fallback is deliberate (addresses review Finding 5).** For the root
  route `/`, Expo Router's `useSegments()` returns an empty array `[]`, so `segments[0]` is
  `undefined`; the `?? 'index'` fallback is what classifies `/` as an auth route, which is what keeps
  a signed-out user on the root role-picker (AC-1). Do **not** "simplify" this fallback away —
  dropping it would leave `current` undefined on `/`, `inAuthRoute` false, and a signed-out user
  would be redirected off the root, breaking the signed-out-stays-on-root rule.
- Signed-out user on any route **not** in that list → `router.replace('/')` (then `return`, so the
  signed-in rule cannot also fire in the same pass).
- Signed-in user on **any** auth route — `index`, `login`, **and** `signup` — → `router.replace('/explore')`.
  This closes the gap where a signed-in user could linger on `signup` or `login`.
- The effect also gates on `fontsReady` so it never redirects before the first render settles.
- The guard conditions ensure `router.replace` fires only on an actual mismatch, so there is no
  infinite replace loop.
- **No wrapper performs a protected-route redirect.** The signup and login wrappers set only their
  local `submitting`/`errorMessage`; they never call `router.replace('/explore')`. This removes the
  two-writer race the Revision 2 review flagged (Finding 2): exactly one effect reacts to `account`
  becoming non-null.
- `partner` has no portal and **no session is ever created for it** in Wave 1 (see Signup flow): a
  partner signup is blocked before `createUserWithEmailAndPassword` runs, so `account` never becomes
  non-null for a partner and this effect never pushes a partner to `/explore`. This keeps A-2 and
  Out-of-Scope ("Portal do Parceiro continua sem destino") intact.

## Authentication flow

### Signup — extend `SignupScreen` while keeping it pure

`SignupScreen.tsx` keeps its two-layer purity (no Firebase import) and all current visuals: the
back button + role pill header, the `ROLE_CONTEXT[role]` copy, the `isNavy` tone branch, the
continue button, and the terms footer. It is **extended** to collect `email` and `password` in
addition to `name`. The stray trailing `3` token on the `canContinue` line
(`const canContinue = useMemo(() => name.trim().length > 1, [name]);3` — confirmed present) is
removed.

**New prop signature (breaking change, fully propagated):**

```ts
export function SignupScreen({
  role, onBack, onContinue, asset, topInset = 0, submitting = false, errorMessage,
}: {
  role: AccountRole
  onBack: () => void
  onContinue: (input: { name: string; email: string; password: string }) => void
  asset?: number
  topInset?: number
  submitting?: boolean   // disables the button + shows a spinner during async signUp
  errorMessage?: string  // readable auth error rendered under the form
})
```

**Concrete internal rebuild (carried from Revision 2, unchanged by this review):**

- Three controlled inputs via `useState`: `name`, `email`, `password`.
  - `name` input: unchanged props (`autoCapitalize="words"`, `autoFocus`), but `returnKeyType`
    becomes `"next"` and `onSubmitEditing` focuses the email input (via a `useRef<TextInput>`).
  - `email` input (new): `keyboardType="email-address"`, `autoCapitalize="none"`,
    `autoCorrect={false}`, `returnKeyType="next"`, `onSubmitEditing` focuses the password input.
  - `password` input (new): `secureTextEntry`, `autoCapitalize="none"`, `returnKeyType="done"`,
    `onSubmitEditing={handleContinue}`.
- `handleContinue` guards on `canContinue` then calls
  `onContinue({ name: name.trim(), email: email.trim(), password })`. It no longer passes a bare
  string.
- `canContinue = useMemo(...)` requires **all three** valid **and** `!submitting`:
  - `name`: `name.trim().length > 1` (unchanged rule).
  - `email`: matches `/\S+@\S+\.\S+/`.
  - `password`: `password.length >= 6` (Firebase minimum; avoids a round-trip for the trivial case).
- The continue button's `disabled`/styling keys off the new `canContinue`; while `submitting` it
  shows a spinner (`ActivityIndicator`) in place of the arrow icon and stays disabled.
- `errorMessage`, when present, renders as a small terracotta line above the button in the existing
  type scale.
- The `isNavy`/`ROLE_CONTEXT[role].tone` branch is **left exactly as-is** (Finding 6) — the
  extension adds inputs and does not touch the tone logic, `ROLE_CONTEXT`, or the `'terracota'`
  spelling in `constants.ts`.

**Wrapper `src/app/signup.tsx` (addresses Finding 2 — no wrapper redirect, partner handled by
`signUp`).** It replaces `setAccount` with an async handler and keeps reading `role` from
`useLocalSearchParams` with the current normalization
(`rawRole === 'partner' ? 'partner' : rawRole === 'elder' ? 'elder' : 'family'`). It holds local
`submitting`/`errorMessage` state. The flow is:

```tsx
async function onContinue({ name, email, password }: { name: string; email: string; password: string }) {
  setSubmitting(true)
  setErrorMessage(undefined)
  try {
    await signUp({ name, role, email, password })
    // No navigation here. For elder/family, signUp succeeds, `account` becomes non-null, and
    // RootNavigator (the single redirect owner) replaces to /explore. For partner, signUp throws
    // 'app/partner-not-available' below before any session exists.
  } catch (e) {
    setErrorMessage(toPtMessage(e)) // auth-errors.ts; maps app/partner-not-available + auth/* codes
  } finally {
    setSubmitting(false)
  }
}
```

The wrapper **no longer calls `router.replace('/explore')`** and **no longer has a partner
early-return TODO** — partner is now rejected inside `signUp` with a readable "em breve" message
shown via `errorMessage`, so the partner stays on the signup screen with no session and no profile
(A-2, Out-of-Scope). All navigation for a successful elder/family signup is owned by
`RootNavigator`. Any `FirebaseError` (e.g. `auth/email-already-in-use`) is likewise mapped to
Portuguese into `errorMessage`.

### Login — new real route

Two parts:

1. **Route wrapper `src/app/login.tsx`** (new): holds router + safe-area insets, renders a new
   pure `AuthLoginScreen`, holds local `submitting`/`errorMessage`, injects an async `onSubmit`
   calling `useAccount().signIn`, and exposes `onBack` → `router.back()`. **It does not navigate on
   success** (addresses Findings 2 and 4): on a successful `signIn`, `account` becomes non-null and
   `RootNavigator` — the single redirect owner — replaces to `/explore`. The wrapper only maps a
   thrown `FirebaseError.code` → Portuguese via `auth-errors.ts` into `errorMessage` and toggles
   `submitting` (set true before the call, cleared in a `finally`).
2. **Pure screen `src/screens/AuthLoginScreen.tsx`** (new): email + password form in the existing
   visual language (offwhite background, navy primary button, hairline inputs, Hanken fonts, same
   button pattern as `SignupScreen`). Props: `topInset`, `onSubmit({ email, password })`, `onBack`,
   `submitting`, `errorMessage`. Email input uses `keyboardType="email-address"` +
   `autoCapitalize="none"` + `autoCorrect={false}`; password uses `secureTextEntry`. **Client
   validation rule (deliberate, addresses Finding 4): submit is enabled only when both fields are
   non-empty (`email.trim().length > 0 && password.length > 0`) and `!submitting`. Login does NOT
   apply the signup email regex or the `password.length >= 6` check — the server validates the
   credentials, and failures (`auth/invalid-credential`, `auth/user-not-found`,
   `auth/wrong-password`, `auth/too-many-requests`, `auth/invalid-email`) are mapped to Portuguese
   by `auth-errors.ts` and shown in `errorMessage`.** The weaker client rule is intentional:
   enforcing signup-style minimums on login would wrongly block a legitimate pre-existing account
   whose password predates any rule. While `submitting`, the button shows an `ActivityIndicator` and
   stays disabled. No Firebase import.

The existing `LoginScreen.tsx` (the role picker) keeps its name and job; its `onLogin?` prop —
currently an unused optional with a commented-out destination in `index.tsx` (confirmed) — is wired
in `index.tsx` to `router.push('/login')` (FR-A3, AC-4). The "Já tenho conta — Entrar" button
finally has a destination. (Naming: the role-picker screen stays `LoginScreen`; the new
email/password screen is `AuthLoginScreen` to disambiguate.)

### Logout — concrete placement (addresses Finding 1)

`ExploreScreen` today renders a lone `<Logo size="sm" style={{ ..., marginLeft: 28, marginBottom: 20 }} />`
directly inside the `ScrollView` (confirmed — there is no header row). **Decision:** wrap that logo
in a header row and add a right-aligned logout icon button driven by a new callback prop:

- `ExploreScreen` gains an optional prop `onLogout?: () => void` and (see Documents) `onOpenDocuments?: () => void`.
- Replace the bare `<Logo>` with:

  ```tsx
  <View className="flex-row items-center justify-between px-7 mb-5">
    <Logo size="sm" style={{ width: 80, height: 24 }} />
    <View className="flex-row items-center gap-4">
      {onOpenDocuments ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Meus documentos"
                   onPress={onOpenDocuments} hitSlop={8} className="active:opacity-60">
          <MaterialIcons name="folder" size={24} color="#11375C" />
        </Pressable>
      ) : null}
      {onLogout ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Sair"
                   onPress={onLogout} hitSlop={8} className="active:opacity-60">
          <MaterialIcons name="logout" size={22} color="#11375C" />
        </Pressable>
      ) : null}
    </View>
  </View>
  ```

  The row uses the same horizontal rhythm as the rest of the screen (the logo's former
  `marginLeft: 28` becomes the row's `px-7`, and `marginBottom: 20` becomes `mb-5`), so there is no
  palette/font change — only two navy MaterialIcons added, within NFR-4 tolerance. The screen stays
  pure: both affordances are callbacks.
- **Vertical-spacing confirmation (addresses review Finding 8).** The row wrapper carries **only**
  `mb-5` (= 20px, matching the logo's former `marginBottom: 20`) for vertical spacing and adds **no**
  `py-*`/`pt-*`/`pb-*` padding; `items-center` only aligns the row's children on the cross axis and
  introduces no extra vertical padding. `px-7` (= 28px, matching the former `marginLeft: 28`) is
  horizontal only. So the header row's vertical footprint equals the former single logo's
  `marginBottom: 20`, keeping NFR-4 intact.
- **No new imports are required in `ExploreScreen`** (addresses Finding 7): `MaterialIcons`,
  `Pressable`, and `View` are already imported there, so the header-row change is a pure JSX edit
  with no import diff.
- Wrapper `src/app/explore.tsx` passes `onLogout={async () => { await signOut() }}` (from
  `useAccount()`). On logout the `onAuthStateChanged` handler clears state and the root gate
  redirects to `/` (AC-6). No new route is needed for logout.

## Documents entry point and routing (addresses Finding 1)

The documents affordance is the **`folder` header icon** on `ExploreScreen` described above
(`onOpenDocuments`), **not** a `FloatingNav` item and **not** `onNavigate`. `FloatingNav` is left
untouched (its `NAV_ITEMS` stays two entries and its `active` union stays `'explore' | 'care'`), so
there is no visual change to the nav bar and no union widening. The earlier design's
`onNavigate('documents')` claim is **dropped**.

- Wrapper `src/app/explore.tsx` passes `onOpenDocuments={() => router.push('/documents')}`.
- This is the single, deterministic entry point that AC-21/22/23 depend on.

## Favorites migration

`favorites.ts`:

```ts
listFavorites(uid): Promise<string[]>              // getDocs(collection(db, 'users', uid, 'favorites')) → doc ids
addFavorite(uid, businessId): Promise<void>        // setDoc(doc(...), { businessId, createdAt: serverTimestamp() })
removeFavorite(uid, businessId): Promise<void>     // deleteDoc(doc(...))
```

The context loads favorites into the `Set` on session start (FR-F4) and keeps `toggleFavorite`
optimistic with per-id rollback (FR-F3, see AccountContext). `DiscoverScreen` and `BusinessScreen`
are untouched for favorites — they already read `isFavorite`/`toggleFavorite` from the context
(AC-11/12/13/14). Consistency between the two screens is automatic because both read the same
context `Set`.

## Reviews migration

`reviews.ts`:

```ts
type ReviewDoc = { id: string; rating: number; comment: string; author: string; authorUid: string; createdAt: Timestamp | null }
listReviews(businessId): Promise<ReviewDoc[]>      // query(..., orderBy('createdAt', 'desc'))
addReview(businessId, input: { rating, comment, author, authorUid }): Promise<ReviewDoc>  // addDoc with serverTimestamp()
```

Screen purity is preserved by moving Firebase into a new hook `src/hooks/useBusinessReviews.ts`
(hooks live outside `src/app/`, per AGENTS.md) consumed by the **wrapper** `src/app/business.tsx`.

**Hook lifecycle (carried from Revision 2; the Revision 2 review's Finding 8 asks only that it
tolerate a null `createdAt`, covered below):** `useBusinessReviews(businessId: string)` runs its load
effect with `businessId` in the dependency array (`useEffect(() => { ...load... }, [businessId])`),
resetting `reviews` to `[]` and `loading` to `true` at the start of each run. This guarantees a
correct list if Expo Router reuses the `business` route component across different items. It returns
`{ reviews, loading, submitting, errorMessage, submitReview }` where
`submitReview(rating, comment): Promise<void>` performs the optimistic prepend, rejects on write
failure (so the wrapper/screen keep inputs per Finding 5), and never sorts on a null `createdAt`
(Finding 8).

**`BusinessScreen` changes.** Its data source changes from the local `INITIAL_REVIEWS` to props
(FR-R1, AC-15). New/changed props:

```ts
reviews: Review[]
reviewsLoading?: boolean
submitting?: boolean
onSubmitReview: (rating: number, comment: string) => Promise<void>
```

**`onSubmitReview` contract (addresses Finding 5): it returns `Promise<void>`; the screen `await`s
it and clears `newRating`/`newComment` ONLY on resolve, keeping both inputs on rejection** so a
failed write never loses the user's typed comment. Concretely the local submit handler becomes:

```ts
async function submitReview() {
  if (newRating === 0 || newComment.trim().length === 0 || submitting) return
  try {
    await onSubmitReview(newRating, newComment.trim())
    setNewRating(0)       // clear only after a successful write
    setNewComment('')
  } catch {
    // keep inputs; the wrapper owns the errorMessage shown under the form
  }
}
```

The wrapper's `onSubmitReview` therefore must **reject** (rethrow) on write failure so the screen
keeps the inputs; the wrapper is responsible for the optimistic prepend/rollback and `errorMessage`.

**`BusinessScreen` retains its `useAccount` import for favorites** (addresses Finding 5): the
reviews refactor removes only the reviews-related local state, not the `const { isFavorite,
toggleFavorite } = useAccount()` line — favorites still come from context, so the import and those
two calls stay exactly as today.

- The local `useState<Review[]>(INITIAL_REVIEWS)` and the `INITIAL_REVIEWS` constant are **removed**;
  `reviews` arrives as a prop. The star-rating + comment inputs (`newRating`, `newComment`) stay
  local; the submit handler `await`s `onSubmitReview(newRating, newComment.trim())` and clears the
  inputs **only on success** (per the `onSubmitReview` contract above — Finding 5).
- **`avgRating` is guarded against the empty list (carried from Revision 2, unchanged by this
  review).** The screen currently
  computes `reviews.reduce((a,r)=>a+r.rating,0) / reviews.length`, which is `NaN` when the list is
  empty — and with canned reviews gone, empty is the real initial state. Change it to:

  ```ts
  const avgRating = reviews.length
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0
  ```

  So the empty state renders `0.0` and `0 avaliações` (matching AC-17), never `"NaN"`.
- The disabled-until-valid submit rule (`newRating > 0 && newComment.trim().length > 0`) is kept;
  while `submitting` the button is also disabled.

**Wrapper `src/app/business.tsx`.** On mount it calls `useBusinessReviews(item.id)` and passes
`reviews`, `reviewsLoading`, `submitting`, and `onSubmitReview` down. The wrapper's `onSubmitReview`
returns `Promise<void>` (matching the screen contract above): it writes to Firestore with
`author = useAccount().account?.name ?? 'Você'` and `authorUid = uid` and **optimistically prepends**
the returned review so it appears at the top immediately (FR-R2/R4, AC-16); the list stays ordered
`createdAt desc`. **On write failure it removes the optimistic item, sets `errorMessage`, and
rethrows** so the screen keeps the user's inputs (Finding 5). The `Review` type the screen uses stays
`{ id, author, rating, comment }`; the wrapper/hook maps `ReviewDoc` → `Review`.

**Null `createdAt` tolerance (addresses Finding 8).** `serverTimestamp()` resolves to `null` on the
local echo of a just-written doc before the server round-trips, so `ReviewDoc.createdAt` is typed
`Timestamp | null`. Ordering and `avgRating` must never call `.toMillis()` (or any method) on a
possibly-null `createdAt`: the optimistic review is **manually prepended** to the array, so it is
visually on top without needing a timestamp sort, and `avgRating` only reads `rating` (never
`createdAt`). Any server-side `orderBy('createdAt','desc')` happens in the Firestore query, not in
client code, so the local list never sorts on the null field.

## Tasks migration

`tasks.ts`:

```ts
type TaskDoc = { id: string; dayKey: string; title: string; time: string; day: string; icon: string; done: boolean; order: number }
listTasks(uid): Promise<TaskDoc[]>                 // getDocs, ordered by `order`
seedTasks(uid, seed: TaskSeed[]): Promise<TaskDoc[]> // writeBatch setDoc with seed ids t1,t2 — only when none exist
completeTask(uid, taskId): Promise<void>           // updateDoc({ done: true })
```

`CareScreen` keeps the "Hoje"/"Semana" views, the irreversible completion UX (`disabled` after
done), the green check, strike-through title, and the card-stays-visible behavior (FR-T2/T3,
AC-18/19). To keep the screen pure, the current `TASKS` constant and the local `done` `Set` move
behind a new hook `src/hooks/useCareTasks.ts` consumed by the wrapper `src/app/care.tsx`. The
`WEEK_DAYS`/`TODAY_KEY` layout constants and the `Task` type **stay in the screen** (they are pure
layout data).

**`TaskDoc.icon` type reconciliation (carried from Revision 2, unchanged by this review).**
`CareScreen`'s `Task.icon` is
`keyof typeof MaterialIcons.glyphMap`, but Firestore returns `string`, so `TaskDoc.icon` is `string`.
The `TaskDoc` → `Task` mapper (in the hook) casts the stored glyph name:

```ts
icon: doc.icon as keyof typeof MaterialIcons.glyphMap
```

This cast is **sound** because `seedTasks` persists the exact glyph strings taken from the current
`TASKS` seed (`'favorite-border'` for `t1`, `'medication'` for `t2`), which are real
`MaterialIcons` glyph names. The seed source therefore guarantees stored values are valid keys, and
`tsc --noEmit` passes (NFR-3/AC-30). No un-cast assignment of `string` to the glyph-key type occurs.

**`CareScreen` props grow:**

```ts
tasks: Task[]              // loaded from Firestore (mapped from TaskDoc)
doneIds: Set<string>       // derived from tasks where done === true
tasksLoading?: boolean
onComplete: (taskId: string) => void
```

- The internal `const [done, setDone] = useState<Set<string>>(new Set())`, the `markDone` mutator,
  and the module-level `TASKS` constant are **removed from the screen**; `tasks`/`doneIds` arrive as
  props and `onComplete(id)` replaces `markDone`. The `WeekView`/`TodayView` helpers take `tasks`
  from props instead of filtering the module `TASKS` (the wrapper/hook supplies the full list; the
  views filter by `dayKey` as today).
- **`WeekView` signature change (addresses review Finding 4).** `WeekView` currently closes over the
  module-level `TASKS` (`const dayTasks = TASKS.filter((t) => t.dayKey === day.key)`) and is called
  as `<WeekView done={done} onDone={markDone} />` with **no** `tasks` prop. Removing `TASKS` without
  changing `WeekView` would break compilation (AC-30). `WeekView` therefore takes a new signature and
  filters the prop list:

  ```ts
  function WeekView({ tasks, done, onDone }: { tasks: Task[]; done: Set<string>; onDone: (id: string) => void }) {
    // was: const dayTasks = TASKS.filter((t) => t.dayKey === day.key)
    //  →   const dayTasks = tasks.filter((t) => t.dayKey === day.key)
  }
  ```

  and the call site becomes `<WeekView tasks={tasks} done={doneIds} onDone={onComplete} />`.
  `WeekView` is passed the **full** task list (all days) and filters per day internally, exactly as
  it did over the module `TASKS`; `TodayView` continues to receive only today's tasks. So the
  `CareScreen` body (the wrapper around both views) passes the full `tasks` prop down to `WeekView`
  while narrowing to today's for `TodayView`, matching current behavior.
- `onComplete` persists via `completeTask` and optimistically adds the id to the done set; on
  failure it reverts and surfaces an error. Completion is irreversible in the UI, so no un-complete
  path exists.

**Hook `useCareTasks.ts`.** On mount: `listTasks(uid)`; if it returns empty, call
`seedTasks(uid, SEED)` where `SEED` is the current `TASKS` array (moved into the hook, carrying the
exact glyph strings and an `order`), then use the seeded result. It exposes
`{ tasks, doneIds, tasksLoading, complete }`. `seedTasks` uses a `writeBatch` with fixed seed doc
ids so a double first-launch converges to the same docs rather than duplicating; the hook also
guards seeding behind a "seed attempted this session" ref.

## Documents (Firebase Storage)

New feature, built strictly in the two-layer pattern (FR-S4, AC-25):

- **Service `files.ts`:**
  ```ts
  type StoredDocument = { name: string; fullPath: string; url: string; size?: number; contentType?: string; updated?: string }
  uploadDocument(uid, file: { uri: string; name: string; mimeType?: string }): Promise<StoredDocument>
  listDocuments(uid): Promise<StoredDocument[]>
  deleteDocument(fullPath: string): Promise<void>
  ```
  Upload: fetch the local `uri` into a `Blob` (`const blob = await (await fetch(uri)).blob()`),
  then `uploadBytes(ref(storage, 'users/'+uid+'/documents/'+safeName), blob, { contentType })`,
  then `getDownloadURL`. `listDocuments` uses `listAll(ref(storage, 'users/'+uid+'/documents'))`
  and resolves `getMetadata` + `getDownloadURL` per item. `deleteDocument` uses `deleteObject`.
  File names are made unique with a timestamp prefix (`${Date.now()}_${originalName}`); the `name`
  shown to the user strips the prefix.
- **Hook `src/hooks/useUserDocuments.ts`:** owns `documents`, `loading`, `uploading`, `error`, and
  exposes `pickAndUploadFile()`, `pickAndUploadImage()`, and `remove(fullPath)`. File picking uses
  `expo-document-picker` (`getDocumentAsync`); photos use `expo-image-picker`
  (`launchImageLibraryAsync`). The hook is the only place that imports the pickers and `files.ts`.
- **Pure screen `src/screens/DocumentsScreen.tsx`:** new screen in the existing visual language —
  a list of documents (name + optional size/type), two upload actions ("Escolher arquivo" /
  "Escolher foto"), per-item delete, and loading/empty/error states. Props: `documents`, `loading`,
  `uploading`, `errorMessage`, `onPickFile`, `onPickImage`, `onDelete(fullPath)`, `onBack`,
  `topInset`, `bottomInset`. No Firebase/picker import.
- **Route wrapper `src/app/documents.tsx`:** holds insets + router, wires the hook to the screen,
  exposes `onBack → router.back()`. Registered as `documents` in `_layout.tsx` (see full Stack
  above). Reached from the `ExploreScreen` `folder` header icon via `onOpenDocuments`.

Validation/limits for the picker input (NFR-6):

- The picked asset may be cancelled → the picker result's `canceled`/`assets` is checked; a cancel
  is a no-op (no error shown).
- Missing `name` → fall back to the last path segment of the `uri` or a generated name.
- No hard size limit in this wave (none required); upload failures surface as an error message
  rather than a crash (AC-24).

## Error handling

Every network operation reports loading and error state to the UI without blocking it (NFR-6).
Error mapping lives in the wrappers/hooks (the layer that touches Firebase), never in pure screens.

| Operation | Failure conditions | Recoverable? | Caller receives | Logging |
| --- | --- | --- | --- | --- |
| `signUp` partner guard | normalized role is `partner` | Recoverable (not an error path for the app) | thrown sentinel `Error` with `code: 'app/partner-not-available'`; wrapper maps to "em breve" PT message; **no Firebase call, no session, no profile** | none (expected) |
| `signUp` (`createUserWithEmailAndPassword`) | `auth/email-already-in-use`, `auth/weak-password`, `auth/invalid-email`, network | Recoverable (user retries) | thrown `FirebaseError`; wrapper maps `code`→PT message into `errorMessage` prop | `console.warn` on unexpected codes only |
| profile write after signup | Firestore unavailable, permission denied | Recoverable | `auth.signUp` first `await`s cleanup of the just-created auth user (`deleteUser(cred.user)`, else `firebaseSignOut(auth)`), **then** rejects, so no orphaned auth session/half-account persists; wrapper shows the generic PT message "Não foi possível concluir o cadastro. Tente novamente." No `profileError` race (the auth user is gone before the message shows). | `console.warn` |
| `signIn` | `auth/invalid-credential`, `auth/user-not-found`, `auth/wrong-password`, `auth/too-many-requests`, network | Recoverable | thrown → PT message in `errorMessage` | `console.warn` on unexpected |
| `signOut` | network (rare) | Recoverable | thrown → non-blocking log; local state still clears via subscription | `console.warn` |
| profile load (`onAuthStateChanged`) | profile missing, Firestore error | Recoverable | `account=null` + one-time error flag; app shows login | `console.warn` |
| `listFavorites` on session start | Firestore error | Recoverable | favorites load as empty; a background retry is acceptable | `console.warn` |
| `toggleFavorite` write | permission denied, network | Recoverable | optimistic single-id flip reverts; no modal | `console.warn` |
| `listReviews` | Firestore error | Recoverable | `reviewsLoading` ends, list empty, inline error text | `console.warn` |
| `addReview` | network, permission | Recoverable | optimistic prepend reverts; `errorMessage` under the form | `console.warn` |
| `listTasks`/`seedTasks` | Firestore error | Recoverable | `tasksLoading` ends; if seed failed, screen shows empty + retry on next launch | `console.warn` |
| `completeTask` | network, permission | Recoverable | optimistic done reverts; inline error | `console.warn` |
| document pick | user cancel | n/a | no-op | none |
| `uploadDocument` | fetch/blob failure, Storage permission, network | Recoverable | `uploading` ends; `errorMessage` shown; list unchanged | `console.warn` |
| `listDocuments` | Storage error | Recoverable | `loading` ends, empty list + error text | `console.warn` |
| `deleteDocument` | not found, permission, network | Recoverable | error shown; list refreshes to actual state | `console.warn` |
| `config.ts` `initializeAuth` | `auth/already-initialized` (Fast Refresh) | Recoverable | falls back to `getAuth(app)` | none (expected) |

`auth-errors.ts` returns Portuguese strings for the common `auth/*` codes, for the app sentinel
`app/partner-not-available` ("O Portal do Parceiro ainda não está disponível. Em breve!"), and a
generic fallback ("Algo deu errado. Tente novamente."). It accepts an `unknown` error, reads a
`code` field when present (both `FirebaseError` and the plain sentinel `Error` carry one), and never
shows a raw Firebase code to users.

### Input validation summary (external inputs)

| Input | Required | Type/Rule | On failure |
| --- | --- | --- | --- |
| signup `name` | yes | string, trimmed length > 1 | button disabled |
| signup `email` | yes | string, `/\S+@\S+\.\S+/` | button disabled; server `auth/invalid-email` as backstop |
| signup `password` | yes | string, length ≥ 6 | button disabled; server `auth/weak-password` as backstop |
| login `email`/`password` | yes | both non-empty (deliberately **no** regex/length check — server validates) | button disabled; server maps `auth/invalid-credential` etc. to PT |
| signup `role` = partner | n/a | rejected before any Firebase call | `signUp` throws `app/partner-not-available`; "em breve" message; no session/profile |
| review `rating` | yes | number 1..5 (>0) | submit disabled |
| review `comment` | yes | non-empty trimmed | submit disabled |
| `role` param | yes | normalized to `elder|family|partner`, default `family` | normalized silently |
| picked document | yes | has `uri`; `name` defaulted if absent | cancel is no-op; missing uri aborts upload with error |

### Invariant ownership

- **"Pure screens never import Firebase"** — owned by the service/hook/wrapper layer; screens only
  receive props. Enforced by code review and the module boundary (AC-25). Rationale: keeps screens
  testable and swappable, matching the existing architecture.
- **"Firebase initialized exactly once with RN persistence, no analytics"** — owned by `config.ts`
  (singletons + init guards). Rationale: single source of truth for app/auth/db/storage.
- **"`role` ∈ AccountRole"** — owned by `users.ts` (`normalizeRole`) on both write (`createProfile`
  normalizes before persisting) and read (`getProfile` maps the stored value through `normalizeRole`);
  the context consumes the already-normalized value.
- **"Context reaches `firebase/auth` only through `auth.ts`"** — owned by `AccountContext`, which
  calls `auth.signUp`/`signIn`/`logout`/`observeAuth` and never imports `firebase/auth` directly.
  Rationale: keeps FR-X1's `auth.ts` module as the single auth seam and preserves the layer boundary.
- **"Favorites/tasks/documents are per-user; reviews are global per business"** — owned by the
  service modules via the collection paths (uid-scoped vs business-scoped).
- **"Stored task `icon` is a valid `MaterialIcons` glyph key"** — owned by `seedTasks` (writes only
  known glyph strings), relied on by the `TaskDoc`→`Task` cast.

## Firestore & Storage security rules (notes, not code deliverables)

Per A-8/NFR, hardened rules are console configuration, out of scope as code. The data model is
shaped so the eventual rules are straightforward:

- `users/{uid}/**` → read/write only when `request.auth != null && request.auth.uid == uid`
  (owner-only for profile, favorites, tasks).
- `businesses/{businessId}/reviews/{reviewId}` → public read; create allowed for any authenticated
  user with `request.auth.uid == request.resource.data.authorUid`; no update/delete in this wave.
- Storage `users/{uid}/documents/**` → read/write only for the owner uid.

These are documented here for whoever applies them in the console; no rules file ships in Wave 1.

## Testability

- **Unit-testable (pure, no Firebase):** all `src/screens/*.tsx` (props-only), the error-code→PT
  message mapper, the role normalizer, the `ReviewDoc`→`Review` and `TaskDoc`→`Task` mappers, and
  the filename-unique/strip helpers in `files.ts`. These are the natural seams.
- **Integration-level (needs Firebase or emulator):** `auth.ts`, `users.ts`, `favorites.ts`,
  `reviews.ts`, `tasks.ts`, `files.ts`, and the `AccountContext` subscription/optimistic logic.
- Per NFR-3 **no test framework is added in this wave** and none is run; the design simply keeps
  the pure/impure seam clean so tests can be added later without restructuring. Verification for
  this wave is `npx expo lint` and `npx tsc --noEmit` passing (AC-30), plus manual Expo Go checks
  against the acceptance criteria. Do not run `npx expo start` or long-running servers.

## Files to create / modify

**Create**
- `src/services/firebase/config.ts`, `auth.ts`, `auth-errors.ts`, `users.ts`, `favorites.ts`,
  `reviews.ts`, `tasks.ts`, `files.ts`, `types.ts`
- `src/screens/AuthLoginScreen.tsx`, `src/screens/DocumentsScreen.tsx`
- `src/app/login.tsx`, `src/app/documents.tsx`
- `src/hooks/useBusinessReviews.ts`, `src/hooks/useCareTasks.ts`, `src/hooks/useUserDocuments.ts`
- `.env.example`

**Modify**
- `src/state/account-context.tsx` (full rewrite over Firebase Auth; per-id optimistic favorites)
- `src/app/_layout.tsx` (splash gate on `fontsReady && !loading` via `RootNavigator({ fontsReady })`;
  sole owner of auth-state redirects; full Stack incl. `login`/`documents`)
- `src/app/index.tsx` (wire `onLogin` → `router.push('/login')`)
- `src/app/signup.tsx` (async `signUp`, submitting/error state; **no wrapper redirect and no partner
  TODO** — partner is rejected inside `signUp`; all nav owned by `RootNavigator`)
- `src/app/business.tsx` (consume `useBusinessReviews(item.id)`; `onSubmitReview` returns a promise
  and rethrows on failure; optimistic prepend with null-`createdAt` tolerance)
- `src/app/care.tsx` (consume `useCareTasks`, pass `tasks`/`doneIds`/`onComplete`)
- `src/app/explore.tsx` (pass `onLogout` and `onOpenDocuments`)
- `src/screens/SignupScreen.tsx` (add email/password inputs + refs, new `onContinue` object,
  remove stray `3`, submitting/error props; leave tone branch untouched)
- `src/screens/BusinessScreen.tsx` (reviews via props, remove `INITIAL_REVIEWS`, guard `avgRating`)
- `src/screens/CareScreen.tsx` (tasks/doneIds via props, remove local `TASKS`/`done`/`markDone`,
  seed moved to hook)
- `src/screens/ExploreScreen.tsx` (header row with logo + `folder`/`logout` icon affordances)
- `app.json` (append `expo-image-picker` plugin)
- `package.json` (new deps via `npx expo install`)

**Unchanged**
- `src/data/discover-data.ts` (catalog stays local seed)
- `src/constants/constants.ts` — **left untouched.** The `tone: 'terracota'` spelling is **not a
  bug** (Finding 6): the union is declared `'navy' | 'terracota'` and the value `'terracota'` matches
  it, so it compiles and the `ROLE_CONTEXT.tone` literal type is correct. Do **not** normalize the
  spelling to `'terracotta'` — that would break the literal type. The signup extension must not touch
  the `isNavy`/tone branch or `ROLE_CONTEXT` at all.
- `src/components/FloatingNav.tsx` (two items, `active: 'explore' | 'care'` — not widened)
- `src/components/Logo.tsx`, palette/fonts
- `src/components/types.ts` (`AccountRole` reused as the role source of truth)

---

## Responses to design review

This section responds to the **Revision 2 review** (`.agents/tasks/design-review.md`, verdict
**CHANGES_REQUESTED** — 2 HIGH, 3 MEDIUM, 4 NIT). Every finding is **addressed** below; none is
backlogged or ignored. All resolutions align with the requirements: no scope expansion, no
palette/font change beyond the two navy icons already specified in Revision 2, Expo Go preserved,
and no test framework added. (The earlier Revision 1 review and its 11-item response have been
fully folded into the design body; those fixes remain in place and are re-flagged inline as
"carried from Revision 2" where this review touched the same area.)

- **Finding 1 (HIGH) — the "full, final" `_layout.tsx` snippet dropped the splash-hide/fonts
  logic it claimed to contain.** Addressed. The snippet is now the single authoritative
  representation and literally contains the promised logic: `RootNavigator({ fontsReady })` takes
  the prop, a `useEffect` calls `SplashScreen.hideAsync()` exactly when `fontsReady && !loading`,
  and `RootLayout` passes `fontsReady={!!(fontsLoaded || fontError)}`. There is no "render `null`
  until fonts" branch and no field referenced in prose but missing from code, so following the
  snippet literally preserves (and extends) the current splash behavior rather than regressing AC-1.
  See *Root layout splash/loading gate*.

- **Finding 2 (HIGH) — signup wrapper redirect conflicted with the root navigator; partner got a
  session and was pushed to `/explore`.** Addressed with a single-owner decision. `RootNavigator`
  is now the **sole** owner of auth-state navigation: both the signup and login wrappers set only
  local `submitting`/`errorMessage` and never call `router.replace('/explore')`, removing the
  two-writer race. The partner regression is fixed at the source: `signUp` **rejects a `partner`
  role before any Firebase call** (sentinel `app/partner-not-available`), so no auth user and no
  `users/{uid}` profile are ever created for a partner, `account` never becomes non-null for them,
  and `RootNavigator` never routes them to `/explore`. The partner stays on signup with an "em
  breve" message — honoring A-2 and Out-of-Scope. The earlier "no profile is created on the TODO
  path" claim (which the review correctly called factually wrong) is removed. See *AccountContext
  refactor → `signUp`*, *Signup wrapper*, and *Root layout → Redirect rules*.

- **Finding 3 (MEDIUM) — favorites/profile load failure could hang the loading gate.** Addressed.
  The `onAuthStateChanged` handler is now spelled out: profile load wrapped in its own try/catch
  (failure → `account = null` + one-time `profileError`), favorites load wrapped in its own
  try/catch (failure → empty `Set`), and **`setLoading(false)` runs exactly once in a `finally` on
  every path**. Neither a rejected `getProfile` nor a rejected `listFavorites` can leave `loading`
  stuck at `true`, so the splash gate (AC-9) can never hang. See *AccountContext refactor* (handler
  code block).

- **Finding 4 (MEDIUM) — `AuthLoginScreen` validation rule left implicit; login wrapper redirect
  compounded Finding 2.** Addressed. The login client rule is now explicit and deliberate: submit
  is enabled only when **both fields are non-empty** and `!submitting`, with **no** email regex and
  **no** `password.length >= 6` check — the server validates credentials and `auth/*` codes map to
  Portuguese via `auth-errors.ts`. The rationale (avoid wrongly blocking a legitimate pre-existing
  account) is stated. The login wrapper also follows the Finding 2 single-owner decision: it does
  **not** redirect on success; `RootNavigator` does. See *Login — new real route*.

- **Finding 5 (MEDIUM) — `onSubmitReview` return type and input-clearing contract unspecified; the
  `BusinessScreen` `useAccount` import omitted.** Addressed. `onSubmitReview` now returns
  `Promise<void>`; the screen `await`s it and clears `newRating`/`newComment` **only on resolve**,
  keeping both inputs on rejection so a failed write never loses the typed comment. The wrapper's
  `onSubmitReview` rejects (rethrows) on write failure after rolling back the optimistic prepend and
  setting `errorMessage`. The design now also states explicitly that `BusinessScreen` **keeps** its
  `const { isFavorite, toggleFavorite } = useAccount()` import for favorites. See *Reviews migration*.

- **Finding 6 (NIT) — `tone: 'terracota'` is a consistent literal, not a bug.** Addressed. The
  design no longer calls it a "typo"; it states the union `'navy' | 'terracota'` and the value
  match and compile, and instructs the implementer to leave `constants.ts` untouched and **not**
  normalize the spelling (which would break the `ROLE_CONTEXT.tone` literal type). See *Files →
  Unchanged* and *Signup — extend SignupScreen*.

- **Finding 7 (NIT) — `ExploreScreen` header-row imports/spacing already satisfied.** Addressed.
  The design now states that `MaterialIcons`, `Pressable`, and `View` are already imported in
  `ExploreScreen`, so **no import diff is required**, and confirms `px-7`/`mb-5` match the current
  logo's `marginLeft: 28`/`marginBottom: 20`. See *Logout — concrete placement*.

- **Finding 8 (NIT) — optimistic review ordering must tolerate a null `serverTimestamp`.**
  Addressed. `ReviewDoc.createdAt` is typed `Timestamp | null`; the design states that ordering and
  `avgRating` never call `.toMillis()` (or any method) on a possibly-null `createdAt` — the
  optimistic review is manually prepended (visually on top without a client sort) and `avgRating`
  reads only `rating`. Server-side ordering stays in the Firestore query. See *Reviews migration →
  Null `createdAt` tolerance*.

- **Finding 9 (NIT) — `storageBucket` failure mode should be called out.** Addressed. The design
  now states that a wrong bucket lets `initializeApp`/`getStorage` succeed silently and only fails
  at the first `uploadBytes`/`listAll`, and requires the implementer to **smoke-test one real
  upload+list in Expo Go** before declaring the documents feature done. See *`config.ts` —
  `storageBucket`*.

### Revision 4 — responses to the Revision 3 review

This section responds to the **Revision 3 review** (`.agents/tasks/design-review.md` /
`design-review.json`, verdict **CHANGES_REQUESTED** — 1 HIGH, 3 MEDIUM, 4 NIT). Every finding is
addressed; no scope expansion, no palette/font change, Expo Go preserved, no test framework added.

- **Finding 1 (HIGH) — `users.ts`/`auth.ts` surfaces referenced but never specified.** Addressed.
  Added an explicit signature block for both modules (`normalizeRole`/`createProfile`/`getProfile`
  for `users.ts`; `signUp`/`signIn`/`logout`/`observeAuth` for `auth.ts`), declared the
  `UserProfile` DTO in `types.ts` with the prescribed shape, and stated explicitly that
  `AccountContext` consumes `auth.ts` (never `firebase/auth` directly) so FR-X1's `auth.ts` module
  has a real caller and the layer boundary holds. See *`users.ts` and `auth.ts` — module surfaces*
  and *Invariant ownership*.
- **Finding 2 (MEDIUM) — `customConditions` claim stated as fact.** Addressed. Downgraded the "it
  is real" assertion to an unverified expectation, made the ordered steps verify the import via
  `npx tsc --noEmit` (not just a `.d.ts` grep), and made the AsyncStorage `Persistence` adapter the
  catch-all fallback for *any* resolution failure, not only the symbol-moved case. See *Decision
  pending install-time verification*.
- **Finding 3 (MEDIUM) — profile-write-failure recovery underspecified.** Addressed. `auth.signUp`
  now `await`s cleanup of the just-created auth user (`deleteUser(cred.user)`, else
  `firebaseSignOut(auth)`) **before** rejecting, so no orphaned session/half-account persists and
  retries don't hit `auth/email-already-in-use`; the single generic PT message is "Não foi possível
  concluir o cadastro. Tente novamente." See *AccountContext refactor → `signUp` profile-write-failure
  recovery* and the *Error handling* table.
- **Finding 4 (MEDIUM) — `WeekView` reads module-level `TASKS`.** Addressed. Spelled out
  `WeekView`'s new signature `({ tasks: Task[]; done: Set<string>; onDone: (id: string) => void })`,
  changed its internal `TASKS.filter` to `tasks.filter`, and updated the call site to
  `<WeekView tasks={tasks} done={doneIds} onDone={onComplete} />`, with the full list going to
  `WeekView` and today-only to `TodayView`. See *Tasks migration*.
- **Finding 5 (NIT) — `segments[0] ?? 'index'` fallback.** Addressed — documented that
  `useSegments()` returns `[]` on `/` and the `?? 'index'` fallback is deliberate. See *Redirect rules*.
- **Finding 6 (NIT) — `.env.example` empty-value trap.** Addressed — stated that `??` only triggers
  on `undefined`, so `.env.example` is docs-only and must not be copied to a live `.env` with empty
  values. See *Dependencies and configuration changes*.
- **Finding 7 (NIT) — four placeholder credential strings.** Addressed — marked `apiKey`/
  `storageBucket`/`messagingSenderId`/`appId` as MUST-fill-before-first-run in the ordered steps,
  noting a green `tsc`/lint does not mean runnable. See *`config.ts`*.
- **Finding 8 (NIT) — header-row vertical padding.** Addressed — confirmed the row wrapper carries
  only `mb-5` (= former `marginBottom: 20`) with no extra `py-*` padding, keeping NFR-4. See
  *Logout — concrete placement*.
