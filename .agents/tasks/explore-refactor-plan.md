# Implementation Plan — ExploreScreen refactor (Elder+)

Three features on `src/screens/ExploreScreen.tsx`: (1) a "nearest pending task" card fed by a new Firestore hook, (2) search filters (category + sort-by-distance) inside the expanded welcome card, (3) a static minimap placeholder. Firestore access stays in the service/hook layer; the screen stays presentation-only.

## Design decisions (grounded in the codebase)

- **Hook, not inline fetch.** The project already isolates Firestore reads in `src/hooks/*` (see `useCareTasks`, `useUserDocuments`, `useBusinessReviews`). The nearest-task read follows the same shape, so the screen never imports `firebase/firestore`. Decision: add `useNearestTask(uid)` mirroring `useCareTasks`'s uid-guard + render-time-reset pattern.
- **Reuse `listTasks`, do not re-seed.** `useCareTasks` seeds the tasks subcollection on first access. `useNearestTask` only READS via `listTasks(uid)` — it must NOT seed (seeding is `useCareTasks`'s responsibility; duplicating it risks races). If `listTasks` returns empty, the hook reports "no pending task"; the card renders its empty/neutral state.
- **Time parsing (robust, documented).** Two real formats exist in the codebase: zero-padded `"HH:MM"` (task seeds: `"09:30"`, `"12:00"` in `useCareTasks`) and hour-only `"<n>h"` (`"8h"`, `"14h"`, `"20h"` in `src/data/care-private-data.ts`). The parser converts both to minutes-of-day: match `HH:MM` first, else match a leading integer followed by optional `h`/`H`. Unparseable → treat as `+Infinity` (sorts last) so it never crashes or wins the "nearest" slot.
- **Nearest-pending rule (documented in a code comment in the hook).** Among tasks with `done === false`: pick the earliest by minutes-of-day **at or after the current minute-of-day (now)**; if none remain later today, fall back to the earliest pending task overall (so the card is never empty while pending tasks exist). Ties break by ascending `order`. `listTasks` already returns docs ordered by `order asc`, so a stable sort on minutes keeps `order` as the natural tiebreaker.
- **Filters are local UI state over already-computed `results`.** `results` already carry `categoryId` and numeric `distance`, and `distanceLabel` already exists in the file. No new data source needed: category filter narrows by `categoryId`; distance toggle sorts a copy ascending by `distance` (same approach as `DiscoverScreen.sortItems`'s `'nearby'` branch). Default = no distance sort (relevance order).
- **Minimap is static.** Per the task and `.clinerules/ui-design-system.md`, no map library. A `rounded-2xl border border-hairline` card with a `bg-navy/10` icon tile and PT-BR labels. (Note: the design-system doc mentions `react-native-webview` for real maps, but this task explicitly requires a placeholder only — `DiscoverScreen` already has the real WebView map; Explore gets the stand-in.)
- **Prop threading.** `ExploreScreen` has no `uid` today. `src/app/explore.tsx` already calls `useAccount()`. Decision: pass `uid={account?.uid}` into the screen; the screen forwards it to `useNearestTask`. This keeps the screen free of context/Firestore imports and matches how `name` is already threaded. Only one caller of `ExploreScreen` exists (`src/app/explore.tsx`), confirmed by grep.

## Verification commands (project real commands; no test framework is configured)

- Typecheck: `npx tsc --noEmit` — expect no errors.
- Lint: `npx expo lint` — expect no new errors/warnings on changed files.

There is no unit-test runner in `package.json` (scripts: start/android/ios/web/lint only) and no existing test files, so verification is typecheck + lint + manual render reasoning. Do NOT add a test framework for this task unless the reviewer requires it.

---

# Implementation Plan

- [ ] 1. Create the `useNearestTask(uid)` hook.
      Add `src/hooks/useNearestTask.ts`. Mirror `useCareTasks`'s structure: `uid: string | undefined`, `loading` initialized to `uid !== undefined`, render-time reset-on-uid-change, `useEffect` with an `active` flag calling `tasks.listTasks(uid)`, `.catch` logging + empty, `.finally` clearing loading. Add a module-level `parseTimeToMinutes(time: string): number` helper (handles `"HH:MM"` and `"<n>h"`, unparseable → `Number.POSITIVE_INFINITY`) and a `pickNearestPending(docs: TaskDoc[]): TaskDoc | null` that applies the documented rule (next pending at/after now by minutes, else earliest pending overall, ties by `order`). Expose `{ task, loading }` where `task` is narrowed to `{ id, title, time, icon: keyof typeof MaterialIcons.glyphMap } | null` (cast `icon` like `useCareTasks.toTask` does). Put the nearest-task rule and time-format notes in a comment block above `pickNearestPending`. Do NOT seed. Do NOT import `firebase/firestore` (use `@/services/firebase/tasks`).
      Files: `src/hooks/useNearestTask.ts`
      Verify: `npx tsc --noEmit` passes.

- [ ] 2. Thread `uid` into `ExploreScreen` from the route.
      In `src/app/explore.tsx`, pass `uid={account?.uid}` to `<ExploreScreen .../>` (next to `name={account?.name}`). In `src/screens/ExploreScreen.tsx`, add `uid?: string` to the props type and destructure it. Do not change any other prop. (Only caller is `explore.tsx`, confirmed by grep — no other usage to update.)
      Files: `src/app/explore.tsx`, `src/screens/ExploreScreen.tsx`
      Verify: `npx tsc --noEmit` passes — the new prop is accepted and optional.

- [ ] 3. Render the "Próxima tarefa" card below the welcome card and above "Explore por categoria".
      In `src/screens/ExploreScreen.tsx`, call `const { task, loading: taskLoading } = useNearestTask(uid)` inside the component. Between the navy welcome card's closing `</View>` and the `{/* Categorias */}` section, render a section: a `rounded-2xl border border-hairline bg-white p-4` card using the listing-card layout from the design system (icon tile `w-[46px] h-[46px] rounded-2xl bg-navy/10` with `MaterialIcons name={task.icon} color="#11375C"`, `font-hanken-bold text-navy` title, `font-hanken text-muted` time). Add a small `font-hanken-medium text-muted` label "Próxima tarefa" above the card. States: while `taskLoading` show a neutral skeleton/placeholder card (same frame, muted "Carregando…" text — never a broken/empty card); when `task` is null (no pending tasks, or uid undefined) render a neutral empty card ("Nenhuma tarefa pendente") or, if `uid` is undefined, render nothing. Reuse only palette tokens and `font-hanken*` families already in the file. PT-BR copy.
      Files: `src/screens/ExploreScreen.tsx`
      Verify: `npx tsc --noEmit` and `npx expo lint` pass; visually, the card sits directly under the navy card and above the categories.

- [ ] 4. Add category + distance-sort filters inside the expanded welcome card, above the results list.
      In `src/screens/ExploreScreen.tsx`, add local state: `const [filterCategory, setFilterCategory] = useState<string | null>(null)` (null = "Todos") and `const [sortByDistance, setSortByDistance] = useState(false)`. Derive the displayed list from the existing `results`: filter by `categoryId === filterCategory` when set, then if `sortByDistance` sort a copy ascending by `distance` (mirror `DiscoverScreen`'s `'nearby'` sort). Render filters INSIDE the existing `{showResults && (...)}` block, ABOVE the results `.map`: (a) a horizontal `ScrollView horizontal` (or wrapped row) of category chips — "Todos" + the 6 `CATEGORIES` — styled for the navy card (translucent `bg-white/10` inactive chip, selected chip visually distinct e.g. `bg-white/25` or terracotta border, `rounded-full`); (b) a "Mais próximo" toggle chip that flips `sortByDistance`. Chips are `Pressable` with `accessibilityRole="button"` and a clear PT-BR `accessibilityLabel` (e.g. `Filtrar por ${label}`, `Ordenar por distância`). The results `.map` must iterate the filtered+sorted list, not raw `results`. Preserve the existing "Nenhum resultado encontrado." empty branch (apply it to the filtered list). Reset or keep filters on clear-query as appropriate (clearing the query already hides the block). Keep everything inside the navy card so it extends downward.
      Files: `src/screens/ExploreScreen.tsx`
      Verify: `npx tsc --noEmit` and `npx expo lint` pass; typing ≥2 chars shows filters above results, selecting a category narrows results, toggling distance reorders by nearest.

- [ ] 5. Add the static minimap placeholder directly after the category grid.
      In `src/screens/ExploreScreen.tsx`, between the categories `View` (the `flex-row flex-wrap` grid) and the `{/* Perto de você */}` / "Patrocinados" section, add a `rounded-2xl border border-hairline bg-navy/10` (or `bg-white` with a subtle filled inner View) card ~160–200px tall containing a centered `MaterialIcons name="map"` (or `"place"`) in navy and PT-BR labels "Serviços perto de você" (bold) + "Mapa em breve" (muted). No map library, no new imports beyond what's already in the file. Palette tokens only.
      Files: `src/screens/ExploreScreen.tsx`
      Verify: `npx tsc --noEmit` and `npx expo lint` pass; the placeholder renders between the category grid and Patrocinados.

- [ ] 6. Final full verification.
      Run the project's typecheck and lint across the whole project to confirm nothing regressed and no caller of `ExploreScreen` broke.
      Files: (none — verification only)
      Verify: `npx tsc --noEmit` passes with no errors and `npx expo lint` reports no new issues.

## Notes / assumptions

- `.clinerules/firebase-service-and-hook.md` is a stub (no real content); the authoritative hook pattern is the existing `src/hooks/*` files, which this plan follows.
- No seeding in `useNearestTask` — if a brand-new user hasn't opened Care yet, their tasks subcollection may be empty and the card shows the empty state. That is acceptable and avoids seed races with `useCareTasks`.
- `app.json`/Firebase config changes are out of scope for this task (the config is handled elsewhere per the broader refactor); this task is purely the ExploreScreen data flow + UI.

---

# Verification (iteration 1)

## Files changed
- `src/hooks/useNearestTask.ts` (new) — `useNearestTask(uid)` hook: reads `listTasks(uid)` (no seeding), `parseTimeToMinutes` (handles `"HH:MM"` and `"<n>h"`, unparseable → `+Infinity`), `pickNearestPending` (next pending at/after now by minutes, else earliest pending overall, ties by `order`). Exposes `{ task, loading }`. No `firebase/firestore` import.
- `src/app/explore.tsx` — passes `uid={account?.uid}` to `<ExploreScreen/>` (next to `name`).
- `src/screens/ExploreScreen.tsx` — added `uid?: string` prop; imported + called `useNearestTask(uid)`; added `filterCategory`/`sortByDistance` local state and `filteredResults` memo; rendered search filters (category chips "Todos" + 6 categories, "Mais próximo" distance toggle) ABOVE the results list inside the expanded navy card, and the results `.map` now iterates `filteredResults`; added the "Próxima tarefa" card between the welcome card and categories (loading / task / empty / uid-undefined states); added the static minimap placeholder after the category grid and before "Patrocinados".

## Commands run (verbatim outcomes)
- `npx tsc --noEmit` → Exit Code 0 (clean, no errors).
- `npx expo lint` → Exit Code 0. Only 1 pre-existing warning in `src/screens/DiscoverScreen.tsx` (`react-hooks/exhaustive-deps`, file NOT touched by this task). No errors/warnings on changed files.

## Static confirmations
- `grep firebase/firestore src/screens/ExploreScreen.tsx` → no matches (screen does not import Firestore directly).
- Only caller of `ExploreScreen` is `src/app/explore.tsx` (grep over `**/*.tsx`), and it now passes `uid`.
- Vertical order in the render tree confirmed by reading: header → navy welcome card (with filters above results when expanded) → "Próxima tarefa" card → "Explore por categoria" grid → minimap placeholder → "Patrocinados" → FloatingNav.

## To check visually on a device (cannot be screenshot-verified here)
- Welcome card expands downward on query ≥2 chars; filters appear above results; selecting a category narrows results; toggling "Mais próximo" reorders by nearest distance.
- "Próxima tarefa" card: loading placeholder, populated task (icon + title + time), empty state ("Nenhuma tarefa pendente"), and nothing when signed out.
- Minimap placeholder renders at ~180px between categories and Patrocinados.
