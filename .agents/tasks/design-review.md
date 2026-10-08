# Design Review — Elder Firebase Backend Integration (Wave 1)

Reviewed design: `.agents/tasks/design.md` (Revision 4)
Against requirements: `.agents/tasks/requirements.md`
Prior review: `.agents/tasks/design-review.md` (Revision 3 — 1 HIGH, 3 MEDIUM, 4 NIT)
Review performed fresh, verifying every load-bearing claim against the actual worktree source.

## Verdict

**APPROVED** — 0 HIGH, 0 MEDIUM, 2 NIT.

Every blocking finding from the Revision 3 review is genuinely resolved, not merely gestured at.
The two `users.ts`/`auth.ts` module surfaces now carry explicit signature blocks and a declared
`UserProfile` DTO; the layering decision (context → `auth.ts` → `firebase/auth`, never context →
`firebase/auth`) is stated and consistent across the handler block, the signature block, and the
Invariant ownership section. The `customConditions` claim is downgraded to an install-time `tsc`
check with a catch-all AsyncStorage fallback. The `signUp` orphaned-auth cleanup is specified with
one Portuguese message. The `WeekView` new signature and call site are spelled out and match the
real `CareScreen.tsx` source exactly. The four prior NITs are each addressed in prose. The two NITs
below are genuinely minor and non-blocking — they do not change the mechanical verdict.

---

## Confirmation of each prior finding

### Prior HIGH-1 (`users.ts`/`auth.ts` surfaces referenced but never specified) — RESOLVED

The design now has a dedicated `### users.ts and auth.ts — module surfaces` section with:
- `UserProfile` DTO declared in `types.ts`: `{ name: string; role: AccountRole; email: string; createdAt: Timestamp | null }`.
- `users.ts` signatures: `normalizeRole(raw: unknown): AccountRole` (returns raw if in the union,
  else `'family'`), `createProfile(uid, { name, role, email }): Promise<void>` (setDoc +
  `serverTimestamp()`), `getProfile(uid): Promise<UserProfile | null>` (getDoc → mapped through
  `normalizeRole`, or null if `!exists`).
- `auth.ts` signatures: `signUp(input): Promise<User>`, `signIn(input): Promise<UserCredential>`,
  `logout(): Promise<void>`, `observeAuth(cb): () => void`.
- An explicit layering decision: `AccountContext` calls `auth.signUp`/`signIn`/`logout`/`observeAuth`
  and **never** imports `firebase/auth` directly; `auth.ts` is the sole auth seam. The handler code
  block comment is updated to `auth.observeAuth(async (user) => { ... }) // wraps onAuthStateChanged
  inside auth.ts`, and the Invariant ownership section adds the "Context reaches firebase/auth only
  through auth.ts" invariant. This gives FR-X1's `auth.ts` a real caller and keeps the boundary that
  AC-25 depends on. Load-bearing contracts for FR-U1/U2/U3, AC-3, AC-8 are now explicit, not inferred.

### Prior MEDIUM-2 (`customConditions` claim stated as fact) — RESOLVED

The "it is real" assertion is replaced with: "Treat the `customConditions` claim as an **unverified
expectation**, not a confirmed fact." Ordered step 2 now gates on `npx tsc --noEmit` actually
resolving the `@firebase/auth` import under the project's real `tsconfig` (the `.d.ts` grep is
demoted to a cross-check). Step 3 is an explicit **catch-all** AsyncStorage `Persistence` adapter
fallback for *any* resolution failure (missing `customConditions`, moved symbol, or export-map
change) — no longer only the "symbol gone" case. This is NFR-7 / AC-30 compliant. Verified that
`tsconfig.json` extends `expo/tsconfig.base` (correct); `node_modules` remains absent in the
worktree, so deferring to install-time is the right posture.

### Prior MEDIUM-3 (profile-write-failure recovery underspecified) — RESOLVED

A dedicated `signUp profile-write-failure recovery` paragraph states that `auth.signUp` **awaits**
cleanup of the just-created auth user — `deleteUser(cred.user)`, else `firebaseSignOut(auth)` — before
rejecting, so no orphaned half-account survives and a retry does not hit `auth/email-already-in-use`.
The single generic message is pinned: **"Não foi possível concluir o cadastro. Tente novamente."**
The design also resolves the `onAuthStateChanged`/`signUp`-promise race explicitly: because cleanup
is awaited before the reject, the auth user is gone before the wrapper shows its message, so the
handler never races to set `profileError`. The Error handling table row is updated to match.

