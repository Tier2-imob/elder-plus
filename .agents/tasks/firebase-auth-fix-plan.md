# Implementation Plan — Fix Firebase Auth initialization crash (Elder+)

## Problem recap

At app startup `initializeAuth(app, { persistence: asyncStoragePersistence })` in
`src/services/firebase/config.ts:55` throws:

```
@firebase/auth: Auth (13.0.0): INTERNAL ASSERTION FAILED: Expected a class definition
```

The `persistence` passed is a hand-written **object literal** cast `as unknown as Persistence`.
Firebase Auth's internals instantiate the persistence provider with `new` (they expect a
**class/constructor**, not an instance/object literal). The literal has no `[Symbol]`/prototype a
constructor would, so the `new` call fails the "Expected a class definition" assertion. The
surrounding blanket `try/catch` then swallows the throw and falls back to `getAuth(app)`, which
builds Auth with in-memory persistence and no React Native wiring. In that degraded state the
Google credential sign-in fails and the user sees "Não foi possível entrar com o Google."

## Root-cause of the ORIGINAL TS2305 (why the hack existed) — and the real fix

The hack was introduced because `import { getReactNativePersistence } from 'firebase/auth'` failed
`tsc` with TS2305 ("has no exported member 'getReactNativePersistence'"). Investigation of the
installed packages (firebase 13.0.0 → `@firebase/auth` 1.13.7) confirmed WHY, and it is a packaging
quirk, not a missing feature:

- The umbrella `node_modules/firebase/auth` is just `export * from '@firebase/auth'` and ships NO
  react-native build or react-native types subpath. Its runtime bundles
  (`firebase/auth/dist/esm/index.esm.js`, `.../index.cjs.js`) do **not** contain
  `getReactNativePersistence` at all. (Verified by grep — zero matches.)
- The inner `@firebase/auth` package DOES provide it, but only under its `react-native` conditional
  export: `"react-native": { "types": "./dist/rn/index.rn.d.ts", "default": "./dist/rn/index.js" }`.
  The runtime file `dist/rn/index.js` defines `function getReactNativePersistence(storage)` and its
  types file `dist/rn/index.rn.d.ts` declares
  `export declare function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence`.
- `@firebase/auth`'s `exports["."]` lists the top-level `"types": "./dist/auth-public.d.ts"` key
  BEFORE the nested `react-native` condition. `tsc --traceResolution` shows TypeScript matches that
  first `types` key and resolves to `auth-public.d.ts`, which does NOT export
  `getReactNativePersistence`. That key-ordering shadowing is the entire cause of TS2305 — the
  react-native types are never selected, even though the base tsconfig sets
  `customConditions: ["react-native"]`.

### The chosen fix (verified end-to-end)

1. **Runtime import from the inner package.** Import `getReactNativePersistence` from
   `@firebase/auth` (not the umbrella `firebase/auth`). Metro resolves `@firebase/auth` using the
   package's `"react-native": "dist/rn/index.js"` field, which contains the real function — so it
   works at runtime. (Importing it from `firebase/auth` would type-check with the override below but
   be `undefined` at runtime, because the umbrella runtime bundle lacks it — do NOT do that.)

2. **Type resolution via a surgical `paths` override.** Add to `tsconfig.json`
   `compilerOptions.paths`:
   `"@firebase/auth": ["./node_modules/@firebase/auth/dist/rn/index.rn.d.ts"]`.
   This points TypeScript at the react-native type declarations (which `export * from
   './index.shared'` — the full Auth surface — PLUS `getReactNativePersistence`, `getAuth`,
   `initializeAuth`). This is a typed path: no `any`, no `@ts-ignore`. It fixes the key-ordering
   shadow at the one spot that matters and makes `getReactNativePersistence(AsyncStorage)` fully
   type-check against `ReactNativeAsyncStorage`.

**Why this no longer throws "Expected a class definition":** `getReactNativePersistence` is the
SDK's own factory. It returns a real **persistence class/constructor** (not an object literal) that
Auth's internals can `new`. Passing that to `initializeAuth` satisfies the constructor contract, so
the assertion never fires and Auth initializes with genuine AsyncStorage-backed LOCAL persistence.

