# Google/Email sign-up navigation race — fix plan & verification

## Problem

After a successful first-time Google **sign-up**, the `users/{uid}` profile is created in
Firestore, but the app stays on the auth (signup) screen and only navigates to `/explore` after a
relaunch. The same listener-timing race affects the **email** `signUp` path.

## Root cause (confirmed)

A race between the Firebase Auth state listener and the profile write on the sign-UP path:

1. `auth.signInWithGoogle({mode:'signup'})` / `auth.signUp` authenticate first
   (`signInWithCredential` / `createUserWithEmailAndPassword`), then write the profile
   (`createProfile`).
2. `account-context` subscribes via `auth.observeAuth`. The callback fires the instant Firebase
   authenticates — **before** `createProfile` lands. `getProfile(uid)` returns `null`, so the
   context took the 'no profile' branch: `setAccount(null)` + `setProfileError(...)`.
3. `createProfile` then completes, but `onAuthStateChanged` does NOT fire again (the auth user did
   not change), so the context never re-resolved the profile. `account` stayed `null`, and
   `RootNavigator` (the single navigation owner) never replaced to `/explore`.
4. On cold relaunch, `observeAuth` fires with the persisted user AND the profile already exists, so
   it works — which is why a relaunch 'fixed' it.

## Chosen approach — (1) + (3): explicit post-auth account resolution in the context

- `auth.ts` already returns the authenticated `User` from both `signUp` and `signInWithGoogle`, and
  both `await createProfile` before returning. So once those calls resolve, the profile is
  guaranteed to exist in Firestore.
- The context's `signUp` and `signInWithGoogle` now `await` the auth call and then call a shared
  `resolveAccount(user)` helper that reads the profile and sets `account` directly — the same state
  `RootNavigator` reacts to. Navigation no longer depends solely on a listener callback that may
  have already fired too early.
- A `provisioningUidsRef` (a `Set<string>`) records the uid while an explicit sign-UP is in flight.
  The `observeAuth` listener, if it fires early and reads `null`, checks this set: for a uid we are
  actively provisioning it **skips** the 'no profile' branch (so a stale early callback cannot
  clobber the account the explicit path is about to set) and simply returns. The uid is removed in a
  `finally` once resolution completes.
- `AuthUser` is a type-only re-export of the Firebase `User` from `auth.ts`, so the context does not
  import `firebase/auth` directly (layer boundary preserved).

### Why first-time Google sign-up now navigates in ONE attempt

`signInWithGoogle({mode:'signup'})` resolves only AFTER `createProfile` has written the doc. The
context then calls `resolveAccount(user)`, which reads the now-present profile and sets a non-null
`account`. `RootNavigator` sees `account` become non-null on an auth route and replaces to
`/explore`. Even if the listener fired early and read `null`, it hit the `provisioningUidsRef` guard
and did nothing, so it could not reset `account` to `null`.

### Why the genuine `app/no-profile` case still rejects and does NOT hang

A Google `mode:'signin'` for an account with no Elder profile is rejected inside
`auth.signInWithGoogle` with `app/no-profile` BEFORE the context records any provisioning uid — that
uid is never added to `provisioningUidsRef`. The promise rejects, the login wrapper surfaces the
PT-BR message, and no account is set. If the listener also fires for that transient auth user and
reads `null`, the uid is NOT in the provisioning set, so it still takes the real 'no profile' branch
(`setAccount(null)` + `setProfileError`). Nothing hangs; no long timeouts are used.

## Files changed

- `src/services/firebase/auth.ts` — added a type-only `AuthUser` re-export of the Firebase `User`.
- `src/state/account-context.tsx` — extracted `loadFavorites` + `resolveAccount`; the listener now
  uses them and a `provisioningUidsRef` guard; `signUp` and `signInWithGoogle` explicitly resolve
  the account after the awaited auth call.

## Verification

- `npx tsc --noEmit` — clean (exit code 0).
- `npx expo lint` — clean apart from the pre-existing `DiscoverScreen` `react-hooks/exhaustive-deps`
  warning (0 errors, 1 warning), which is accepted.