### Prior MEDIUM-4 (`WeekView` reads module-level `TASKS`) — RESOLVED

Verified against `src/screens/CareScreen.tsx`: `WeekView` today is `function WeekView({ done, onDone })`
closing over `const dayTasks = TASKS.filter((t) => t.dayKey === day.key)`, called as
`<WeekView done={done} onDone={markDone} />` with no `tasks` prop — exactly the state the finding
described. The design now spells out the new signature
`function WeekView({ tasks, done, onDone }: { tasks: Task[]; done: Set<string>; onDone: (id: string) => void })`,
the `TASKS.filter` → `tasks.filter` change, and the call site
`<WeekView tasks={tasks} done={doneIds} onDone={onComplete} />`, with the full list to `WeekView`
and today-only to `TodayView` — matching the current data flow (`TodayView` already takes `tasks`).
Compilation-breaking gap closed (AC-30).

### Prior NIT-5 (`segments[0] ?? 'index'` fallback) — RESOLVED

A Redirect-rules bullet now documents that `useSegments()` returns `[]` on `/`, so `segments[0]` is
`undefined` and the `?? 'index'` fallback deliberately classifies `/` as an auth route (AC-1), with
a "do not simplify" warning.

### Prior NIT-6 (`.env.example` empty-value trap) — RESOLVED

A new paragraph states `??` triggers only on `undefined`, so `.env.example` is documentation-only
and must not be copied to a live `.env` with empty values; developers must leave non-overridden keys
unset rather than present-but-empty.

### Prior NIT-7 (four placeholder credential strings) — RESOLVED

A "MUST-fill-before-first-run" ordered step now marks `apiKey`/`storageBucket`/`messagingSenderId`/
`appId` as placeholders that satisfy `tsc`/lint but are not runnable, instructing replacement with
real console values before first run.

### Prior NIT-8 (header-row vertical padding) — RESOLVED

A "Vertical-spacing confirmation" bullet states the row wrapper carries only `mb-5` (= former
`marginBottom: 20`), `items-center` adds no vertical padding, and `px-7` (= former `marginLeft: 28`)
is horizontal only — keeping NFR-4. Verified `ExploreScreen` currently renders a lone
`<Logo size="sm" style={{ width: 80, height: 24, marginLeft: 28, marginBottom: 20 }} />`.

---

## New findings

### 1. NIT — Context `signUp` return type vs. `auth.ts` `signUp` return type could read as a conflict at a glance

The `AccountContextValue` declares `signUp: (input) => Promise<void>`, while the `auth.ts` signature
block declares `signUp(input): Promise<User>`. These are two different functions (the context method
wraps `auth.signUp` and discards the returned `User` because `onAuthStateChanged` drives state), and
the design does describe the delegation. But the two `signUp` names with different return types are
never explicitly contrasted in one place, so a hurried coder could think one is a typo.

Where: `## AccountContext refactor` (context value type) vs. `### users.ts and auth.ts — module surfaces`.

Concrete fix — add one clause where the context delegates: "the context's `signUp` returns
`Promise<void>` and ignores the `User` returned by `auth.signUp`, since `onAuthStateChanged`
populates `account`." No code change, just the one-line disambiguation.

### 2. NIT — Firestore `where`/query import for `listReviews` ordering is implied but not named

`reviews.ts` specifies `listReviews` as `query(..., orderBy('createdAt', 'desc'))` and `addReview`
with `serverTimestamp()`, and the null-`createdAt` tolerance paragraph is thorough. The exact
Firestore modular imports (`collection`, `query`, `orderBy`, `getDocs`, `addDoc`, `serverTimestamp`)
are left for the implementer to infer — consistent with how `favorites.ts`/`tasks.ts` are written, so
this is a uniform, acceptable level of abstraction, not a gap unique to reviews. Noted only so the
implementer confirms the modular import paths against the installed SDK per NFR-7.

Where: `## Reviews migration`.