**async-storage v2 shape:** this project has `@react-native-async-storage/async-storage` 2.2.0, so
pass the default export directly: `getReactNativePersistence(AsyncStorage)`. (The v3 `createAsyncStorage`
shape from the terminal warning does NOT apply here.) Verified: the default AsyncStorage export
satisfies the `ReactNativeAsyncStorage` parameter type with zero errors.

### Approaches rejected (and why)

- **Module augmentation** (`declare module '@firebase/auth' { export function
  getReactNativePersistence ... }`): tried in several forms (module-context and ambient). Every form
  REPLACED rather than merged the module's declarations — because the umbrella `firebase/auth` uses
  `export *` and the inner types come through a conditional-exports `types` key, TS treated the
  hand-written block as the canonical module and wiped every other export (GoogleAuthProvider, User,
  initializeAuth, …), producing a cascade of TS2305. Confirmed a dead end by isolating the `.d.ts`.
- **Overriding `paths` for the umbrella `firebase/auth`** instead of the inner package: type-checks,
  but encourages importing `getReactNativePersistence` from `firebase/auth`, which is `undefined` at
  runtime. Rejected to keep types and runtime consistent.
- **Keeping the object-literal adapter**: it is the bug. Removed.

## Verification baseline (already confirmed during exploration)

The full fix was prototyped and verified before writing this plan: `npx tsc --noEmit` exits 0 and
`npx expo lint` exits 0 (only a pre-existing unrelated `react-hooks/exhaustive-deps` warning in
`src/screens/DiscoverScreen.tsx`). The prototype was then reverted; the workspace is at baseline.

---

# Implementation Plan

- [x] 1. Add the `@firebase/auth` react-native types override to `tsconfig.json`.
      Add one entry to `compilerOptions.paths`:
      `"@firebase/auth": ["./node_modules/@firebase/auth/dist/rn/index.rn.d.ts"]`.
      Leave the existing `@/*` and `@/assets/*` entries and all other options untouched. Preserve the
      file's existing formatting (no trailing-newline/whitespace churn).
      Files: `tsconfig.json`
      Verify: `npx tsc --noEmit` still exits 0 (no new errors introduced by the path entry alone).

- [x] 2. Replace the hand-written persistence adapter in `config.ts` with the SDK's
      `getReactNativePersistence(AsyncStorage)`, and tighten the init guard.
      In `src/services/firebase/config.ts`:
      - Add `import { getReactNativePersistence } from '@firebase/auth'` (inner package — NOT the
        umbrella `firebase/auth`; add a short comment explaining Metro resolves its RN build at
        runtime and the tsconfig `paths` entry supplies the RN types, so no TS2305).
      - Delete the entire `asyncStoragePersistence` object-literal block and its
        `as unknown as Persistence` cast, and remove the now-unused `Persistence` type import from the
        `firebase/auth` import line (keep `getAuth`, `initializeAuth`, and `type Auth`).
      - Build persistence via `const persistence = getReactNativePersistence(AsyncStorage)` and call
        `initializeAuth(app, { persistence })`.
      - Keep a single-initialization guard, but do NOT let it mask a real failure. Preferred form:
        guard on `getApps()`/an already-initialized check so `initializeAuth` only runs once; if a
        `try/catch` is retained for the Fast-Refresh `auth/already-initialized` case, it must
        re-throw anything whose code is not `auth/already-initialized` (inspect the caught error's
        `code`) and only then fall back to `getAuth(app)`. A blanket `catch {}` that swallows all
        errors is NOT acceptable — that is what hid this bug.
      - Replace the stale comment that claims `getReactNativePersistence` "does NOT resolve under this
        project's tsconfig" with a note describing the real fix (RN factory + `paths` override).
      - Keep `firebaseConfig` (env-first, elder-29dc3 defaults), `app`, `db`, and `storage`
        (`getStorage`) exactly as they are. Do not touch `Storage`/`files.ts`.
      Files: `src/services/firebase/config.ts`
      Verify: `npx tsc --noEmit` exits 0 AND `npx expo lint` exits 0 (only the pre-existing
      DiscoverScreen `exhaustive-deps` warning may remain). Both are the project's real typecheck and
      lint commands.

