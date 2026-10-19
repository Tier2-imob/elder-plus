# Google Sign-In + new Firebase project migration for Elder+ auth

The change adds a native Google account flow alongside the existing email/password path on both the signup and login screens, and re-points Firebase at the new `elder-29dc3` project. Google auth is implemented once in `src/services/firebase/auth.ts` (the sole `firebase/auth` owner) via `@react-native-google-signin/google-signin` v16.1.5, exposed through the account context, and consumed by the pure screens only as an `onGoogle` prop callback. The signup Google path reuses the same partner-block and orphan-cleanup guarantees as the email path; the login Google path is a pure sign-in that rejects accounts with no Elder profile. Firebase config fallbacks were swapped to the new project while keeping env reads primary, no analytics was added, and storage was left untouched.

Watch for: nothing blocking. The one item worth a glance is that the signup Google button does not pass the typed name field into `signInWithGoogle` (it falls back to the Google `displayName`), which the plan already called out as a deliberate minor follow-up (confirmed).

**Verdict**: APPROVED

## High-level view

The layer boundary holds. `firebase/auth` is imported in exactly two modules — `auth.ts` and the pre-existing `config.ts` — and nowhere else. The context imports the `auth` service namespace, the screens import no Firebase at all, and the wrappers only touch `toPtMessage`. The grep hits for "firebase/auth" in the context and wrappers are substring matches on the `@/services/firebase/auth` service path, not the SDK.

Navigation ownership is intact. `RootNavigator` in `_layout.tsx` is the only place that redirects by auth state; both wrappers set only local `submitting`/`errorMessage` and never call `router.replace` to a protected route.

The Google sign-up path mirrors the email path's two safety guarantees: the partner role is blocked before any Google or Firebase call (enforced both in the context and defensively in `auth.ts`), and a failed profile write deletes the just-created auth user with a `signOut` fallback plus a Google `signOut`. The role is passed down from the wrapper's route param, never invented. The login path carries no role and rejects an unregistered Google account with `app/no-profile` rather than guessing one.

Error handling is fully PT-BR. Firebase `auth/*` codes and the Google-specific conditions (Play Services missing, generic sign-in failure, no profile) map through `auth-errors.ts`, and user cancellation is routed to a sentinel `app/google-cancelled` that the wrappers swallow so a cancel never shows a scary message.

The Firebase migration points the config fallbacks at `elder-29dc3` with env reads still primary, adds no `firebase/analytics`, keeps the hand-written AsyncStorage persistence adapter (not `getReactNativePersistence`), and leaves the storage init and `files.ts` exactly as they were. `app.json` registers the google-signin config plugin with the `iosUrlScheme` placeholder, and `auth.ts` wires `webClientId` from env with the given literal fallback and documents the per-platform iOS/Android TODO.

<details>
<summary>Issues (1)</summary>

1. **Signup name not forwarded to Google path** — the signup Google button omits the typed `name`, defaulting to the Google `displayName`; documented as a deliberate follow-up in the plan, non-blocking.

</details>

<details>
<summary>Details</summary>

### Layer boundary and screen purity

`firebase/auth` is imported only by `auth.ts` (the Google provider, credential, and email primitives) and by the untouched `config.ts` (`getAuth`/`initializeAuth`). A repo-wide grep returns additional hits in `account-context.tsx`, `signup.tsx`, and `login.tsx`, but those are all the service namespace path `@/services/firebase/auth` — not the SDK module. Both screens import only React Native primitives, `MaterialIcons`, and local types/constants; they collect fields and invoke `onGoogle`, staying fully presentation-only.

### Google sign-up reuses the email path's guarantees

`signInWithGoogle` applies the partner block as its first statement in signup mode, before `hasPlayServices` or any Firebase call, throwing the same `app/partner-not-available` code the email path uses. The context guards the same condition one layer up, so partner is stopped before the service is even reached. On the new-user branch, a profile-write failure triggers the same cleanup as email `signUp` — delete the auth user, fall back to `firebaseSignOut` if the delete fails — and additionally calls `GoogleSignin.signOut()` so no native Google session lingers. The role is read from the route param in `signup.tsx` and threaded through the context into the service; it is never fabricated.

### Login Google path and the no-profile case