Concrete fix — none required; optionally add "imports: `collection, query, orderBy, getDocs, addDoc,
serverTimestamp` from `firebase/firestore`" for parity with the explicit auth import guidance.

---

## Verified Assumptions

Checked against the actual worktree source and found accurate:

- **`tsconfig.json` extends `expo/tsconfig.base`** — confirmed; the design's downgrade of the
  `customConditions` claim to install-time verification is the right posture (contents of the base
  config are not verifiable offline). ✓
- **`CareScreen.tsx` — `WeekView` current shape** — `function WeekView({ done, onDone })` closing
  over `TASKS.filter`, called `<WeekView done={done} onDone={markDone} />`; `TodayView` already
  takes `tasks`; module-level `TASKS` (ids `t1`/`t2`, glyphs `favorite-border`/`medication`); local
  `done` Set + `markDone`; irreversible `disabled`-after-done; `TODAY_KEY = 'wed'`. The MED-4 fix
  matches exactly. ✓
- **`account-context.tsx`** — exports exactly `{ account: {name, role}|null, setAccount, favorites,
  toggleFavorite, isFavorite }`; no `uid`/`loading`/auth methods. The rewrite premise is accurate. ✓
- **`_layout.tsx`** — gates on fonts only (`if (!fontsLoaded && !fontError) return null`), hides
  splash on fonts alone, registers exactly `index/signup/explore/discover/business/care`. The gate
  extension and the two new routes (`login`/`documents`) are warranted. ✓
- **`ExploreScreen.tsx`** — renders a lone `<Logo size="sm" style={{ width: 80, height: 24,
  marginLeft: 28, marginBottom: 20 }} />` with no header row; `MaterialIcons`, `Pressable`, `View`
  already imported (so NIT-8 "no import diff" holds). ✓
- **`SignupScreen.tsx`** — collects only `name`; `onContinue: (name: string) => void`; the stray
  trailing `3` on the `canContinue` line is present (`...[name]);3`); tone branch via
  `context.tone === 'navy'`. The breaking prop-signature change and `3` removal are warranted. ✓
- **`constants.ts`** — `ROLE_CONTEXT` tone union is `'navy' | 'terracota'` (one `t`) and the value
  `'terracota'` matches it; `partner.tone = 'terracota'`. The design's "leave untouched, do not
  normalize" is correct — normalizing would break the literal type. ✓
- **`components/types.ts`** — `AccountRole = 'elder' | 'family' | 'partner'`; `RoleRowProps.tone` is
  a separate `'navy' | 'terracotta'` (two `t`s) union, independent of `ROLE_CONTEXT`, so no conflict. ✓
- **`BusinessScreen.tsx`** — imports `useAccount` for favorites; local `INITIAL_REVIEWS`; `avgRating`
  is the unguarded `reduce(...) / reviews.length` (NaN on empty); props `item`/`onBack`/`topInset`;
  submit disabled rule `newRating > 0 && newComment.trim().length > 0`. The guard fix and
  "keep useAccount" note are warranted. ✓
- **`signup.tsx`** — calls `setAccount`, has the partner TODO early-return, `router.replace('/explore')`;
  the design's replacement (async `signUp`, no wrapper redirect, partner rejected in `signUp`)
  addresses all three. ✓
- **`index.tsx`** — `onLogin` commented out with a `router.push` destination; wiring to
  `router.push('/login')` is feasible. ✓
- **`LoginScreen.tsx`** — exposes `onLogin?: () => void` on the "Já tenho conta — Entrar" button;
  the role-picker keeps its name while the new email/password screen is `AuthLoginScreen`. ✓
- **Scope / out-of-scope** — only `initializeApp`/Auth/Firestore/Storage; no `getAnalytics`, no
  `expo-notifications`, no `@react-native-firebase`, no dev build; catalog stays local seed; partner
  stays destination-less; no test framework added. All respected. ✓

## Unverified / Wrong Assumptions

- **`expo/tsconfig.base` sets `customConditions: ["react-native"]`** — NOT verifiable from this tree
  (`node_modules` absent). The design now correctly treats this as an unverified expectation gated by
  an install-time `tsc --noEmit` check, with a catch-all AsyncStorage fallback. UNVERIFIED by design,
  which is the right posture (no longer asserted as fact). ✓
- **`getReactNativePersistence` lives on `@firebase/auth`'s RN entry in the installed major** — the
  design flags this as a pre-install expectation re-verified at install time. UNVERIFIED by design,
  acceptable (NFR-7).
- **`expo-document-picker` / `expo-image-picker` ship in the Expo Go SDK 57 native runtime** —
  asserted with an instruction to confirm against SDK 57 docs at install time. Not verifiable
  offline. UNVERIFIED by design, acceptable.
- **Firebase JS SDK version "expected v13.x"** — plausible but unverified (package not installed);
  resolved via `npx expo install`. UNVERIFIED, acceptable.
