# Implementation Plan — Firebase Wave 1 (Elder)

Ordered implementation plan for Firebase Wave 1, from the approved Revision 4 design
(`.agents/tasks/design.md`) and the Wave 1 requirements (`.agents/tasks/requirements.md`).
All paths target the worktree `c:\Users\savio\OneDrive\Tier2\Elder\elder\.worktrees\firebase-core`.
Package manager is npm. Verification for every step is `npx tsc --noEmit` + `npx expo lint`
(no test framework exists per NFR-3; do NOT run `npx expo start`). Firebase runtime behavior and
`storageBucket` correctness can only be smoke-tested manually in Expo Go — a green tsc/lint does not
prove runtime correctness, especially for `config.ts` credentials.

This plan is also decomposed into FEAT artifacts under `.agents/tasks/` (`task.json`,
`context.json`, `features/FEAT-001..006.json`); the two describe the same work. Steps below are
grouped and ordered by dependency.

- [ ] 1. Install deps and add the picker plugin + env example.
      Run `npx expo install firebase @react-native-async-storage/async-storage expo-document-picker expo-image-picker`;
      append the `expo-image-picker` plugin (with `photosPermission`) as the third entry in `app.json`
      `plugins`; add a docs-only `.env.example` with the six `EXPO_PUBLIC_FIREBASE_*` keys (empty).
      Files: package.json, app.json, .env.example
      Verify: `npx tsc --noEmit` && `npx expo lint` pass; deps present at SDK-57 versions (AC-29/31).

- [ ] 2. Build the Firebase services layer.
      Create `config.ts` (singletons from the design snippet; committed defaults for project
      gen-lang-client-0201344960; NO getAnalytics; RN AsyncStorage persistence — verify the
      `getReactNativePersistence` import with `tsc`, else use the AsyncStorage adapter fallback),
      `types.ts`, `users.ts`, `auth.ts`, `auth-errors.ts`, `favorites.ts`, `reviews.ts`, `tasks.ts`,
      `files.ts` with the exact signatures in design.md.
      Files: src/services/firebase/{config,types,users,auth,auth-errors,favorites,reviews,tasks,files}.ts
      Verify: `npx tsc --noEmit` && `npx expo lint` pass; only config.ts inits Firebase; no getAnalytics (AC-26/27/28).

- [ ] 3. Rewrite AccountContext over Firebase Auth.
      observeAuth subscription with the design's handler (profile/favorites isolated try/catch,
      `setLoading(false)` once in `finally`), account `{name,role,uid}|null` + loading, signUp (partner
      blocked before any Firebase call) / signIn / signOut delegating to `auth.ts`, per-id optimistic
      `toggleFavorite`, pure `isFavorite`. Remove `setAccount`.
      Files: src/state/account-context.tsx
      Verify: `npx tsc --noEmit` && `npx expo lint` pass (AC-8/9/10).

- [ ] 4. Root layout splash/auth gate + routes.
      Rewrite `_layout.tsx` per the authoritative snippet: `RootNavigator({ fontsReady })`, hide splash
      on `fontsReady && !loading`, sole-owner auth redirect effect, register all eight routes
      (index, login, signup, explore, discover, business, care, documents).
      Files: src/app/_layout.tsx
      Verify: `npx tsc --noEmit` && `npx expo lint` pass; typed routes compile (AC-1/5).

- [ ] 5. Real signup (email+password) + login route.
      Extend `SignupScreen` (email/password inputs + refs, new `onContinue` object, submitting/error
      props, remove stray `3`, leave tone branch untouched); rewrite `signup.tsx` (async signUp, no
      redirect, no partner TODO); create pure `AuthLoginScreen` + `login.tsx` wrapper; wire
      `index.tsx` `onLogin -> router.push('/login')`.
      Files: src/screens/SignupScreen.tsx, src/app/signup.tsx, src/screens/AuthLoginScreen.tsx, src/app/login.tsx, src/app/index.tsx
      Verify: `npx tsc --noEmit` && `npx expo lint` pass (AC-2/3/4/7).

- [ ] 6. Favorites: confirm end-to-end Firestore wiring.
      Confirm the context loads favorites on session start and toggles optimistically per id; confirm
      DiscoverScreen/BusinessScreen favorites usage is unchanged. Correct any drift from step 3.
      Files: src/state/account-context.tsx (only if correction needed)
      Verify: `npx tsc --noEmit` && `npx expo lint` pass (AC-11/12/13/14).

- [ ] 7. Reviews to Firestore.
      Create `useBusinessReviews`; convert `BusinessScreen` to reviews-via-props with a
      `Promise<void>` `onSubmitReview` (clear inputs only on success), guard `avgRating`, keep the
      `useAccount` favorites line; wire `business.tsx` (optimistic prepend + rollback + rethrow).
      Files: src/hooks/useBusinessReviews.ts, src/screens/BusinessScreen.tsx, src/app/business.tsx
      Verify: `npx tsc --noEmit` && `npx expo lint` pass (AC-15/16/17).

- [ ] 8. Tasks to Firestore.
      Create `useCareTasks` (seed on empty via fixed ids); convert `CareScreen` to tasks/doneIds via
      props with `onComplete`, change `WeekView` to take a `tasks` prop, remove module `TASKS`/local
      `done`/`markDone`; wire `care.tsx`.
      Files: src/hooks/useCareTasks.ts, src/screens/CareScreen.tsx, src/app/care.tsx
      Verify: `npx tsc --noEmit` && `npx expo lint` pass (AC-18/19/20).

- [ ] 9. Documents (Storage) + entry point.
      Create `useUserDocuments` (pickers + files.ts, cancel = no-op), pure `DocumentsScreen`,
      `documents.tsx` wrapper; add the ExploreScreen `folder`+`logout` header affordances and wire
      them in `explore.tsx` (`onOpenDocuments`, `onLogout`). Leave FloatingNav untouched.
      Files: src/hooks/useUserDocuments.ts, src/screens/DocumentsScreen.tsx, src/app/documents.tsx, src/screens/ExploreScreen.tsx, src/app/explore.tsx
      Verify: `npx tsc --noEmit` && `npx expo lint` pass (AC-21/22/23/24/25/6).

- [ ] 10. Copy the Kiro spec into the branch.
      Copy `.kiro/specs/elder/` from the MAIN tree into the worktree and edit the copies to reflect the
      prototype->Firebase-product shift with Wave 1 marked (do not edit the MAIN copy).
      Files: .worktrees/firebase-core/.kiro/specs/elder/{.config.kiro,requirements.md,design.md,tasks.md}
      Verify: directory exists in the worktree with edited spec files; `npx tsc --noEmit` && `npx expo lint` still pass.

- [ ] 11. Integration pass.
      Run the full `npx tsc --noEmit` and `npx expo lint` once more across the whole change; fix any
      cross-cutting seams (removed `setAccount`, new `onContinue`/`onSubmitReview`/`WeekView`
      signatures). Confirm no `src/screens/*.tsx` imports firebase (AC-25) and no `getAnalytics` exists
      (AC-27).
      Files: as needed
      Verify: `npx tsc --noEmit` && `npx expo lint` pass with zero errors (AC-30).