The login wrapper calls `signInWithGoogle({ mode: 'signin' })` with no role, because the login screen carries no role context. When the Google credential resolves but no `users/{uid}` profile exists, the service signs the user back out of both Firebase and Google and throws `app/no-profile`, which maps to a clear PT-BR message. This avoids silently creating a profile with a guessed role.

### Error mapping and cancellation

`auth-errors.ts` covers the Firebase credential codes (`account-exists-with-different-credential`, `popup-closed-by-user`) and the app-level Google codes (`google-play-services-unavailable`, `google-signin-failed`, `no-profile`), falling back to a generic message for anything unmapped — so no raw code leaks to the UI. User cancellation is deliberately not in the map: both a non-success `signIn()` response and a `statusCodes.SIGN_IN_CANCELLED` error are converted to the `app/google-cancelled` sentinel, which both wrappers detect and swallow by clearing `errorMessage`. A cancelled flow therefore shows nothing.

The imported google-signin helpers (`GoogleSignin`, `statusCodes`, `isSuccessResponse`, `isErrorWithCode`) are all exported from the installed v16.1.5 package root (`index.d.ts` re-exports `./functions`), and the `SignInSuccessResponse.data.idToken` shape the code reads matches the installed types. The plan had flagged this library's API drift across versions as the main integration risk; the installed surface matches the code.

### Firebase migration and out-of-scope boundaries

`config.ts` fallbacks now carry the `elder-29dc3` values (apiKey `AIzaSyA_11LPGbNIiCwZTN1zLTKE9bgBWNH9efk`, authDomain `elder-29dc3.firebaseapp.com`, projectId `elder-29dc3`, storageBucket `elder-29dc3.firebasestorage.app`, messagingSenderId `282903276795`, appId `1:282903276795:web:8722efa5f6e4de5e5d945e`), with each field still reading its `EXPO_PUBLIC_FIREBASE_*` env var first. No `firebase/analytics`/`getAnalytics` appears anywhere in `src`. The AsyncStorage persistence adapter was kept rather than swapped for `getReactNativePersistence`, with the TS2305 resolution constraint documented inline. `files.ts` still imports only `firebase/storage` and the `getStorage`/`storage` init in `config.ts` is unchanged — storage stayed out of scope.

`.env.example` lists all six `EXPO_PUBLIC_FIREBASE_*` keys plus `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` with a PT comment, values blank as a template. `app.json` appends the `@react-native-google-signin/google-signin` plugin with `iosUrlScheme: com.googleusercontent.apps.PLACEHOLDER`, and `auth.ts` wires `webClientId` from `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` with the given literal fallback and a comment noting the native iOS client id + Android SHA-1 + reversed-client-id are still TODO per platform.

### Verification evidence

The task directs not to re-run `tsc`/`expo lint`/`expo-doctor` and to rely on the coder's recorded outcomes, which the plan's gate step enumerates. Static spot-checks performed here (one grep for stray `firebase/auth`/`getAnalytics` imports, and type-surface confirmation of the google-signin exports against the installed v16.1.5 `.d.ts`) are consistent with a clean type-check; no doubt remained that warranted re-running a full suite. The native Google popup cannot be exercised in this environment and, per the task, its absence is not a finding.

</details>

<details>
<summary>File map</summary>

- `src/services/firebase/auth.ts` — adds `signInWithGoogle` (partner block, Play Services check, credential sign-in, profile lookup, orphan cleanup); sole `firebase/auth` owner.
- `src/services/firebase/auth-errors.ts` — adds Firebase credential + Google app-code PT-BR messages.
- `src/services/firebase/config.ts` — fallbacks re-pointed to `elder-29dc3`; persistence adapter and storage init unchanged.
- `src/state/account-context.tsx` — exposes `signInWithGoogle` with the partner guard; no `firebase/auth` import.
- `src/screens/SignupScreen.tsx` / `src/screens/AuthLoginScreen.tsx` — add `onGoogle` prop + "Continuar com Google" button; stay Firebase-free.
- `src/app/signup.tsx` / `src/app/login.tsx` — wire `handleGoogle`, set local state only, swallow the cancel sentinel, no navigation.
- `app.json` — registers the google-signin config plugin with placeholder `iosUrlScheme`.
- `.env.example` — adds `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
- `package.json` — adds `@react-native-google-signin/google-signin` ^16.1.5.
- `src/services/firebase/files.ts` — unchanged (storage out of scope).

No git repository is present, so this review reflects the current on-disk file states rather than a diff.

</details>
