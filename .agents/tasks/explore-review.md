# ExploreScreen refactor: nearest-task card, in-card search filters, minimap placeholder

The refactor adds three features to `ExploreScreen` while keeping the screen presentation-only. A new `useNearestTask(uid)` hook reads `users/{uid}/tasks` through the existing `listTasks` service and surfaces the nearest pending task, rendered in a card directly under the navy welcome card. Inside the expanded welcome card, a category chip row and a "Mais próximo" distance-sort toggle now sit above the search results and actually filter/sort them. A static minimap placeholder sits right after the category grid. Firestore access stays entirely in the hook/service layer — the screen never imports `firebase/firestore`.

Watch for: nothing blocking. One minor behavioral note (confirmed) — the nearest-task card does not render an error-specific state; a failed read collapses into the same "Nenhuma tarefa pendente" empty card. That matches the spec's "handle gracefully" bar and mirrors `useCareTasks`, so it is not a defect.

**Verdict**: APPROVED

## High-level view

The nearest-task read follows the project's established hook shape (`useCareTasks`): uid guard, render-time reset on uid change, stale-write protection, and an `icon` cast justified by seeded glyph strings. It deliberately does not seed — seeding remains `useCareTasks`'s job — so a brand-new user who hasn't opened Care yet simply sees the empty card. That is an intentional, documented trade-off.

The "nearest pending" rule is documented in a comment and handles both real `time` shapes (`"HH:MM"` and `"<n>h"`), with unparseable values sorted to the end via `+Infinity`. The rule picks the earliest not-done task at/after the current time, falls back to the earliest pending overall, and relies on `listTasks`'s `order asc` for stable tiebreaking. The fallback and tiebreak behavior match the spec.