- [x] 3. Update the steering note so it no longer prescribes the removed hack.
      In `.clinerules/auth-and-session.md`, rule 6 ("Persistência de sessão") currently says to keep
      the hand-written AsyncStorage adapter and warns the `getReactNativePersistence` import does not
      resolve. Rewrite it to state the current design: session persistence uses the SDK's
      `getReactNativePersistence(AsyncStorage)` imported from `@firebase/auth`, typed via the
      `@firebase/auth` → `dist/rn/index.rn.d.ts` entry in `tsconfig.json` `paths`; keep a guard that
      only swallows `auth/already-initialized` and never a real init failure. Keep the rest of the
      file unchanged.
      Files: `.clinerules/auth-and-session.md`
      Verify: not code — re-read the edited rule and confirm it matches the implemented config.ts and
      tsconfig.json (no remaining instruction to use an object-literal adapter or claim TS2305 is
      unavoidable).

- [x] 4. Final full verification.
      Run both project gates from the repo root and confirm clean results.
      Files: none (verification only)
      Verify: `npx tsc --noEmit` exits 0 with no errors; `npx expo lint` exits 0 (only the
      pre-existing `react-hooks/exhaustive-deps` warning in `src/screens/DiscoverScreen.tsx` is
      acceptable — no errors, no new warnings). On-device runtime confirmation (Auth initializes with
      AsyncStorage persistence, no "Expected a class definition", email/password and Google sign-in
      work) requires an EAS development build on a real device and is the user's manual check; it
      cannot be run in this environment.

## Verification note (implementation run)

Implemented all four steps. Commands run from the repo root
`c:\Users\savio\OneDrive\Tier2\Elder - Final`:

- `npx tsc --noEmit` → exit 0, no errors (no TS2305; the `@firebase/auth` → RN `.d.ts` `paths`
  entry resolves `getReactNativePersistence` with its real `(storage: ReactNativeAsyncStorage) =>
  Persistence` signature, and the default AsyncStorage v2 export satisfies the parameter type).
- `npx expo lint` → exit 0, 0 errors, 1 warning — only the pre-existing
  `react-hooks/exhaustive-deps` warning in `src/screens/DiscoverScreen.tsx` (unrelated).

Package exports verified against the installed copy before coding:
`node_modules/@firebase/auth/package.json` `exports["."]` lists the top-level
`"types": "./dist/auth-public.d.ts"` key BEFORE the `react-native` condition, which is why tsc's
`bundler` resolution (with `customConditions: ["react-native"]`) still shadowed the RN types — the
`paths` override at `./node_modules/@firebase/auth/dist/rn/index.rn.d.ts` points tsc straight at the
RN declarations. `dist/rn/index.rn.d.ts` exports `getReactNativePersistence` (re-exported from
`./src/platform_react_native/persistence/react_native`, typed
`(storage: ReactNativeAsyncStorage): Persistence`), and `dist/rn/index.js` defines the function at
runtime (confirmed via grep). Metro picks `dist/rn/index.js` through the package's
`"react-native"` field, so the import resolves at runtime too.

On-device runtime confirmation (Auth initializes with AsyncStorage persistence, no "Expected a class
definition", email/password + Google sign-in work) requires an EAS development build on a real
device and remains the user's manual check — it cannot be run in this environment.

## Notes / assumptions

- The absolute RN types path is written workspace-relative (`./node_modules/...`) so it is portable;
  TypeScript resolves `paths` relative to the tsconfig's `baseUrl`/location. Verified to resolve on
  this Windows checkout.
- `auth.ts` keeps importing operation functions from `firebase/auth` (umbrella) unchanged — the
  layer boundary in the steering doc is preserved; only `config.ts` gains the one `@firebase/auth`
  import for the persistence factory.
- No dependency version changes. firebase 13.0.0 / `@firebase/auth` 1.13.7 /
  `@react-native-async-storage/async-storage` 2.2.0 already provide everything needed.
