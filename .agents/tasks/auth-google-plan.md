# Implementation Plan — Auth refactor: new Firebase project + Google Sign-In

Goal: `SignupScreen` and `AuthLoginScreen` both offer email+password AND Google account
sign-in, and the app points at the new Firebase project `elder-29dc3`. Firebase Storage is
OUT OF SCOPE: do not touch `src/services/firebase/files.ts`, and leave the `getStorage`/
`storage` init in `config.ts` exactly as-is.

Target runtime: Expo **SDK 57** development build (`expo ~57.0.22`, RN 0.86, Firebase JS SDK
^13, NativeWind 4). Native modules are allowed because this is a dev build, not Expo Go.

## Architecture decisions (grounded in the codebase)

- **Google native module vs expo-auth-session.** Use `@react-native-google-signin/google-signin`
  (native, dev build) rather than `expo-auth-session`. Rationale: the task mandates the native
  module and a development build, and the native flow yields a Google `idToken` directly for a
  Firebase credential. ([Expo Google auth guide](https://docs.expo.dev/guides/google-authentication/),
  [library Expo setup](https://react-native-google-signin.github.io/docs/setting-up/expo) —
  content rephrased for compliance.)
- **Config plugin variant.** This project uses the Firebase **JS SDK** (`firebase` npm pkg), NOT
  `@react-native-firebase`. The library's "Firebase" plugin variant is only for projects using
  the *native* RNFirebase SDK with `google-services.json`/`GoogleService-Info.plist`. So we use
  the **non-RNFirebase** plugin form that takes `iosUrlScheme`. Since the native iOS client id is
  deferred (Task 2), the plugin is added with a placeholder `iosUrlScheme` and a code comment that
  the real reversed-client-id value is required before building for iOS.
- **signIn response shape.** Current docs: `GoogleSignin.signIn()` resolves a `SignInResponse`;
  check it with `isSuccessResponse(response)` and read the token at `response.data.idToken`.
  Errors use `isErrorWithCode(error)` + `statusCodes` (`SIGN_IN_CANCELLED`/`IN_PROGRESS`/
  `PLAY_SERVICES_NOT_AVAILABLE`); a user cancel surfaces as `isCancelledResponse(response)` OR
  `statusCodes.SIGN_IN_CANCELLED`. ([signIn API docs](https://react-native-google-signin.github.io/docs/original)
  — content rephrased for compliance.) The coder MUST confirm the exact import/helper names
  against the installed version's `.d.ts` after install, because this library's API shifted
  across versions.
- **Role on the Google path.** `AccountRole` is `'elder' | 'family' | 'partner'` (`src/components/types.ts`).
  `ROLE_CONTEXT` lives in `src/constants/constants.ts`. Role is chosen on the role picker
  (`src/app/index.tsx` → `handleSelectRole`) and passed to `/signup` as a route param, which
  `src/app/signup.tsx` normalizes to `role`. **Decision:** mirror the email path — the Google
  sign-UP callback receives the already-selected `role` from the signup wrapper; we do NOT invent
  a role. On the **login** screen there is no role context, so Google there is a pure sign-IN that
  must only succeed for an existing profile (see item 6 for the no-profile case).
- **Cancel is not an error.** A user-cancelled Google flow must resolve quietly (no `errorMessage`);
  only real failures surface a PT-BR message.

## Env vars to add to `.env.example`

Keep existing `EXPO_PUBLIC_FIREBASE_*` keys. Add:
```
# Google OAuth Web client ID (type "Web") usado como webClientId para obter o idToken
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

---

## Plan

- [ ] 1. Migrate Firebase config to the new project `elder-29dc3`.
      In `src/services/firebase/config.ts`, replace ONLY the literal fallbacks in `firebaseConfig`
      (keep each `process.env.EXPO_PUBLIC_FIREBASE_* ?? '<literal>'` pattern, env first) with:
      apiKey `AIzaSyA_11LPGbNIiCwZTN1zLTKE9bgBWNH9efk`, authDomain `elder-29dc3.firebaseapp.com`,
      projectId `elder-29dc3`, storageBucket `elder-29dc3.firebasestorage.app`,
      messagingSenderId `282903276795`, appId `1:282903276795:web:8722efa5f6e4de5e5d945e`.
      Do NOT add `firebase/analytics`/`getAnalytics` (unsupported in RN). Do NOT touch the
      AsyncStorage persistence adapter, `initializeAuth`, `db`, or the `getStorage`/`storage` lines
      — leave storage exactly as-is.
      Files: `src/services/firebase/config.ts`
      Verify: `npx tsc --noEmit` passes.

- [ ] 2. Document the new env values in `.env.example`.
      Fill nothing secret, but ensure the file still enumerates the six `EXPO_PUBLIC_FIREBASE_*`
      keys and add the new `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=` line with a PT comment (see "Env vars"
      above). Values stay blank (the example file is a template; literals live as fallbacks in code).
      Files: `.env.example`
      Verify: visual read — all six Firebase keys plus `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` present.

- [ ] 3. Install the native Google sign-in module (SDK-57 compatible).
      Run `npx expo install @react-native-google-signin/google-signin`. Then run
      `npx expo install --fix` and `npx expo-doctor`; if either flags the resolved version as
      incompatible with SDK 57, follow their suggestion. After install, open the package's
      `.d.ts` (node_modules) to CONFIRM the current export names used in item 6 (`GoogleSignin`,
      `statusCodes`, `isSuccessResponse`, `isErrorWithCode`, `isCancelledResponse`, and the
      `response.data.idToken` shape) before writing code against them.
      Files: `package.json` (+ lockfile) — modified by the installer, do not hand-edit versions.
      Verify: `npx expo-doctor` reports no dependency/version issues; the package appears in
      `package.json` dependencies.

- [ ] 4. Register the config plugin in `app.json`.
      Append to the existing `expo.plugins` array (after `expo-image-picker`) the entry
      `["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.PLACEHOLDER" }]`.
      Add a sibling note (JSON cannot hold comments — instead document in the plan/PR and in the
      `auth.ts` comment from item 6) that `iosUrlScheme` must be replaced with the real iOS OAuth
      client's reversed client id, and that an Android SHA-1 + native iOS client id are required
      per-platform before building for those platforms. Do not create or edit `ios/`/`android/`
      (CNG generates them); native config lives only in `app.json`.
      Files: `app.json`
      Verify: `npx expo-doctor` passes (validates app config + plugin resolution); `app.json` is
      valid JSON.

- [ ] 5. Extend PT-BR error mapping for Google cases in `auth-errors.ts`.
      Add entries to the `MESSAGES` map for Firebase credential errors and a dedicated app code for
      "Google account has no app profile yet" used by the login path (item 6). Suggested keys:
      `'auth/account-exists-with-different-credential'`, `'auth/popup-closed-by-user'`,
      `'app/google-play-services-unavailable'` ("O Google Play Services está indisponível ou
      desatualizado. Atualize e tente novamente."), `'app/google-signin-failed'` ("Não foi possível
      entrar com o Google. Tente novamente."), and `'app/no-profile'` ("Não encontramos uma conta
      Elder para esta conta Google. Faça seu cadastro primeiro."). Keep `toPtMessage` returning the
      generic `FALLBACK` for unknown codes. Do NOT add a message for user-cancel — cancel must not
      reach `errorMessage` at all (handled in item 6/7 by returning early).
      Files: `src/services/firebase/auth-errors.ts`
      Verify: `npx tsc --noEmit` passes.

- [ ] 6. Add `signInWithGoogle` to `src/services/firebase/auth.ts` (the ONLY module that imports
      `firebase/auth`). Signature mirrors the email path's inputs:
      `signInWithGoogle(input: { role?: AccountRole; name?: string; mode: 'signup' | 'signin' }): Promise<User>`.
      Implementation: import `GoogleAuthProvider`, `signInWithCredential` from `firebase/auth`, and
      `GoogleSignin`/`statusCodes`/`isSuccessResponse`/`isErrorWithCode`/`isCancelledResponse` from
      `@react-native-google-signin/google-signin` (confirmed in item 3). Add a module-level
      `GoogleSignin.configure({ webClientId })` run once, where
      `webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '655190869254-a9vv7bu6hbdlip14nemp8lu09jvfaear.apps.googleusercontent.com'`.
      Add a code comment that a native iOS client id + Android SHA-1 are needed per-platform later.
      Flow:
        (a) **Partner block FIRST (signup mode):** if `mode === 'signup'` and
            `users.normalizeRole(input.role) === 'partner'`, throw an Error with
            `code = 'app/partner-not-available'` BEFORE any Google/Firebase call — same rule and
            same code as the email path (which the context enforces today).
        (b) `await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })`.
        (c) `const response = await GoogleSignin.signIn()`. If `isCancelledResponse(response)` (or
            not `isSuccessResponse`), throw an Error with `code = 'app/google-cancelled'` (a sentinel
            the wrappers swallow — never surfaced).
        (d) Build credential: `GoogleAuthProvider.credential(response.data.idToken)`; sign in with
            `signInWithCredential(auth, credential)` → `cred`.
        (e) Look up `users.getProfile(cred.user.uid)`.
            - If a profile EXISTS: existing user — just return `cred.user` (works for both modes).
            - If NO profile and `mode === 'signin'`: this Google account isn't registered. Sign the
              user back out (`firebaseSignOut(auth)` and `GoogleSignin.signOut()`), then throw an
              Error with `code = 'app/no-profile'`.
            - If NO profile and `mode === 'signup'`: NEW user — create the profile via
              `createProfile(cred.user.uid, { name: input.name ?? cred.user.displayName ?? 'Usuário', role: users.normalizeRole(input.role), email: cred.user.email ?? '' })`.
              Apply the SAME orphan-cleanup as email `signUp`: on profile-write failure, `try
              deleteUser(cred.user) catch firebaseSignOut(auth)` (also call `GoogleSignin.signOut()`),
              then rethrow.
        Wrap the Google-SDK error surface: in a catch, if `isErrorWithCode(error)` and
        `error.code === statusCodes.SIGN_IN_CANCELLED` throw `code 'app/google-cancelled'`; if
        `statusCodes.PLAY_SERVICES_NOT_AVAILABLE` throw `code 'app/google-play-services-unavailable'`;
        otherwise rethrow (Firebase `auth/*` codes pass through to `toPtMessage`; unknown → generic).
      Files: `src/services/firebase/auth.ts`
      Verify: `npx tsc --noEmit` passes.

- [ ] 7. Expose `signInWithGoogle` on the context WITHOUT importing `firebase/auth`.
      In `src/state/account-context.tsx`, add to `AccountContextValue` and the provider a
      `signInWithGoogle` callback that only calls `auth.signInWithGoogle` (the `auth` namespace
      import already exists). Two shapes to keep the partner-block visible at the context layer like
      the email path does:
        - `signInWithGoogle(input: { mode: 'signup'; name?: string; role: AccountRole } | { mode: 'signin' })`.
        - For `mode === 'signup'`, replicate the context's existing partner guard: if
          `users.normalizeRole(input.role) === 'partner'` throw the `app/partner-not-available`
          error BEFORE calling `auth.signInWithGoogle` (mirrors the current `signUp` guard;
          `auth.ts` also guards defensively in item 6a).
      Add `signInWithGoogle` to the `useMemo` value and deps. Do NOT import `firebase/auth` here;
      do NOT navigate.
      Files: `src/state/account-context.tsx`
      Verify: `npx tsc --noEmit` passes; context still has no `firebase/auth` import
      (`npx expo lint` clean).

- [ ] 8. Add an `onGoogle` prop + "Continuar com Google" button to the pure `SignupScreen`.
      In `src/screens/SignupScreen.tsx`, add prop `onGoogle: () => void | Promise<void>` (keep the
      screen pure — no Firebase imports). Render a secondary button BELOW the primary "Continuar"
      button (inside the bottom `View`), separated by a thin "ou" divider. Use the design-system
      button pattern: `min-h-[56px] rounded-2xl` with a hairline border on white
      (`border border-hairline bg-white active:opacity-70`), a Google `MaterialIcons` glyph
      (`name="login"` or `"account-circle"` — MaterialIcons has no brand glyph; use navy `#11375C`),
      and `font-hanken-bold text-navy text-base` label "Continuar com Google". Disable while
      `submitting`. Only palette tokens; one `font-hanken-extrabold` per screen is unchanged.
      Files: `src/screens/SignupScreen.tsx`
      Verify: `npx tsc --noEmit` and `npx expo lint` pass.

- [ ] 9. Add an `onGoogle` prop + "Continuar com Google" button to the pure `AuthLoginScreen`.
      Same visual treatment as item 8, inserted in the bottom `View` under the "Entrar" button with
      an "ou" divider. Add prop `onGoogle: () => void | Promise<void>`; keep the screen pure.
      Files: `src/screens/AuthLoginScreen.tsx`
      Verify: `npx tsc --noEmit` and `npx expo lint` pass.

- [ ] 10. Wire Google through the signup wrapper.
      In `src/app/signup.tsx`, add a `handleGoogle` that sets local `submitting`/`errorMessage`,
      calls `signInWithGoogle({ mode: 'signup', role, name: /* optional */ undefined })` from
      `useAccount()`, and on error calls `toPtMessage(e)` — EXCEPT swallow the cancel sentinel:
      if the error `code === 'app/google-cancelled'`, clear `errorMessage` and return (no scary
      error). Never navigate (RootNavigator owns auth navigation). Pass `onGoogle={handleGoogle}`
      to `SignupScreen`.
      Files: `src/app/signup.tsx`
      Verify: `npx tsc --noEmit` and `npx expo lint` pass.

- [ ] 11. Wire Google through the login wrapper.
      In `src/app/login.tsx`, add a `handleGoogle` that sets local `submitting`/`errorMessage`,
      calls `signInWithGoogle({ mode: 'signin' })`, swallows the `app/google-cancelled` sentinel,
      and otherwise surfaces `toPtMessage(e)` (so `app/no-profile` shows the PT message from item 5).
      Never navigate. Pass `onGoogle={handleGoogle}` to `AuthLoginScreen`.
      Files: `src/app/login.tsx`
      Verify: `npx tsc --noEmit` and `npx expo lint` pass.

- [ ] 12. Full verification gate.
      Run the project's real checks and confirm all pass:
      `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor`.
      Also re-read the acceptance checklist below and confirm each item.

## Architecture-rule compliance checklist (must all hold)

- [ ] `firebase/auth` imported ONLY in `auth.ts` (and the existing `config.ts`). Context, screens,
      and wrappers do NOT import it.
- [ ] Partner is blocked on the Google sign-UP path BEFORE any Google/Firebase call — enforced in
      both the context guard (item 7) and defensively in `auth.ts` (item 6a), same
      `app/partner-not-available` code as email.
- [ ] Orphan cleanup on the Google NEW-user path: profile-write failure deletes the auth user
      (fallback signOut) + `GoogleSignin.signOut()` before rejecting (item 6e).
- [ ] All Firebase/Google failures surface as PT-BR via `errorMessage`; raw codes never shown
      (items 5, 10, 11).
- [ ] User-cancel of the Google flow shows NO error (sentinel `app/google-cancelled` swallowed in
      wrappers — items 6c/10/11).
- [ ] Screens stay pure (no Firebase imports; only `onGoogle` prop callbacks — items 8, 9).
- [ ] Wrappers set only local `submitting`/`errorMessage`; no `router.replace` by auth — RootNavigator
      remains the sole auth-navigation owner (items 10, 11).
- [ ] `AUTH_ROUTES` unchanged (`['index','login','signup']`); no protected route added.
- [ ] Storage untouched: `files.ts` not modified; `getStorage`/`storage` in `config.ts` intact.
- [ ] No `firebase/analytics`/`getAnalytics` added.
- [ ] Packages added only via `npx expo install` (never npm/yarn add).

## Open assumptions (reasonable defaults; flag if wrong)

- `iosUrlScheme` uses a PLACEHOLDER until the native iOS OAuth client is created; iOS builds will
  need the real reversed-client-id and Android needs an SHA-1 registered. Documented in code/PR.
- On Google **sign-up**, the display name defaults to the Google `displayName` (fallback
  `'Usuário'`) since the signup screen's name field is for the email path; if the product wants the
  typed name instead, pass `name` from the screen — left as a minor follow-up.
- A Google account that signs in via the **login** screen but has no Elder profile is rejected with
  `app/no-profile` rather than silently creating a profile, because the login screen carries no role
  context and silently guessing a role would violate the "do not invent a role" rule.