Filters are local UI state layered over the already-computed `results` memo, with a second `filteredResults` memo narrowing by `categoryId` and optionally sorting by numeric `distance` ascending (the same approach as `DiscoverScreen`'s `nearby` branch). The results `.map` iterates the filtered list, and the empty branch applies to it too, so filtering to nothing shows "Nenhum resultado encontrado." Chips are navy-styled (`bg-white/10` / `bg-white/25`), `Pressable`, with `accessibilityRole="button"` and PT-BR `accessibilityLabel`s.

The three features render in the required vertical order: welcome card → próxima tarefa → "Explore por categoria" grid → minimap → Patrocinados. The minimap is a static `bg-navy/10` card with a `map` icon and PT-BR labels, no map library. The route (`explore.tsx`) threads `uid={account?.uid}` from `useAccount()`, and it is the only caller of the screen.

<details>
<summary>Issues (1)</summary>

1. **No error-distinct state on nearest-task card** — a failed `listTasks` read renders the same "Nenhuma tarefa pendente" empty card as a genuinely empty list. Non-blocking: within the spec's "handle gracefully" bar and consistent with `useCareTasks`. Consider a distinct error state later if read failures need to be visible.

</details>

<details>
<summary>Details</summary>

### Hook structure mirrors the project pattern

`useNearestTask` is a near-exact structural copy of `useCareTasks`'s read path: `loading` initialized to `uid !== undefined`, the render-time `loadedForUid` reset that clears `task` and re-enters loading when the uid changes, and an `activeRef` flag so a resolved request for a stale uid never writes state. It reads through `@/services/firebase/tasks` (`listTasks`) and never touches `firebase/firestore` directly — confirmed by grep returning no matches in the screen. The `icon as keyof typeof MaterialIcons.glyphMap` cast is the same one `useCareTasks.toTask` uses and is sound for the same reason: tasks are seeded with real glyph strings.

One deliberate divergence from `useCareTasks`: no seeding. The comment block states seeding is `useCareTasks`'s responsibility and duplicating it risks races. The consequence — a user who has never opened Care sees the empty card — is documented in the plan as acceptable.

### Nearest-pending rule and time parsing

```
pending = docs where done === false
nowMinutes = current hour*60 + minute
byTime = pending sorted ascending by parseTimeToMinutes(time)   // stable → order asc preserved
upcoming = first byTime entry with minutes >= nowMinutes
result = upcoming ?? byTime[0]                                  // fall back to earliest pending
```

The rule is documented in a comment above `pickNearestPending` and matches the spec: earliest not-done task at/after now, else earliest pending overall, ties by `order`. The stable sort over a list already ordered `order asc` makes `order` the natural tiebreaker without extra code.

`parseTimeToMinutes` handles both real shapes: `"HH:MM"` (matched first with range validation `hours <= 23`, `minutes <= 59`) and the hour-only `"8h"`/`"14h"`/bare `"20"`. Anything else — including a non-string — returns `+Infinity`, so a malformed `time` sorts last and can never win the nearest slot or crash the sort.

### In-card filters actually filter and sort

`filteredResults` is a memo over `results`, `filterCategory`, and `sortByDistance`: it narrows by `categoryId` when a category is selected (null = "Todos") and, when the distance toggle is on, sorts a copy ascending by numeric `distance` — the same operation as `DiscoverScreen.sortItems`'s `nearby` branch. `ServiceItem.distance` is a `number`, so the comparator is correct. The results `.map` iterates `filteredResults`, not raw `results`, and the "Nenhum resultado encontrado." empty branch keys off `filteredResults.length`, so narrowing to an empty set shows the empty state rather than a stale list.

The filters render inside `{showResults && (...)}` (query ≥ 2 chars), above the results, preserving the existing expand-to-show behavior. The chip row is a horizontal `ScrollView` of "Todos" + the 6 `CATEGORIES`; the distance toggle is a separate chip below it. Styling uses the navy-card vocabulary (`bg-white/10` inactive, `bg-white/25` active, `rounded-full`, `font-hanken*`), and every chip is a `Pressable` with `accessibilityRole="button"` and a PT-BR `accessibilityLabel` (`Filtrar por ${label}`, `Ordenar por distância`).

### Card states and vertical order

The "Próxima tarefa" section is gated on `uid` — nothing renders when signed out. With a uid it shows one of three frames sharing the same `rounded-2xl border border-hairline bg-white` listing-card layout: a `schedule`-icon "Carregando…" frame while loading, the populated task (icon tile + bold navy title + muted time), or an `event-available` "Nenhuma tarefa pendente" frame. A read failure lands in the empty frame (see Issues) — acceptable here.

The minimap is a static `bg-navy/10` card, fixed 180px height, centered `map` icon and PT-BR labels ("Serviços perto de você" / "Mapa em breve"), no map library and no new imports. Render order reads top to bottom as: welcome card → próxima tarefa → "Explore por categoria" grid → minimap → Patrocinados → FloatingNav, matching the required sequence.

### Prop threading and blast radius

`ExploreScreen` gained an optional `uid?: string` prop, forwarded to `useNearestTask`; `src/app/explore.tsx` passes `uid={account?.uid}` from `useAccount()`. Grep confirms `explore.tsx` is the only caller, so no other usage needed updating and existing props are untouched.

### Verification evidence

The plan records `npx tsc --noEmit` → Exit 0 and `npx expo lint` → Exit 0 with a single pre-existing `react-hooks/exhaustive-deps` warning in `DiscoverScreen.tsx` (a file this task did not modify). The NativeWind vocabulary, `font-hanken*` families, and palette tokens (`navy`, `muted`, `hairline`, `terracotta`) all match the existing file. No new test framework was added, consistent with the project having none. Evidence is present and credible; not re-run per instructions.

</details>

<details>
<summary>Files changed</summary>

- `src/hooks/useNearestTask.ts` (new) — `useNearestTask(uid)` read hook; `parseTimeToMinutes` + documented `pickNearestPending`; no seeding, no `firebase/firestore` import.
- `src/app/explore.tsx` — threads `uid={account?.uid}` into `<ExploreScreen/>`.
- `src/screens/ExploreScreen.tsx` — `uid?` prop; nearest-task card; in-card category chips + distance toggle over a `filteredResults` memo; static minimap placeholder.

No git repository in the workspace, so files were reviewed directly rather than via diff.

</details>
