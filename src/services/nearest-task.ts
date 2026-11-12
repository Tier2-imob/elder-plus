/**
 * The "next task" rule for the Explore screen. Pure (no Firebase or React), so it is unit-tested
 * (tests/unit/nearest-task.test.mjs).
 */

/** Local calendar day as "YYYY-MM-DD" (same as week.ts, kept here so this file has no imports). */
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Just what the rule needs from a task; the app's Task satisfies it. */
type TaskLike = { id: string; time: string; /** "YYYY-MM-DD" */ dayKey: string }

/**
 * Parse a task `time` string into minutes-of-day. Two real formats exist in the codebase:
 *   - zero-padded "HH:MM" (task seeds, e.g. "09:30", "12:00")
 *   - hour-only "<n>h"    (care data, e.g. "8h", "14h", "20h")
 * Match "HH:MM" first, otherwise match a leading integer (optionally followed by "h"/"H").
 * Anything unparseable returns +Infinity so it sorts last and never wins the "nearest" slot.
 */
export function parseTimeToMinutes(time: string): number {
  if (typeof time !== 'string') return Number.POSITIVE_INFINITY
  const trimmed = time.trim()

  const hhmm = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (hhmm) {
    const hours = Number(hhmm[1])
    const minutes = Number(hhmm[2])
    if (hours <= 23 && minutes <= 59) return hours * 60 + minutes
    return Number.POSITIVE_INFINITY
  }

  const hourOnly = trimmed.match(/^(\d{1,2})\s*[hH]?$/)
  if (hourOnly) {
    const hours = Number(hourOnly[1])
    if (hours <= 23) return hours * 60
  }

  return Number.POSITIVE_INFINITY
}

/**
 * Pick the "nearest pending task".
 *
 * Rule: among tasks not in `doneIds` and not on a day already past, choose the earliest by date and
 * time that falls AT OR AFTER now; if none is left (everything remaining was earlier today), fall back
 * to the earliest remaining one, so a circle with something still pending today is never shown empty.
 * Pending tasks of past days are not "next" and are ignored. Ties break by the order of `tasks`
 * (Firestore returns them by `order`; the sort is stable).
 */
export function pickNearestPending<T extends TaskLike>(
  tasks: T[],
  doneIds: Set<string>,
  now: Date = new Date()
): T | null {
  const today = dateKey(now)
  const upcomingDays = tasks.filter((t) => !doneIds.has(t.id) && t.dayKey >= today)
  if (upcomingDays.length === 0) return null

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const sorted = [...upcomingDays].sort(
    (a, b) => a.dayKey.localeCompare(b.dayKey) || parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
  )

  return (
    sorted.find(
      (t) => t.dayKey > today || (t.dayKey === today && parseTimeToMinutes(t.time) >= nowMinutes)
    ) ?? sorted[0]
  )
}
